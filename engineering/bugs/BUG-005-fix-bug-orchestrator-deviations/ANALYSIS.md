# BUG-005 — Analysis: /fix-bug is not an orchestrator

**GitHub:** Entelligentsia/forge#20
**Severity:** Major
**File:** `forge/meta/workflows/meta-fix-bug.md`

## Root Cause

`meta-fix-bug.md` was written as a prose description of the bug-fix pipeline —
it lists steps but does not generate an orchestrator. When init produces
`engineer_fix_bug.md`, the result is a human-readable guide rather than a
self-driving workflow. Every step transition requires a manual `/command`
from the user.

By contrast, `meta-orchestrate.md` (which backs `/run-task` and `/run-sprint`)
defines a full execution algorithm: sub-agent chaining via the Agent tool,
verdict detection from written artifacts, loop-back on revision-required, and
escalation on max-iterations exhaustion.

## Four Deviations

### Deviation 1 — No loop-back on Plan Revision Required
When the Supervisor returns `Revision Required` from plan review, the workflow
has no mechanism to re-invoke the engineer. Control falls to the user.

**Fix:** Add a revision loop to the execution algorithm: on `Revision Required`
from `review-plan`, re-invoke `plan-fix`. On `Revision Required` from
`review-code`, re-invoke `implement`. Respect `maxIterations` (default 3) before
escalating to human.

### Deviation 2 — Prose description, not an orchestrator
The workflow describes phases but does not issue Agent tool calls. Each
transition requires a manual `/command` from the user.

**Fix:** Rewrite `meta-fix-bug.md` to embed the `meta-orchestrate.md` execution
algorithm adapted for the bug-fix pipeline:

```
triage (inline) → plan-fix → review-plan → [loop ≤3] → implement → review-code → [loop ≤3] → approve → commit
```

Triage (read bug report, classify severity, identify root cause path) runs
inline because it only reads and classifies — no artifacts that contaminate
downstream context. All other phases spawn subagents via the Agent tool.

### Deviation 3 — Emoji in status/event fields
The generated workflow instructed the bug fixer to write status values like
`"🔴 Plan Revision Required"` and `"✅ Committed"` into store JSON and event
files. These violate the schema:

- `bug.schema.json` → `status` enum: `"reported"`, `"triaged"`, `"in-progress"`,
  `"fixed"`, `"verified"` (plain strings — already correct in schema)
- `event.schema.json` → `verdict` field: `"Approved"` / `"Revision Required"`
  (no emoji)

**Fix:** Add explicit Generation Instructions that the bug store `status` field
MUST use the schema enum values, and the event `verdict` field MUST use the
plain strings defined in `event.schema.json`. No emoji in machine-readable fields.

### Deviation 4 — Missing agent announcement banners
`/run-sprint` and `/run-task` workflows emit decorated banners when announcing
each phase agent (e.g. `🍂 Engineer`, `🌿 Supervisor`, `⛰️ Architect`,
`🌱 Engineer-Commit`). The fix-bug workflow's header defines
`🍂 **walkinto.in Bug Fixer**` but generated announcement lines at runtime
omitted the decoration.

**Fix:** Add an `ANNOUNCE` block to `meta-fix-bug.md`'s Generation Instructions
specifying that every subagent invocation prompt must open with the decorated
banner. Standardise the format across all orchestrated workflows.

## Fix Plan

1. Rewrite `forge/meta/workflows/meta-fix-bug.md`:
   - Add orchestrator execution algorithm (agent chaining, verdict detection,
     revision loop, escalation)
   - Add triage pre-phase (inline, read-only)
   - Add bug-fix pipeline definition:
     `triage → plan-fix → review-plan → implement → review-code → approve → commit`
   - Add explicit plain-status-code rule to Generation Instructions
   - Add standardised `ANNOUNCE` block to Generation Instructions

2. Users must regenerate `engineer_fix_bug.md` after updating (`/forge:update`
   will prompt this via `regenerate: ["workflows"]` in the migration entry).

## Impact

- All `/fix-bug` invocations in existing projects will continue to use the old
  prose workflow until they regenerate. The old workflow is functional but
  requires manual step invocations.
- No schema changes required — `bug.schema.json` and `event.schema.json` are
  already correct.
- No change to `meta-orchestrate.md` — it is the reference we align to.
