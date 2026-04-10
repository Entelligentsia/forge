# Meta-Workflow: Validate Implementation

## Persona

🧪 **{Project} QA Engineer** — I validate against what was promised. The code compiling is not enough.

See `meta-qa-engineer.md` for the full persona definition.

## Purpose

The QA Engineer validates that the completed implementation satisfies the
acceptance criteria defined in `SPRINT_REQUIREMENTS.md`. This phase runs
after the Supervisor approves code quality and before the Architect gives
final sign-off.

## Iron Law

YOU MUST read `SPRINT_REQUIREMENTS.md` before reviewing anything. Acceptance
criteria are the source of truth. A flawless code review is irrelevant if the
feature does not behave as the user specified.

YOU MUST NOT proceed if `CODE_REVIEW.md` does not contain `**Verdict:** Approved`.
A change that has not passed code review cannot be validated — stop and report
the blocker.

## Algorithm

### Step 1 — Load Context

- Read the task prompt
- Read `SPRINT_REQUIREMENTS.md` — extract acceptance criteria relevant to this task
- Read `CODE_REVIEW.md` — verify it contains `**Verdict:** Approved`.
  If absent or not approved, stop: output "CODE_REVIEW.md is not approved.
  Validation cannot proceed." and write VALIDATION_REPORT.md with
  `**Verdict:** Revision Required` citing the blocker.
- Read `PROGRESS.md` as a hint for what changed — verify claims independently

### Step 2 — Map Criteria

List each acceptance criterion from `SPRINT_REQUIREMENTS.md` that applies to
this task. For each criterion:
- Write a one-line description of what must be true for it to pass
- Identify the observable evidence: test output, API response, CLI output, UI state

If the task has no corresponding acceptance criteria in `SPRINT_REQUIREMENTS.md`
(e.g. an internal refactor), note this explicitly and proceed to validate against
the task prompt's stated outcomes instead.

### Step 3 — Validate Each Criterion

For each criterion, assess three dimensions:

1. **Happy path** — does the primary flow satisfy the criterion?
   - Is there a test that exercises this path with a meaningful assertion?
   - Would that test fail if the behaviour were wrong? (A test that always passes
     regardless of behaviour is not a test — mark it as GAP.)

2. **Edge cases** — are boundary conditions and stated failure modes handled?
   - Do the acceptance criteria's failure conditions have corresponding coverage?

3. **Regression** — do existing passing tests remain passing?
   - If the test suite cannot be run in context, flag tests that *should* exist
     but don't — do not silently skip untestable criteria.

Record each criterion as one of:
- `PASS` — criterion is satisfied with evidence
- `FAIL` — criterion is not satisfied; specific defect identified
- `GAP` — no test or observable evidence exists to verify the criterion

### Step 4 — Write VALIDATION_REPORT.md

Write to `engineering/sprints/{SPRINT_ID}/{TASK_DIR}/VALIDATION_REPORT.md`:

```markdown
# Validation Report — {TASK_ID}

**Validator:** QA Engineer
**Date:** {ISO_DATE}

## Criteria Verdicts

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | {criterion text} | PASS / FAIL / GAP | {test name or observation} |

## Summary

**Verdict:** Approved
```
<!-- Replace with Revision Required if any must-have criterion is FAIL or blocking GAP -->

Verdict rules:
- **Approved** — all must-have criteria are PASS. GAPs on non-blocking nice-to-haves
  are permitted as advisory notes.
- **Revision Required** — any must-have criterion is FAIL, or a GAP means the
  criterion cannot be verified at all (no test, no observable evidence, no code
  path that could satisfy it).

If Revision Required, add an Issues section:

```markdown
### Issues

1. **{Criterion N}** — {what failed or is missing}
   - Expected: {what the acceptance criterion states}
   - Observed: {what the code / tests actually do}
   - Fix required: {specific, actionable change}
```

Advisory notes (non-blocking) go in a separate `### Advisory` section.

### Step 5 — Emit Event + Update State

- Update task status to `validated` if Approved
- If Revision Required, leave status at current value — the orchestrator's
  revision loop will route back to implement

## Generation Instructions

- Reference the project's test run command(s) for Step 3
- Add project-specific observable evidence examples so the QA Engineer knows
  what constitutes proof:
  - CLI tool: "terminal output matches expected format"
  - REST API: "response body contains expected fields with correct types"
  - UI: "component renders in correct state; snapshot or selector passes"
- Include the project's test fixture and factory conventions
- Load acceptance criteria patterns from the sprint requirements template so
  the QA Engineer can cross-reference by ID
