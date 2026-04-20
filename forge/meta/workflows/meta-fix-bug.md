---
requirements:
  reasoning: Medium
  context: Medium
  speed: Medium
deps:
  personas: [bug-fixer]
  skills: [bug-fixer, generic]
  templates: [PROGRESS_TEMPLATE]
  sub_workflows: [review_code]
  kb_docs: [architecture/stack.md, architecture/routing.md]
  config_fields: [commands.test, paths.engineering]
---

# 🍂 Meta-Workflow: Fix Bug

## Purpose

Triage and resolve a reported bug. This follows the same rigorous pipeline as a standard task.

## Algorithm

```
1. Triage:
   - Locate or create the bug record (MANDATORY — do this before anything else):
     a. Determine the bug ID: if $ARGUMENTS is an existing FORGE-BUG-NNN ID, use it.
        Otherwise derive the next available ID by listing .forge/store/bugs/.
     b. If .forge/store/bugs/{BUG_ID}.json does NOT exist:
        - Derive a short slug from the bug title (kebab-case, ≤ 5 words)
        - Create the engineering folder:
            mkdir -p engineering/bugs/{BUG_ID}-{slug}
        - Write the bug record via store-cli — NEVER write the file directly:
            node "$FORGE_ROOT/tools/store-cli.cjs" write bug '{
              "bugId":       "{BUG_ID}",
              "title":       "<from input>",
              "description": "<from input>",
              "severity":    "<assessed: critical|major|minor>",
              "status":      "reported",
              "path":        "engineering/bugs/{BUG_ID}-{slug}",
              "reportedAt":  "<current ISO timestamp>"
            }'
        - If $ARGUMENTS contains a GitHub issue URL, include it as "githubIssue"
          in the JSON above — it is a valid schema field.
     c. Read the now-guaranteed record:
            node "$FORGE_ROOT/tools/store-cli.cjs" read bug {BUG_ID} --json
   - Reproduce the bug: create a failing test case or a reproduction script
   - Confirm the root cause via codebase research

2. Plan:
   - Generate BUG_FIX_PLAN.md following the plan template
   - Define the "Success Condition": how the reproduction script/test will now pass

3. Implementation:
   - Implement the fix following the approved plan
   - Verify the fix using the reproduction script/test
   - Run regression tests to ensure no side effects

4. Documentation:
   - Update the bug record in the store with:
     - Root cause analysis
     - Fix description
     - Verification evidence

5. Summary Sidecars:
   - After each phase completes its artifact, emit a summary sidecar and register it via `set-bug-summary`.
   - **After Plan phase:**
     Write `BUG-FIX-PLAN-SUMMARY.json` in the bug directory:
     `{ "objective": "...", "key_changes": [...], "verdict": "n/a", "written_at": "...", "artifact_ref": "BUG_FIX_PLAN.md" }`
     Then: `node "$FORGE_ROOT/tools/store-cli.cjs" set-bug-summary {bug_id} plan engineering/bugs/{bug_dir}/BUG-FIX-PLAN-SUMMARY.json`
   - **After Review phases:**
     Write `REVIEW-PLAN-SUMMARY.json` or `REVIEW-IMPL-SUMMARY.json` with `findings`, `verdict` (approved|revision), and `artifact_ref`.
     Then: `node "$FORGE_ROOT/tools/store-cli.cjs" set-bug-summary {bug_id} review_plan|code_review ...SUMMARY.json`
   - **After Implement phase:**
     Write `IMPLEMENTATION-SUMMARY.json` with `key_changes` and `verdict: "n/a"`.
     Then: `node "$FORGE_ROOT/tools/store-cli.cjs" set-bug-summary {bug_id} implementation ...SUMMARY.json`
   - If set-bug-summary exits non-zero, fix the JSON and retry before proceeding.

6. Finalize:
   - Execute Token Reporting (see Generation Instructions) — do this
     first so the sidecar is written before the event directory is purged
   - Summarise accumulated cost data into the bug artifact:
     read all events from `.forge/store/events/{bugId}/`, aggregate
     inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, and
     estimatedCostUSD across all events that carry token fields, and
     append a `## Cost Summary` section to the bug's markdown artifact
     (e.g. `engineering/bugs/{bugDir}/BUG_ANALYSIS.md` or equivalent).
     Format: one line per phase event, total row at the bottom.
     If no events carry token data, skip this section silently.
   - Run `node "$FORGE_ROOT/tools/collate.cjs" {bugId} --purge-events`
     This purges `.forge/store/events/{bugId}/` deterministically.
     The cost summary written to the bug artifact above is the durable
     record; no COST_REPORT.md is generated for bug IDs (collate skips
     sprint processing when the ID is not a known sprint).
   - **Finalize gate: verify collate succeeded.** Run the finalize
     phase gate before marking the bug as fixed:
       `node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase finalize --bug {bugId}`
     This checks that `INDEX.md` exists in the bug's engineering directory.
     If the gate fails (exit 1), collate did not produce the required
     INDEX.md — do NOT mark the bug as fixed. Escalate to the human
     with the missing artifacts listed on stderr.
     If exit 2 (misconfiguration), escalate immediately.
   - Update bug status via `/forge:store update-status bug {bugId} status fixed`
   - Emit the complete event via `/forge:store emit {bugId} '{event-json}'`
     (tombstone — written after the purge; the only event that will remain)
```

## Generation Instructions

- **Persona Self-Load:** The generated workflow MUST begin by reading `.forge/personas/bug-fixer.md`. The orchestrator displays the badge — the bug-fixer persona does NOT run a banner command as its first action.
- **Workflow Structure:** The generated `fix_bug.md` must follow the strict "Algorithm" block format.
- **Symmetric Injection:** Every subagent spawned by the `fix-bug` orchestrator must follow the symmetric injection pattern: `[Persona] -> [Skill] -> [Workflow]`.
- **Context Isolation:** Forbid inline execution of triage or fix logic; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference project-specific bug reporting paths.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.

## Announcement Algorithm

The generated `fix_bug.md` MUST include the following verbatim algorithm for phase announcements and symmetric persona/skill injection. This mirrors the pattern from `meta-orchestrate.md`.

```
# --- Role-to-noun mapping (persona and skill file lookups) ---
ROLE_TO_NOUN = {
  "plan-fix":    "bug-fixer",
  "review-plan": "supervisor",
  "implement":   "bug-fixer",
  "review-code": "supervisor",
  "approve":     "architect",
  "commit":      "engineer",
}
# Default fallback: "bug-fixer"

# --- Persona symbol lookup (emoji, name, tagline) ---
PERSONA_MAP = {
  "plan-fix":    ("🍂", "Bug Fixer",  "I find what has decayed and restore it."),
  "review-plan": ("🌿", "Supervisor", "I review before things move forward. I read the actual fix, not just the plan."),
  "implement":   ("🍂", "Bug Fixer",  "I find what has decayed and restore it."),
  "review-code": ("🌿", "Supervisor", "I review before things move forward. I read the actual code, not the report."),
  "approve":     ("🗻", "Architect",  "I hold the shape of the whole. I give final sign-off before commit."),
  "commit":      ("🌱", "Engineer",   "I close out completed work with a clean, honest commit."),
}
# Default fallback: ("🍂", "Bug Fixer", "I find what has decayed and restore it.")

# --- Banner identity map (banner name per phase role) ---
# Displayed by the orchestrator ONLY (badge before spawn, exit signal after return).
# Subagents do NOT display banners — the orchestrator owns phase announcements.
BANNER_MAP = {
  "plan-fix":    "rift",
  "review-plan": "oracle",
  "implement":   "rift",
  "review-code": "oracle",
  "approve":     "north",
  "commit":      "forge",
}
# Default fallback: "rift"

# --- Clear progress log for this bug ---
progress_log_path = ".forge/store/events/bugs/progress.log"
run_bash(f'FORGE_ROOT=$(node -e "console.log(require(\'./.forge/config.json\').paths.forgeRoot)") && node "$FORGE_ROOT/tools/store-cli.cjs" progress-clear bugs')

# --- Announce phase with identity banner (badge) + bug context ---
emoji, persona_name, tagline = PERSONA_MAP.get(phase.role, ("🍂", "Bug Fixer", "I find what has decayed and restore it."))
banner_name = BANNER_MAP.get(phase.role, "rift")
run_bash(f'FORGE_ROOT=$(node -e "console.log(require(\'./.forge/config.json\').paths.forgeRoot)") && node "$FORGE_ROOT/tools/banners.cjs" --badge {banner_name}')
print(f"  → {bug_id}  [{phase_model}]\n")

# --- Compute agent name for progress IPC ---
persona_noun = ROLE_TO_NOUN.get(phase.role, "bug-fixer")
iteration = iteration_counts.get(phase.name, 0) + 1
agent_name = f"{bug_id}:{persona_noun}:{phase.role}:{iteration}"

# --- Start progress Monitor before spawning subagent ---
start_monitor(
  command=f"tail -n +1 -F {progress_log_path} 2>/dev/null || true",
  description=f"Progress: {agent_name}",
  persistent=False
)

# --- Pre-flight gate check (see Phase Gates below) ---
# Halts the fix-bug loop if prerequisites are missing or a predecessor
# review did not clear. Same tool as meta-orchestrate.
FORGE_ROOT = resolve_forge_root()
preflight_result = run_bash(
  f'node "$FORGE_ROOT/tools/preflight-gate.cjs" --phase {phase.role} --bug {bug_id}'
)
if preflight_result.exit_code == 1:
  print(f"  ✗ {bug_id}  {phase.role}  — gate failed\n{preflight_result.stderr}")
  escalate_to_human(bug, phase, reason=f"gate_failed: {preflight_result.stderr}")
  break
elif preflight_result.exit_code == 2:
  print(f"  ⚠ {bug_id}  {phase.role}  — gate misconfigured\n{preflight_result.stderr}")
  escalate_to_human(bug, phase, reason=f"gate_misconfigured: {preflight_result.stderr}")
  break

# --- Symmetric Injection: noun resolved from ROLE_TO_NOUN ---
# Mode is governed by FORGE_PROMPT_MODE (default: "reference"). See
# meta-orchestrate.md § "Persona Injection Modes" for the helper definition —
# the generated fix-bug orchestrator shares the same helper.
role_block = compose_role_block(persona_noun)

# --- Compose architecture context block from context pack ---
context_pack_path = ".forge/cache/context-pack.md"
context_pack_json_path = ".forge/cache/context-pack.json"
if file_exists(context_pack_path):
  context_pack_md = read_file(context_pack_path)
  try:
    context_pack_json = read_json(context_pack_json_path)
    full_doc_paths = "\n".join(f"- {s['path']}" for s in context_pack_json.get("sources", []))
  except:
    full_doc_paths = "engineering/architecture/ (see context-pack.json for full list)"
  bug_architecture_block = (
    "### Architecture context (summary — full docs available at paths listed below)\n\n"
    + context_pack_md
    + "\n\nRead full architecture docs only if the summary above is insufficient for "
    + "your decision. Full docs:\n"
    + full_doc_paths
    + "\n\n"
  )
else:
  bug_architecture_block = ""

# --- Compose prior-phase summary block for bug context ---
bug_record_fresh = read_json(f".forge/store/bugs/{bug_id}.json")
bug_summaries = (bug_record_fresh or {}).get("summaries", {})

SUMMARY_PHASE_LABELS = {
  "plan": "Plan", "review_plan": "Plan review",
  "implementation": "Implementation", "code_review": "Code review", "validation": "Validation"
}
bug_summary_lines = []
for phase_key, label in SUMMARY_PHASE_LABELS.items():
  s = bug_summaries.get(phase_key)
  if s:
    bug_summary_lines.append(f"- {label}: {s.get('objective', '(no objective)')}")
    if s.get('key_changes'):
      for c in s['key_changes'][:3]:
        bug_summary_lines.append(f"    • {c}")
    if s.get('findings'):
      for f_ in s['findings'][:3]:
        bug_summary_lines.append(f"    • {f_}")
    if s.get('verdict') and s['verdict'] != 'n/a':
      bug_summary_lines.append(f"    Verdict: {s['verdict']}  Full: {s.get('artifact_ref', '(unknown)')}")

if bug_summary_lines:
  bug_summary_block = (
    "### Prior phase summaries (fast path — read full artifacts if you need more detail)\n\n"
    + "\n".join(bug_summary_lines)
    + "\n\nIf any summary above is missing or insufficient, read the corresponding full artifact from disk before proceeding.\n\n"
  )
else:
  bug_summary_block = ""

# --- Spawn subagent with progress reporting instructions (no banner command) ---
spawn_subagent(
  prompt=(
    f"### Progress Reporting\n"
    f"- Agent name: {agent_name}\n"
    f"- Progress log: {progress_log_path}\n"
    f"- Banner key: {banner_name}\n\n"
    f"Append progress entries to the log as you work:\n\n"
    f"```\n"
    f"node \"$FORGE_ROOT/tools/store-cli.cjs\" progress bugs {agent_name} {banner_name} start \"Starting {phase.role} phase\"\n"
    f"node \"$FORGE_ROOT/tools/store-cli.cjs\" progress bugs {agent_name} {banner_name} progress \"Reading codebase\"\n"
    f"node \"$FORGE_ROOT/tools/store-cli.cjs\" progress bugs {agent_name} {banner_name} done \"Completed {phase.role}\"\n"
    f"```\n\n"
    f"Write a `start` entry when you begin, `progress` entries as you make headway, "
    f"a `done` entry when you finish, or an `error` entry if something fails. "
    f"The orchestrator is monitoring this log in real time.\n\n"
    f"---\n\n"
    f"{bug_architecture_block}"
    f"{bug_summary_block}"
    f"{role_block}\n\n"
    f"### Current Working Context\n"
    f"- Bug Root:    {bug_root_path}\n"
    f"- Store Root:  {store_root_path}\n"
    f"- Events Root: .forge/store/events/bugs/\n\n"
    f"Read `{phase.workflow}` and follow it. Bug ID: {bug_id}. "
    f"Also read `engineering/MASTER_INDEX.md` for project state. "
    f"Before returning: run /cost, parse token usage, and write sidecar "
    f"`.forge/store/events/bugs/_{event_id}_usage.json` with fields: "
    f"inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, estimatedCostUSD."
  ),
  description=f"{emoji} {persona_name} — {phase.name} for {bug_id}",
  model=phase_model
)

# --- Stop progress Monitor ---
stop_monitor(progress_log_path)
```

**Key rules for the generated `fix_bug.md`:**
- `ROLE_TO_NOUN` MUST cover all six phases: `plan-fix`, `review-plan`, `implement`, `review-code`, `approve`, `commit`.
- `PERSONA_MAP` MUST cover the same six phases with the correct emoji/name/tagline per persona (bug-fixer, supervisor, architect, engineer — not all bug-fixer).
- Persona and skill file lookups MUST use `{persona_noun}.md` and `{persona_noun}-skills.md` from `ROLE_TO_NOUN`, never `{phase.role}.md` or a hardcoded `"bug-fixer"` noun for all phases.
- The sidecar path uses `.forge/store/events/bugs/_{event_id}_usage.json` (not `events/{sprint_id}/`).
- The announcement `print()` line MUST include `{tagline}` and `[{phase_model}]`.
- **Phase banners are orchestrator-owned.** The `spawn_subagent` prompt MUST NOT include a "Your first action — run this banner command" instruction. Instead, include progress reporting instructions with the agent name, progress log path, and banner key. The orchestrator displays the badge before spawning and the exit signal after return.
- **Include the progress IPC pattern.** The generated workflow MUST clear the progress log at bug start, compute agent names before each spawn, start a Monitor on the progress log before spawning, and stop it after the subagent returns.
- **Include phase-exit signals.** After each subagent returns (and after sidecar merge and event emission), print the appropriate exit signal: `✓` for completed/approved, `↻` for revision required (with iteration count), `⚠` for escalated.
- **Include post-phase /compact calls.** After each phase-exit signal (for every non-escalation outcome), the generated orchestrator MUST:
  1. Print a checkpoint line: `[checkpoint] bug={bug_id} phase={phase.role} iterations={iteration_counts}`
  2. Run `/compact` to free orchestrator context before the next phase.
  All durable state is on disk; the checkpoint line ensures the compact summary preserves the loop bookkeeping. Do NOT compact on escalation — the human needs full context.

## Phase Gates

Declarative pre-flight gates for each fix-bug phase. Evaluated by
`forge/tools/preflight-gate.cjs` before every subagent spawn. Grammar is
identical to `meta-orchestrate.md` — see that file's "Phase Gates" section
for the directive reference.

```gates phase=plan-fix
forbid bug.status == fixed
forbid bug.status == abandoned
```

```gates phase=review-plan
artifact {engineering}/bugs/{bug}/BUG_FIX_PLAN.md min=200
```

```gates phase=implement
artifact {engineering}/bugs/{bug}/BUG_FIX_PLAN.md min=200
after review-plan = approved
forbid bug.status == fixed
```

```gates phase=review-code
after review-plan = approved
```

```gates phase=approve
after review-code = approved
```

```gates phase=commit
after approve = approved
```

```gates phase=finalize
artifact {engineering}/bugs/{bug}/INDEX.md
```

## Progress Reporting

Each subagent writes progress entries to a transient log file that the
orchestrator monitors in real time.

**Log path:** `.forge/store/events/bugs/progress.log`

**Format per line:**

```
{ISO_TIMESTAMP}|{agent_name}|{banner_key}|{status}|{detail}
```

| Field | Format | Example |
|-------|--------|---------|
| `ISO_TIMESTAMP` | ISO 8601 UTC | `2026-04-16T14:15:23Z` |
| `agent_name` | `{bugId}:{persona_noun}:{phase.role}:{iteration}` | `BUG-007:bug-fixer:plan-fix:1` |
| `banner_key` | Banner identity key from BANNER_MAP | `rift` |
| `status` | One of: `start`, `progress`, `done`, `error` | `start` |
| `detail` | Free text (no pipe characters) | `Triaging bug` |

**Writing entries:** Use `store-cli progress`:

```
node "$FORGE_ROOT/tools/store-cli.cjs" progress bugs {agentName} {bannerKey} {status} "detail text"
```

**Monitoring:** The orchestrator starts a Monitor on the progress log before
spawning each subagent and stops it after the subagent returns.

**Clearing:** The bug-fix orchestrator clears the progress log at bug start using
`store-cli progress-clear bugs`.

## Phase-Exit Signals

After each subagent returns, the orchestrator prints a phase-exit signal:

| Outcome | Format |
|---------|--------|
| Non-review phase completed | `  ✓ {bug_id}  {phase_role}  — completed` |
| Review verdict: Approved | `  ✓ {bug_id}  {phase_role}  — Approved` |
| Review verdict: Revision Required | `  ↻ {bug_id}  {phase_role}  — Revision Required (iteration {n})` |
| Escalated | `  ⚠ {bug_id}  {phase_role}  — escalated to human` |
