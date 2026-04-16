---
requirements:
  reasoning: Medium
  context: Medium
  speed: Medium
---

# 🍂 Workflow: Fix Bug (Forge Bug-Fix Orchestrator)

## Persona Self-Load

Read `.forge/personas/bug-fixer.md` and print the opening identity line to stdout.
The orchestrator displays the badge — the bug-fixer persona does NOT run a banner
command as its first action.

**Context:**
- Bugs are reported via `/forge:report-bug` and filed as GitHub issues at `Entelligentsia/forge`
- Store bugs locally at `.forge/store/bugs/FORGE-BUG-{N}.json`
- Root causes tend to be: `configuration`, `business-rule`, `regression`, `integration`, `validation`, `data-integrity`

---

## Triage (Inline Pre-Phase)

Before spawning any subagent, the orchestrator triages the bug **inline**
(triage only reads and classifies — it produces no implementation artifacts):

1. **Locate or create the bug record (MANDATORY — before anything else):**
   a. Determine the bug ID: if `$ARGUMENTS` is an existing `FORGE-BUG-NNN` ID, use it.
      Otherwise derive the next available ID by listing `.forge/store/bugs/`.
   b. If `.forge/store/bugs/{BUG_ID}.json` does NOT exist:
      - Derive a short slug from the bug title (kebab-case, ≤ 5 words)
      - Create the engineering folder:
          ```
          mkdir -p engineering/bugs/{BUG_ID}-{slug}
          ```
      - Write the bug record via store-cli — NEVER write the file directly:
          ```
          node "$FORGE_ROOT/tools/store-cli.cjs" write bug '{
            "bugId":       "{BUG_ID}",
            "title":       "<from input>",
            "description": "<from input>",
            "severity":    "<assessed: critical|major|minor>",
            "status":      "reported",
            "path":        "engineering/bugs/{BUG_ID}-{slug}",
            "reportedAt":  "<current ISO timestamp>"
          }'
          ```
      - If `$ARGUMENTS` contains a GitHub issue URL, include it as `"githubIssue"` in the JSON above — it is a valid schema field.
   c. Read the now-guaranteed record:
          ```
          node "$FORGE_ROOT/tools/store-cli.cjs" read bug {BUG_ID} --json
          ```

2. Read `engineering/bugs/{BUG_DIR}/ANALYSIS.md` if it exists
3. Read the linked GitHub issue (if any — check `Entelligentsia/forge`)
4. Identify the exact file and line where the bug manifests
5. Assess severity: `critical` (blocks init or core workflow) / `major` (incorrect output) / `minor` (cosmetic)
6. Classify root-cause category: `configuration`, `business-rule`, `regression`, `integration`, `validation`, `data-integrity`
7. Check for similar bugs in `.forge/store/bugs/`
8. Update `.forge/store/bugs/{BUG_ID}.json`: set `status` → `"in-progress"`

---

## Bug-Fix Pipeline

```
triage (inline) → plan-fix → review-plan [loop ≤ 3] → implement → review-code [loop ≤ 3] → approve → commit
```

Each phase after triage runs as a **subagent** (Agent tool call) with a
fresh context window. The orchestrator itself stays minimal.

| Phase | Workflow File | Role |
|---|---|---|
| plan-fix | `.forge/workflows/plan_task.md` | `plan` |
| review-plan | `.forge/workflows/review_plan.md` | `review-plan` |
| implement | `.forge/workflows/implement_plan.md` | `implement` |
| review-code | `.forge/workflows/review_code.md` | `review-code` |
| approve | `.forge/workflows/architect_approve.md` | `approve` |
| commit | `.forge/workflows/commit_task.md` | `commit` |

---

## Model Resolution

Resolve using this priority:
1. **`phase.model`** from `config.pipelines` if defined.
2. **Role-based default:**

| Role | Default Model |
|---|---|
| `plan` | `sonnet` |
| `implement` | `sonnet` |
| `review-plan` | `opus` |
| `review-code` | `opus` |
| `approve` | `opus` |
| `commit` | `haiku` |

---

## Execution Algorithm

The orchestrator MUST follow this procedure exactly. Do not deviate.

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
# Displayed by the orchestrator ONLY — subagents do NOT display banners.
BANNER_MAP = {
  "plan-fix":    "rift",
  "review-plan": "oracle",
  "implement":   "rift",
  "review-code": "oracle",
  "approve":     "north",
  "commit":      "forge",
}
# Default fallback: "rift"

# --- Resolve paths ---
bug_root_path = f"engineering/bugs/{bug_dir}"
store_root_path = ".forge/store"

# --- Clear progress log for this bug ---
progress_log_path = ".forge/store/events/bugs/progress.log"
run_bash(f'FORGE_ROOT=$(node -e "console.log(require(\'./.forge/config.json\').paths.forgeRoot)") && node "$FORGE_ROOT/tools/store-cli.cjs" progress-clear bugs')

triage_bug_inline(bug_id)            # locate-or-create, read, classify, set status = "in-progress"
update_bug_store(bug_id, status="in-progress")

phases = [plan-fix, review-plan, implement, review-code, approve, commit]
iteration_counts = {}                # keyed by phase name
i = 0

while i < len(phases):
  phase = phases[i]
  phase_model = phase.model or ROLE_MODEL_DEFAULTS[phase.role]

  start_ts = current_iso_timestamp()
  event_id = f"{start_ts}_{bug_id}_{phase.role}_{phase.action}"
  sidecar_path = f".forge/store/events/bugs/_{event_id}_usage.json"

  # --- Compute agent name for progress IPC ---
  persona_noun = ROLE_TO_NOUN.get(phase.role, "bug-fixer")
  iteration = iteration_counts.get(phase.name, 0) + 1
  agent_name = f"{bug_id}:{persona_noun}:{phase.role}:{iteration}"

  # --- Announce phase: badge banner + bug context ---
  emoji, persona_name, tagline = PERSONA_MAP.get(phase.role, ("🍂", "Bug Fixer", "I find what has decayed and restore it."))
  banner_name = BANNER_MAP.get(phase.role, "rift")
  run_bash(f'FORGE_ROOT=$(node -e "console.log(require(\'./.forge/config.json\').paths.forgeRoot)") && node "$FORGE_ROOT/tools/banners.cjs" --badge {banner_name}')
  print(f"  → {bug_id}  [{phase_model}]\n")

  emit_event(bug_id, phase,
             eventId=event_id,
             iteration=iteration,
             action="start")

  # --- Symmetric Injection: noun resolved from ROLE_TO_NOUN ---
  persona_content = read_file(f".forge/personas/{persona_noun}.md")
  skill_content   = read_file(f".forge/skills/{persona_noun}-skills.md")

  # --- Start progress Monitor before spawning subagent ---
  start_monitor(
    command=f"tail -n +1 -F {progress_log_path} 2>/dev/null || true",
    description=f"Progress: {agent_name}",
    persistent=False
  )

  # --- Spawn fresh-context subagent with progress reporting (no banner-first) ---
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
      f"{persona_content}\n\n"
      f"{skill_content}\n\n"
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
    model=phase_model                # ← MANDATORY
  )

  # --- Stop progress Monitor ---
  stop_monitor(progress_log_path)

  # --- Sidecar merge via store-cli (graceful — exit 1 if missing is non-fatal) ---
  FORGE_ROOT = resolve_forge_root()
  run: node "$FORGE_ROOT/tools/store-cli.cjs" merge-sidecar bugs {event_id}
  emit_event(bug_id, phase, action="complete")

  # --- Phase-exit signal ---
  # Non-review phases always advance with a completion signal
  if phase.role not in ("review-plan", "review-code"):
    print(f"  ✓ {bug_id}  {phase.role}  — completed\n")
    i += 1
    # Compact context: all state is on disk; preserve loop bookkeeping in the summary
    print(f"[checkpoint] bug={bug_id} phase={phase.role} iterations={iteration_counts}")
    /compact
    continue

  # --- Review phase: detect verdict ---
  verdict = read_verdict(bug_id, phase)

  if verdict == "Approved":
    print(f"  ✓ {bug_id}  {phase.role}  — Approved\n")
    i += 1
    # Compact context: all state is on disk; preserve loop bookkeeping in the summary
    print(f"[checkpoint] bug={bug_id} phase={phase.role} iterations={iteration_counts}")
    /compact

  elif verdict == "Revision Required":
    iteration_counts[phase.name] = iteration_counts.get(phase.name, 0) + 1
    print(f"  ↻ {bug_id}  {phase.role}  — Revision Required (iteration {iteration_counts[phase.name]})\n")
    if iteration_counts[phase.name] >= phase.maxIterations:   # default 3
      escalate_to_human(bug_id, phase, reason="max iterations reached")
      break
    target = phase.on_revision or nearest_preceding_non_review(phases, i)
    i = index_of(phases, target)
    # Compact context: all state is on disk; preserve loop bookkeeping in the summary
    print(f"[checkpoint] bug={bug_id} phase={phase.role} iterations={iteration_counts}")
    /compact

  else:
    print(f"  ⚠ {bug_id}  {phase.role}  — escalated to human\n")
    escalate_to_human(bug_id, phase, reason=f"unrecognised verdict: {verdict}")
    break
```

---

## Verdict Detection

After each review phase, read the verdict from the written artifact —
never infer from conversation context.

| Phase role | Artifact | Field |
|---|---|---|
| `review-plan` | `engineering/bugs/{BUG_DIR}/PLAN_REVIEW.md` | Line matching `**Verdict:**` |
| `review-code` | `engineering/bugs/{BUG_DIR}/CODE_REVIEW.md` | Line matching `**Verdict:**` |

Expected values:
```
**Verdict:** Approved
**Verdict:** Revision Required
```

Any other value — or a missing artifact — is unrecognised: escalate.

---

## Escalation Procedure

1. Update `.forge/store/bugs/{BUG_ID}.json`: set `status` → `"triaged"`.
2. Emit a final event with `verdict: "escalated"` and `notes` explaining the reason.
3. Output:
   ```
   ⚠ Bug {BUG_ID} escalated: {reason}
   Review artifact: {artifact_path}
   Resume with: /fix-bug {BUG_ID} after addressing the issues.
   ```
4. Stop.

---

## Status Codes

**YOU MUST use plain machine-readable values — no emoji in store or event fields.**

| Lifecycle point | Value |
|---|---|
| Orchestrator starts (after triage) | `"in-progress"` |
| Commit phase complete | `"fixed"` |
| Escalated | `"triaged"` |

---

## Event Emission

Emit structured events to `.forge/store/events/bugs/` following
`.forge/schemas/event.schema.json`.

Required fields per event:

| Field | Value |
|---|---|
| `eventId` | `{ISO_TIMESTAMP}_{BUG_ID}_{role}_{action}` |
| `taskId` | Bug ID |
| `sprintId` | `"bugs"` (virtual sprint for bug events) |
| `role` | Phase role |
| `action` | Slash command invoked |
| `phase` | Phase name |
| `iteration` | 1-based iteration count |
| `startTimestamp` | ISO 8601 before spawning the subagent |
| `endTimestamp` | ISO 8601 after the subagent returns |
| `durationMinutes` | Decimal minutes elapsed |
| `model` | Full model identifier (e.g. `claude-sonnet-4-6`) |

---

## Knowledge Writeback (Final Phase)

After the commit phase, the orchestrator performs writeback inline:

1. Add a `engineering/stack-checklist.md` item if this bug class should be caught in future reviews.
2. Tag similar bugs in `.forge/store/bugs/` with `similarBugs`.
3. Update `rootCauseCategory` in the bug store JSON if refined.
4. Set `resolvedAt` to the current ISO timestamp.
5. If the fix touched `forge/`, verify `docs/security/scan-v{VERSION}.md` exists.

---

## Iron Laws

**YOU MUST NOT advance a review phase until the verdict artifact exists and reads `Approved`.**
Skipping because "it's a small fix" is not allowed. No exceptions.

**Always read the verdict from the artifact.** Never assume approval because the review ran without error.

**Revision loop exhaustion is an escalation trigger.** Do NOT approve to unblock.

**Phase banners are orchestrator-owned.** Do NOT include banner-first instructions in subagent prompts.

**No emoji in machine-readable fields.** Emoji belong only in human-facing output.

**Model parameter is mandatory.** Every `spawn_subagent` call MUST include `model=phase_model`.

**Forge-specific:** any fix that modifies files inside `forge/` requires a
version bump, migration entry, and security scan.

---

## Rationalization Table (Forge-specific)

| Agent says | Reality |
|---|---|
| "It's a one-line fix, no version bump needed" | Material change to `forge/` = version bump. Read CLAUDE.md. |
| "Security scan isn't needed — we're just fixing a bug" | Any `forge/` modification requires a scan. No exceptions. |
| "The review phase already ran, we can assume Approved" | Read the verdict line from the artifact. Always. |
| "Max iterations reached — let's just approve to unblock" | Escalate. Never approve to unblock. |
| "PROGRESS.md says tests passed" | Run `node --check` and `validate-store --dry-run` yourself. |
| "The bug store file didn't exist so I created it directly" | Use `store-cli write bug` — never write JSON store files directly. |
