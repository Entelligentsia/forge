# Bug

A **Bug** is an independently tracked defect record. Bugs spawn from [Tasks](task.md) when an issue is discovered during development or feature testing. They operate similarly to tasks but focus on identifying and remediating root causes.

## Purpose

Separating Bugs from Tasks allows Forge to track the velocity of defect discovery, mandate root-cause categorization, and ensure structural regressions are fed back into the Knowledge Base via updated architectural rules or business constraints.

## Lifecycle

Bugs follow a streamlined path towards resolution:

```mermaid
stateDiagram-v2
    [*] --> reported
    reported --> triaged
    triaged --> in_progress
    in_progress --> fixed
    fixed --> verified
    verified --> [*]
```

*(Note: Internal JSON schema uses hyphens if applicable, though Bug's states are mostly single words except `in-progress`.)*

For managing bugs, see the [Commands Reference](../commands/index.md).
