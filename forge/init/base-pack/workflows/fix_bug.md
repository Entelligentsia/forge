---
requirements:
  reasoning: Medium
  context: Medium
  speed: Medium
audience: orchestrator-only
deps:
  personas: [bug-fixer]
  skills: [bug-fixer, generic]
  templates: [PROGRESS_TEMPLATE]
  sub_workflows: [review_code]
  kb_docs: [architecture/stack.md, architecture/routing.md]
  config_fields: [commands.test, paths.engineering]
---

# Fix Bug
## Algorithm

```
1. Triage:
   - If the bug ID is known, query the store for context before navigating the KB:
     ```sh
     node "$FORGE_ROOT/tools/store-cli.cjs" nlp "{bugId} with blocked tasks"
     ```
     If results include title, status, sprint, blocked tasks, and excerpt, use them directly.
     Fall back to reading MASTER_INDEX.md manually only if the query returns empty or low-confidence results.
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
   - Execute Token Reporting (see `_fragments/finalize.md`) — do this
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

# --- Compose architecture context block (conditional on phase.context.architecture) ---
# <!-- See _fragments/context-injection.md for canonical definition -->
bug_architecture_block = (
  compose_architecture_block(".forge/cache/context-pack.md", ".forge/cache/context-pack.json")
  if phase.context.architecture else ""
)

# --- Compose prior-phase summary block for bug context ---
# <!-- See _fragments/context-injection.md for canonical definition -->
bug_summary_block = compose_summary_block(bug_id, record_type="bug") if phase.context.prior_summaries != "none" else ""

# --- Materialize project overlay (replaces MASTER_INDEX.md read in subagent) ---
overlay_result = run_bash(
  f'node "$FORGE_ROOT/tools/build-overlay.cjs" --bug {bug_id} --format md'
)
bug_overlay_md = overlay_result.stdout if overlay_result.exit_code == 0 else ""

# --- Spawn subagent (no banner command in prompt) ---
spawn_subagent(
  prompt=compose_subagent_prompt(
    agent_name=agent_name, progress_log_path=progress_log_path, banner_name=banner_name,
    sprint_or_bug_id="bugs", phase_role=phase.role,
    architecture_block=bug_architecture_block, summary_block=bug_summary_block,
    role_block=role_block, overlay_md=bug_overlay_md,
    context={"Bug Root": bug_root_path, "Store Root": store_root_path,
             "Events Root": ".forge/store/events/bugs/"},
    workflow=phase.workflow, record_id=bug_id,
    sidecar_path=f".forge/store/events/bugs/_{event_id}_usage.json"
  ),
  description=f"{emoji} {persona_name} — {phase.name} for {bug_id}",
  model=phase_model
)

# --- Stop progress Monitor ---
stop_monitor(progress_log_path)
```

**Orchestrator Iron Laws:** See `generic-skills.md § Orchestrator Iron Laws` for the six universal laws that apply to this workflow.
<!-- See _fragments/event-emission-schema.md for event field reference -->

**Key rules for the generated `fix_bug.md`:**
- `ROLE_TO_NOUN` MUST cover all six phases: `plan-fix`, `review-plan`, `implement`, `review-code`, `approve`, `commit`.
- `PERSONA_MAP` MUST use correct emoji/name/tagline per persona (bug-fixer, supervisor, architect, engineer — not all bug-fixer).
- Persona/skill lookups MUST use `{persona_noun}.md` and `{persona_noun}-skills.md`, never `{phase.role}.md`.
- Sidecar path uses `.forge/store/events/bugs/_{event_id}_usage.json` (not `events/{sprint_id}/`).
- Announcement `print()` line MUST include `{tagline}` and `[{phase_model}]`.
- Include progress IPC: clear log at bug start, compute agent names, Monitor before spawn, stop after return.
- Include phase-exit signals and post-phase `/compact` with checkpoint line `[checkpoint] bug={bug_id} phase={phase.role} iterations={iteration_counts}`. Do NOT compact on escalation.

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

<!-- See _fragments/progress-reporting.md for canonical definition -->
> See `_fragments/progress-reporting.md` for the full progress log format and `store-cli progress` command reference.

Log path: `.forge/store/events/bugs/progress.log`. Agent name format: `{bugId}:{persona_noun}:{phase.role}:{iteration}`. Clear at bug start: `store-cli progress-clear bugs`.

## Phase-Exit Signals

After each subagent returns: `✓` for completed/approved, `↻` for revision required (with iteration count), `⚠` for escalated. Format mirrors `meta-orchestrate.md § Phase-Exit Signals` with `bug_id` in place of `task_id`.
