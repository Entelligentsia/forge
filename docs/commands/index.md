# Command Reference

Forge commands fall into four categories. Choose the section that matches what you need.

---

## Forge plugin commands

Manage the Forge installation and project-level generated artifacts. Run from any project directory.

| Command | Purpose |
|---|---|
| [`/forge:init`](forge/init.md) | Bootstrap a complete SDLC instance from a codebase (12 phases, fast or full mode) |
| [`/forge:health`](forge/health.md) | Detect stale docs, orphaned entities, missing skills, and 14 other health checks |
| [`/forge:regenerate`](forge/regenerate.md) | Refresh generated workflows, templates, tools, KB docs, personas, skills, or commands |
| [`/forge:update`](forge/update.md) | Propagate a plugin version upgrade into project artifacts (7 steps) |
| [`/forge:calibrate`](forge/calibrate.md) | Detect drift, propose regeneration patches, and apply approved patches |
| [`/forge:add-pipeline`](forge/add-pipeline.md) | Add, customize, view, or remove custom task pipelines |
| [`/forge:add-task`](forge/add-task.md) | Add a task to an existing sprint mid-flight |
| [`/forge:ask`](forge/ask.md) | Ask Tomoshibi about project status, config, workflows, or version |
| [`/forge:config`](forge/config.md) | Inspect or change project config; promote fast mode to full |
| [`/forge:materialize`](forge/materialize.md) | Fill stubs from fast-mode init without overwriting pristine files |
| [`/forge:migrate`](forge/migrate.md) | Migrate a pre-existing AI-SDLC store to Forge format |
| [`/forge:quiz-agent`](forge/quiz-agent.md) | Verify an agent has loaded and understood the project KB |
| [`/forge:remove`](forge/remove.md) | Remove Forge artifacts from the current project (3 levels) |
| [`/forge:report-bug`](forge/report-bug.md) | File a bug against Forge — gathers context and opens a GitHub issue |
| [`/forge:store-query`](forge/store-query.md) | Query the Forge store by natural language or exact flags |
| [`/forge:store-repair`](forge/store-repair.md) | Diagnose and repair corrupted store records |
| [`/forge:update-tools`](forge/update-tools.md) | Refresh JSON schemas from the installed plugin |

---

## Sprint commands

Drive the sprint lifecycle — from requirements capture through retrospective.

| Command | Purpose |
|---|---|
| [`/sprint-intake`](sprint/intake.md) | Interview the user and produce structured sprint requirements |
| [`/sprint-plan`](sprint/plan.md) | Break requirements into tasks with estimates and a dependency graph |
| [`/run-sprint`](sprint/run.md) | Execute all sprint tasks through the pipeline in dependency waves |
| [`/retrospective`](sprint/retrospective.md) | Close a sprint and feed learnings back into the knowledge base |

---

## Task pipeline commands

Each command handles one phase of the task lifecycle. The orchestrator calls these in sequence; you can also invoke them directly to drive individual phases.

| Command | Role | Purpose |
|---|---|---|
| [`/run-task`](task-pipeline/run-task.md) | Orchestrator | Drive a single task through the complete pipeline end-to-end |
| [`/plan-task`](task-pipeline/plan.md) | Engineer | Research the codebase and write an implementation plan |
| [`/review-plan`](task-pipeline/review-plan.md) | Supervisor | Adversarially review the plan for feasibility and completeness |
| [`/implement`](task-pipeline/implement.md) | Engineer | Implement the approved plan; run tests; document |
| [`/review-code`](task-pipeline/review-code.md) | Supervisor | Review the implementation against plan, checklist, and security criteria |
| [`/approve`](task-pipeline/approve.md) | Architect | Final architectural sign-off before commit |
| [`/commit`](task-pipeline/commit.md) | Engineer | Stage artifacts and code; create a formatted commit |
| [`/fix-bug`](task-pipeline/fix-bug.md) | Engineer | Triage, root-cause, fix, and classify a bug |

---

## Lifecycle overview

### Sprint lifecycle

```mermaid
flowchart LR
    A([sprint-intake]) -->|SPRINT_REQUIREMENTS.md| B([sprint-plan])
    B -->|task manifests\ndependency graph| C([run-sprint])
    C -->|committed code\nartifacts| D([retrospective])
    D -->|KB updates\nchecklist additions| E[(Knowledge Base)]
    E -.->|richer next sprint| A

    style A fill:#7b68ee,color:#fff
    style B fill:#4a90e2,color:#fff
    style C fill:#2ecc71,color:#fff
    style D fill:#e67e22,color:#fff
```

### Task pipeline

```mermaid
flowchart TD
    RT([run-task]) --> P

    P["plan-task\nEngineer"] --> RP{review-plan\nSupervisor}
    RP -->|Revision Required\nmax 3 loops| P
    RP -->|Approved| I["implement\nEngineer"]

    I --> GC{Gate checks\ntests · build · lint}
    GC -->|fail → retry once| I
    GC -->|pass| RC{review-code\nSupervisor}

    RC -->|Revision Required\nmax 3 loops| I
    RC -->|Approved| V{validate\nQA Engineer}
    V -->|Issues found| I
    V -->|Passed| AP[approve\nArchitect]
    AP --> CM([commit])

    RP -->|loop exhausted\nmax 3| ESC1([escalate to human])
    RC -->|loop exhausted\nmax 3| ESC2([escalate to human])

    style RP fill:#f5a623,color:#000
    style RC fill:#f5a623,color:#000
    style V fill:#9b59b6,color:#fff
    style AP fill:#4a90e2,color:#fff
    style CM fill:#2ecc71,color:#fff
    style ESC1 fill:#e74c3c,color:#fff
    style ESC2 fill:#e74c3c,color:#fff
    style GC fill:#95a5a6,color:#fff
```