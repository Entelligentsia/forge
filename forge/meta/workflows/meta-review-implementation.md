# Meta-Workflow: Review Implementation

## Purpose

The Supervisor reviews the completed implementation for correctness,
security, conventions, and business rule compliance.

## Iron Law

YOU MUST verify everything independently. PROGRESS.md is the Engineer's own
account of what they did — it may be incomplete, optimistic, or inaccurate.
DO NOT trust it as ground truth. Read the actual changed files.

Common rationalizations to reject:

| Agent says | Reality |
|---|---|
| "PROGRESS.md confirms all items done" | PROGRESS.md is self-reported. Read the code. |
| "Tests pass so it must be correct" | Tests can be inadequate. Check coverage and assertions. |
| "The plan was approved so the approach is fine" | Plans evolve during implementation. Verify what was actually built. |

## Algorithm

### Step 1 — Load Context
- Read the task prompt and approved PLAN.md
- Read PROGRESS.md as a *checklist hint only*, not as a source of truth
- Read the stack checklist
- Read relevant architecture and business domain docs

### Step 2 — Review Code Changes
- YOU MUST read every changed file directly — do not rely on PROGRESS.md's manifest alone
- Check each file against the stack checklist
- Verify the plan was followed by comparing intent (PLAN.md) to reality (code)

### Step 3 — Review Categories
1. **Correctness** — does the code do what the plan specifies?
2. **Security** — auth checks present, input validated, no injection vectors
3. **Conventions** — matches project code style and patterns
4. **Business rules** — domain rules respected
5. **Testing** — tests exist, assertions are meaningful, edge cases covered
6. **Performance** — no obvious N+1 queries, unnecessary loops, missing indexes

### Step 4 — Verdict
Write CODE_REVIEW.md with:
- Verdict: `Approved` / `Approved with supervisor corrections` / `Revision Required`
- If revision required: numbered, actionable items with file:line references
- If approved: any advisory notes

### Step 5 — Knowledge Writeback
- Add stack-checklist items for patterns that should be caught in future reviews

### Step 6 — Emit Event + Update State

## Generation Instructions
- Load the project's stack-checklist.md as concrete review criteria
- Include framework-specific checks (Django: migrations, React: key props, etc.)
- Reference the project's auth pattern to verify
