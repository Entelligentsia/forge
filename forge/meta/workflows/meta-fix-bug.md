# Meta-Workflow: Fix Bug (Orchestrator)

## Purpose

Triage a reported bug, analyse the root cause, drive the fix through the full
plan → review → implement → code-review → approve → commit pipeline
autonomously, and classify the root cause for trend analysis.

---

## Persona

🍂 **{PROJECT_NAME} Bug Fixer** — I find what has decayed and restore it.

---

## Triage (Inline Pre-Phase)

Before spawning any subagent, the orchestrator triages the bug inline:

1. Read `.forge/store/bugs/{BUG_ID}.json`
2. Read `engineering/bugs/{BUG_DIR}/ANALYSIS.md` if it exists
3. Identify the exact file and line where the bug manifests
4. Assess severity: `critical` / `major` / `minor`
5. Classify root cause category (see Step 2 below)
6. Update bug store `status` → `"in-progress"`

Triage is inline because it only reads and classifies — it produces no
implementation artifacts that would contaminate downstream subagent context.

---

## Bug-Fix Pipeline

```
triage (inline) → plan-fix → review-plan → [loop ≤ 3] → implement → review-code → [loop ≤ 3] → approve → commit
```

Each phase after triage runs as a **subagent** (Agent tool call) with a fresh
context window. The orchestrator itself stays minimal — it only holds the phase
loop and emits events.

---

## Model Resolution

Resolve the model for each phase using this priority:

1. **`phase.model`** from `config.pipelines` if defined (highest priority)
2. **Role-based default:**

| Role          | Default Model |
|---------------|---------------|
| `plan`        | `sonnet`      |
| `implement`   | `sonnet`      |
| `review-plan` | `opus`        |
| `review-code` | `opus`        |
| `approve`     | `opus`        |
| `commit`      | `haiku`       |

---

## Execution Algorithm

The orchestrator MUST follow this procedure exactly. Do not deviate.

```
triage_bug_inline(bug_id)           # read, classify, set status = "in-progress"
update_bug_store(bug_id, status="in-progress")

phases = [plan-fix, review-plan, implement, review-code, approve, commit]
iteration_counts = {}               # keyed by phase name
i = 0

while i < len(phases):
  phase = phases[i]
  phase_model = phase.model or ROLE_MODEL_DEFAULTS[phase.role]

  start_ts = current_iso_timestamp()
  event_id = f"{start_ts}_{bug_id}_{phase.role}_{phase.action}"
  sidecar_path = f".forge/store/events/bugs/_{event_id}_usage.json"

  emit_event(bug_id, phase, eventId=event_id, iteration=iteration_counts.get(phase.name, 0) + 1, action="start")

  spawn_subagent(
    prompt="🍂 **{PROJECT_NAME} Bug Fixer — {phase.name}**\n\nRead `{phase.workflow}` and follow it. Bug ID: {bug_id}. Also read `engineering/MASTER_INDEX.md` and `engineering/bugs/{BUG_DIR}/ANALYSIS.md` for context. Before returning: run /cost, parse token usage, and write sidecar `.forge/store/events/bugs/_{event_id}_usage.json` with fields: inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, estimatedCostUSD.",
    description="{phase.name} phase for {bug_id}",
    model=phase_model
  )

  # Sidecar merge (graceful — no error if missing)
  token_fields = {}
  if file_exists(sidecar_path):
    token_fields = read_json(sidecar_path)
    delete_file(sidecar_path)
  emit_event(bug_id, phase, action="complete", extra_fields=token_fields)

  # Non-review phases always advance
  if phase.role not in ("review-plan", "review-code"):
    i += 1
    continue

  # Review phase: detect verdict from artifact
  verdict = read_verdict(bug_id, phase)   # see Verdict Detection below

  if verdict == "Approved":
    i += 1

  elif verdict == "Revision Required":
    iteration_counts[phase.name] = iteration_counts.get(phase.name, 0) + 1

    if iteration_counts[phase.name] >= phase.maxIterations:   # default 3
      escalate_to_human(bug_id, phase, reason="max iterations reached")
      break

    # Loop back: review-plan → plan-fix; review-code → implement
    target = phase.on_revision or nearest_preceding_non_review(phases, i)
    i = index_of(phases, target)

  else:
    escalate_to_human(bug_id, phase, reason=f"unrecognised verdict: {verdict}")
    break
```

---

## Verdict Detection

After each review phase, read the verdict from the written artifact — never
infer from conversation context.

| Phase role    | Artifact                                        | Field                  |
|---------------|-------------------------------------------------|------------------------|
| `review-plan` | `engineering/bugs/{BUG_DIR}/PLAN_REVIEW.md`     | Line matching `**Verdict:**` |
| `review-code` | `engineering/bugs/{BUG_DIR}/CODE_REVIEW.md`     | Line matching `**Verdict:**` |

Expected values (trimmed after `**Verdict:**`):

```
**Verdict:** Approved
**Verdict:** Revision Required
```

Any other value — or a missing artifact — is unrecognised: escalate.

---

## Escalation Procedure

1. Update bug store: `status` → `"triaged"` (revert to triaged so it is not lost)
2. Emit a final event with `verdict: "escalated"` and `notes` explaining the reason
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

Bug store `status` MUST be one of the `bug.schema.json` enum values:

| Lifecycle point        | Value         |
|------------------------|---------------|
| Orchestrator starts    | `"in-progress"` |
| Commit phase complete  | `"fixed"`     |

Event `verdict` MUST be one of:

| Outcome           | Value                |
|-------------------|----------------------|
| Review passed     | `"Approved"`         |
| Needs rework      | `"Revision Required"` |
| Escalated         | `"escalated"`        |

Do NOT write `"🔴 Plan Revision Required"`, `"✅ Committed"`, or any
emoji-decorated string into JSON fields.

---

## Agent Announcement Banner

Every subagent invocation prompt MUST open with this decorated banner line:

```
🍂 **{PROJECT_NAME} Bug Fixer — {phase.name}**
```

This must appear as the first line of the subagent prompt, before workflow
instructions. It matches the convention used by `/run-task` and `/run-sprint`.

---

## Event Emission

Emit structured events to `.forge/store/events/bugs/` following `event.schema.json`.

Required fields per event:

| Field            | Value                                                       |
|------------------|-------------------------------------------------------------|
| `eventId`        | `{ISO_TIMESTAMP}_{BUG_ID}_{role}_{action}`                  |
| `taskId`         | Bug ID (use bug ID in the taskId field)                     |
| `sprintId`       | `"bugs"` (virtual sprint for bug events)                    |
| `role`           | Phase role (`plan`, `review-plan`, `implement`, etc.)       |
| `action`         | Slash command invoked (e.g. `/implement`, `/review-plan`)   |
| `phase`          | Phase name                                                  |
| `iteration`      | 1-based iteration count for this phase                      |
| `startTimestamp` | ISO 8601 before spawning the subagent                       |
| `endTimestamp`   | ISO 8601 after the subagent returns                         |
| `durationMinutes`| Decimal minutes elapsed                                     |
| `model`          | Full model identifier (e.g. `claude-sonnet-4-6`)            |

Use only the field names above — no aliases (`agent`, `status`, `timestamp`, `details`).

---

## Knowledge Writeback (Final Phase)

After the commit phase, the orchestrator performs writeback inline:

1. Add a stack-checklist item if this bug class should be caught in future reviews
2. Tag similar bugs in `.forge/store/bugs/` with `similarBugs`
3. Update `rootCauseCategory` in the bug store JSON if refined during implementation
4. Set `resolvedAt` to the current ISO timestamp

---

## Iron Laws

**YOU MUST NOT advance a review phase until the verdict artifact exists and reads `Approved`.** Skipping because "it's a small fix" is not allowed. No exceptions.

**Always read the verdict from the artifact.** Never assume approval because the review phase ran without error.

**Revision loop exhaustion is an escalation trigger.** Do NOT approve to unblock.

**No emoji in machine-readable fields.** Emoji belong only in human-facing output (PROGRESS.md, announcements).

---

## Generation Instructions

- Fill in `{PROJECT_NAME}` from `.forge/config.json` → `project.name`
- Fill in `{BUG_DIR}` from the bug store `path` field → derive the directory name
- Fill in test/build/lint commands from `.forge/config.json` → `commands`
- Reference the exact workflow filenames in `.forge/workflows/` for each phase
- Use the Execution Algorithm above verbatim — do not paraphrase
- `spawn_subagent` = Agent tool call. Each phase invocation MUST use the Agent tool
- **Model assignment is mandatory.** Every `spawn_subagent` call MUST include `model=phase_model`
- **Include the sidecar merge pattern** after every subagent return
- **Include the Status Codes table** — the generated workflow must enforce plain values
- **Include the Agent Announcement Banner section** — first line of every subagent prompt
