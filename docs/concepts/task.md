# Task

A **Task** is the fundamental atomic unit of work in Forge. Tasks represent single implementation steps that advance a [Sprint](sprint.md) toward its goal.

## Purpose

A Task bounds an agent's context. Tasks contain their own prompt (`TASK_PROMPT.md`) and are orchestrated through a rigid pipeline (Plan → Review → Implement → Code Review). A Task maps exactly to one workflow cycle and produces defined artifacts (e.g., `PLAN.md`).

## Lifecycle

Tasks go through a comprehensive review and implementation lifecycle:

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> planned
    planned --> plan_approved
    planned --> plan_revision_required
    plan_revision_required --> planned
    
    plan_approved --> implementing
    implementing --> implemented
    implemented --> review_approved
    implemented --> code_revision_required
    code_revision_required --> implementing
    
    review_approved --> approved
    approved --> committed
    
    draft --> blocked
    planned --> escalated
    implementing --> escalated
    
    committed --> [*]
    blocked --> [*]
    escalated --> [*]
```

*(Note: Internal JSON schema uses hyphens, e.g., `plan-approved`, `code-revision-required`.)*

For commands related to tasks, see the [Commands Reference](../commands/INDEX.md).
