# Sprint

A **Sprint** is a bounded execution cycle that groups together multiple [Tasks](task.md) to be delivered as a coherent unit.

## Purpose

Sprints manage the cadence of delivery in Forge. They define what is being built *now*. Each Sprint maintains a localized artifact directory (`engineering/sprints/{SPRINT_ID}/`) containing the prompt documents for its tasks and a metadata file recording dependencies and state.

## Lifecycle

Sprints follow a strict workflow:

```mermaid
stateDiagram-v2
    [*] --> planning
    planning --> active
    active --> completed
    completed --> retrospective_done : Note the hyphen in retrospective-done
    
    planning --> blocked
    active --> partially_completed : Note the hyphen in partially-completed
    blocked --> [*]
    partially_completed --> [*]
    retrospective_done --> [*]
```

*(Note: Internal JSON schema uses hyphens in state names, e.g., `retrospective-done`, `partially-completed`.)*

For commands related to starting and managing sprints, see the [Commands Reference](../commands/index.md).

## Execution waves

When executing (`/run-sprint`), the orchestrator runs all tasks respecting the dependency graph. Independent tasks run in waves:

```mermaid
flowchart LR
    subgraph w1["Wave 1 (parallel)"]
        T1[T01\nsetup CI]
        T2[T02\ndata model]
    end

    subgraph w2["Wave 2 (parallel)"]
        T3[T03\nauth — needs T02]
        T4[T04\nAPI layer — needs T02]
    end

    subgraph w3["Wave 3"]
        T5[T05\nintegration — needs T03 + T04]
    end

    T1 --> T3
    T2 --> T3
    T2 --> T4
    T3 --> T5
    T4 --> T5
```

## Maintenance Cadence

A Sprint closes with a Retrospective (`/retrospective`). This phase is what makes Forge self-improving by updating the knowledge base directly.

Two things evolve over a project's lifetime: the **knowledge base** (KB) and the **generated workflows**. They update through different mechanisms:

```mermaid
flowchart TD
    subgraph auto["Updates automatically"]
        RET["/retrospective — every sprint"] -->|writes back| KB[(Knowledge Base)]
    end

    subgraph manual["Manual regeneration triggers"]
        T1[Every few sprints<br/>or after significant retrospective]
        T2[After health detects<br/>codebase drift]
        T3[After Forge<br/>plugin update]
    end

    T1 --> RW["/forge:regenerate workflows"]
    T2 --> RK["/forge:regenerate knowledge-base"]
    RK --> RW2["follow up: forge:regenerate workflows<br/>if changes are substantial"]
    T3 --> FU["/forge:update — runs right targets automatically"]
```
