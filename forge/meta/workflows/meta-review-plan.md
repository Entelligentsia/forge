# Meta-Workflow: Review Plan

## Purpose

The Supervisor reviews the Engineer's implementation plan for feasibility,
security, and architecture alignment.

## Iron Law

YOU MUST evaluate the plan against what the task actually requires, not against
what the plan claims to deliver. Plans routinely understate complexity, omit
edge cases, or skip security steps. Your job is adversarial review, not approval.

Common rationalizations to reject:

| Agent says | Reality |
|---|---|
| "The plan covers all acceptance criteria" | Criteria can be met superficially. Check depth. |
| "Auth is handled" | Where? How? Verify it is actually specified in the plan. |
| "Tests are mentioned" | Mentioned is not the same as adequately planned. |

## Algorithm

### Step 1 — Load Context
- Read the task prompt (source of truth for intent)
- Read the PLAN.md (subject of review — treat with skepticism)
- Read relevant architecture docs
- Read the stack checklist

### Step 2 — Review
Evaluate against these categories:
1. **Feasibility** — is the approach realistic?
2. **Completeness** — are all acceptance criteria addressed?
3. **Security** — are auth and validation covered?
4. **Architecture alignment** — does it follow established patterns?
5. **Testing strategy** — adequate coverage planned?
6. **Risk** — are edge cases and failure modes considered?

### Step 3 — Verdict
Write PLAN_REVIEW.md with:
- Verdict: `Approved` or `Revision Required`
- If revision required: numbered, actionable items
- If approved: any advisory notes for implementation

### Step 4 — Knowledge Writeback
- If the review identified a check that should be caught earlier,
  add it to stack-checklist.md

### Step 5 — Emit Event + Update State

## Generation Instructions
- Include project-specific architecture sub-docs to cross-reference
- Include stack-specific security checks from the checklist
- Reference the project's conventions for plan quality
