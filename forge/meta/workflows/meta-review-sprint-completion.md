# Meta-Workflow: Review Sprint Completion

## Purpose

Sprint-close audit: verify all tasks have reached a terminal state, make
carry-over or abandonment decisions, and update sprint status before handing
off to the retrospective.

This workflow runs after `/run-sprint` completes (all tasks are terminal or
stalled) and before `/retrospective`. It is the gate that ensures no task is
silently forgotten and the sprint record is accurate before retrospective
analysis begins.

## Algorithm

### Step 1 — Load Sprint State

- Read the sprint record from `.forge/store/sprints/{SPRINT_ID}.json`
- Read all task records whose `sprintId` matches, from `.forge/store/tasks/`
- Build an outcome table:

  | Task | Title | Status | Notes |
  |---|---|---|---|
  | {TASK_ID} | {title} | {status} | carry-over candidate / blocker / none |

### Step 2 — Verify Terminal Coverage

Terminal statuses are: `committed`, `abandoned`, `escalated`.

Non-terminal statuses that must be resolved before sprint can close:
`draft`, `planned`, `plan-approved`, `implementing`, `implemented`,
`review-approved`, `approved`, `plan-revision-required`,
`code-revision-required`, `blocked`.

For each non-terminal task:
- If work is partially done and continuable → **carry over** (Step 3)
- If blocked with no resolution path → **escalate** or **abandon** (Step 3)
- If it was not started and scope has changed → **abandon** (Step 3)

Do not proceed to Step 4 until every task is in a terminal status.

### Step 3 — Carry-Over / Abandon Decisions

For each non-terminal task, decide with the user (or apply the rule
heuristic if operating autonomously):

**Carry over:**
- Update `estimate` if the remaining work differs from the original
- Reset `status` to `planned`
- Record carry-over in the task's `description` with the originating sprint ID

**Abandon:**
- Set `status` to `abandoned`
- Record reason in the task's `description`

### Step 4 — Project-Specific Completion Checks

Run the project-specific checklist defined in Generation Instructions.

Each check is either **PASS** or **FAIL**. A FAIL is a blocker — resolve it
before marking the sprint complete.

### Step 5 — Update Sprint Record

Write back to `.forge/store/sprints/{SPRINT_ID}.json`:

- `status`: `completed` if all tasks are `committed`; `partially-completed`
  if any were abandoned or escalated
- `completedAt`: current ISO timestamp

### Step 6 — Hand Off

Output:

> "Sprint {SPRINT_ID} is closed. Run `/retrospective {SPRINT_ID}` to extract
> learnings and update the knowledge base."

## Generation Instructions

- Replace the Step 4 checklist with project-appropriate completion checks.
  Examples by project type:
  - **Released library / plugin:** version field bumped in manifest, changelog
    or migration entry added, distribution artifacts committed
  - **REST API service:** pending migrations merged and reviewed, no skipped
    schema version, API contract docs updated if endpoints changed
  - **Frontend app:** build passes, assets committed or CI pipeline green,
    feature flags cleaned up if any were introduced
  - **Generic:** tests pass, linter clean, no uncommitted changes, no
    `TODO`/`FIXME` introduced without a tracking issue
- Reference the project's sprint ID format and store path prefix
- Reference the project's terminal task statuses if they differ from defaults
- If the project uses a release branch workflow, add a Step 4 check for
  branch merge status
