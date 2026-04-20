---
requirements:
  reasoning: High
  context: Medium
  speed: Low
---

# 🗻 Workflow: Sprint Retrospective (Forge Architect)

## Persona Self-Load

As first action (before any other tool use), read `.forge/personas/architect.md`
and print the opening identity line to stdout.

🗻 **Forge Architect** — I close the sprint, extract learnings, and improve the system.

---

I am running the Sprint Retrospective for **{SPRINT_ID}**.

## Step 1 — Load Context

- Read all task manifests for the sprint from `engineering/sprints/{SPRINT_DIR}/`
  (PLAN, PROGRESS, PLAN_REVIEW, CODE_REVIEW, ARCHITECT_APPROVAL)
- Read all task JSONs from `.forge/store/tasks/` filtered by `sprintId`
- Read all events from `.forge/store/events/{SPRINT_ID}/` (including token usage)
- Read all retrospective notes gathered during the sprint
- Read sprint JSON from `.forge/store/sprints/{SPRINT_ID}.json`
- Read all bugs fixed during the sprint from `.forge/store/bugs/`
  (cross-reference `resolvedAt` against sprint window)
- Read `COST_REPORT.md` from `engineering/sprints/{SPRINT_DIR}/` if it exists
  (pre-computed cost view from collate). If it does not exist, note that cost
  analysis will be skipped in Step 2 and Step 5.

## Step 2 — Analyse Patterns

**Context Isolation:** All cost analysis and doc update sub-tasks MUST be
executed via the Agent tool — never inline. This keeps the retrospective's
context lean and the analysis auditable.

Use the Agent tool for each analysis sub-task:

### Iteration Analysis

- How many plan-review and code-review loops per task? If >2 consistently,
  what was the root cause?
- Identify "bottleneck" tasks (high iteration counts or long duration)

### Review Theme Analysis

- What did the Supervisor flag repeatedly? (Missing security scan? Missing
  version bump? No-npm violations? Path hardcoding?)
- Any recurring themes should become stack-checklist items

### Version Management Review

- Were all material changes correctly versioned? Any bumps missed, added
  late, or overcounted?

### Security Compliance Check

- Were all `forge/` changes scanned before pushing? Were reports committed?

### Migration Correctness Review

- Did any migration entry need correction after the fact? Any `regenerate`
  targets missed?

### Plugin-Specific Friction

- Were there any surprises with the Claude Code plugin API, hook execution,
  or tool distribution?

### Bug Root Cause Analysis

- If bugs were fixed, group by `rootCauseCategory` — are any categories
  recurring?

### Cost Analysis

If any events loaded in Step 1 have an `inputTokens` field, use the Agent tool
to compute (otherwise skip this subsection entirely):

- **Total tokens:** sum of `inputTokens + outputTokens` across all events with
  token data
- **Total estimated cost:** sum of `estimatedCostUSD` across those events
- **Per-task token totals:** group events by `taskId`, sum tokens per task,
  sort descending
- **Review overhead ratio:** sum of tokens for events where `role` is
  `review-plan`, `review-code`, or `approve` divided by total sprint tokens.
  Express as a percentage
- **Baseline comparison:** if `.forge/store/COST_BASELINES.json` exists, load
  it and compare the current sprint's median tokens per estimate tier
  (S/M/L/XL) to the stored baseline medians. Flag any task whose total tokens
  exceed 2x the baseline for its tier

Gracefully skip all cost aggregation if no events have token fields.

## Step 3 — Knowledge Base Review

Use the Agent tool for sub-tasks:

- Review all `[?]` writebacks added to `engineering/architecture/` during the
  sprint — confirm or remove each
- Promote patterns that appeared 2+ times to `engineering/stack-checklist.md`
- If any new Forge-specific invariant was discovered (hook exit discipline,
  no-npm, path-from-config), ensure it is in the checklist
- Update architecture/domain docs with "lessons learned"
- Update stack-checklist with new verification steps

## Step 4 — Workflow Improvements

- If a workflow step consistently caused friction, propose a concrete edit to
  the relevant file in `forge/meta/workflows/` (the meta source, not
  `.forge/workflows/`)
- If a template section was consistently skipped, propose removing it
- If a new check category emerged, propose adding it to the relevant
  meta-workflow
- If a stack-checklist item was never triggered, consider removing it
- Propose improvements to meta-workflows based on analysis

## Step 5 — Write Retrospective

Write `RETROSPECTIVE.md` to
`engineering/sprints/{SPRINT_DIR}/RETROSPECTIVE.md` using
`.forge/templates/RETROSPECTIVE_TEMPLATE.md`.

Sections:
- Sprint summary with metrics (tasks planned / committed / escalated)
- What went well
- What to improve
- Knowledge base updates made
- Workflow improvements proposed

Include a "Cost Analysis" section using the data computed in Step 2. If token
data was available, use the RETROSPECTIVE_TEMPLATE structure:

```markdown
## Cost Analysis

| Metric | Value |
|---|---|
| Total input tokens | {N} |
| Total output tokens | {N} |
| Total estimated cost | ${X.XX} |
| Review overhead ratio | {X%} |

### Most Expensive Tasks

| Task | Total Tokens | Est. Cost USD | Source |
|---|---|---|---|
| {TASK_ID} | {N} | ${X.XX} | reported / estimated / mixed |

### Baseline Comparison

| Estimate | Baseline Median Tokens | This Sprint Median | Delta |
|---|---|---|---|
| S | {N} | {N} | {±%} |

_Baseline comparison omitted — no prior baseline data._
```

If no token data is available for this sprint, emit a single line:
`_No token data available for this sprint._`

Update sprint status:

```
/forge:store update-status sprint {SPRINT_ID} status retrospective-done
```

Set `completedAt` on the sprint JSON.

## Step 5.5 — Update Cost Baselines

Use the Agent tool to compute rolling baselines across **all** sprints (not
just the current one):

1. List all subdirectories of `.forge/store/events/` — each is a sprint ID
   directory
2. Read all event JSON files from each subdirectory
3. Filter to events that have an `inputTokens` field defined
4. For each filtered event, join with its task record at
   `.forge/store/tasks/{taskId}.json` to obtain the task's `estimate` field
   (S/M/L/XL)
5. Group events by estimate tier. For each tier with at least one data point,
   compute the **median** of `inputTokens + outputTokens`
6. Compute the **median review overhead ratio** across all sprints:
   per-sprint review tokens / total tokens, then take the median
7. Count total data points used (`sampleSize`)
8. If at least one data point exists, write (or overwrite)
   `.forge/store/COST_BASELINES.json`:

```json
{
  "medianTokensPerEstimate": {
    "S": <number>,
    "M": <number>,
    "L": <number>,
    "XL": <number>
  },
  "medianReviewOverhead": <number>,
  "sampleSize": <integer>,
  "lastUpdated": "<ISO timestamp>"
}
```

Only include estimate tiers for which at least one data point exists. If no
token data exists across any sprint, skip writing the file entirely — do not
write an empty or zero-filled baseline.

**Note:** `.forge/store/COST_BASELINES.json` is a project-internal computed
artifact. If `.forge/store/` is gitignored, this file will also be gitignored.
Check `.gitignore` and inform the user if they want it persisted to version
control.

## Step 6 — Collate and Close

Run the collate command with purge:

```bash
FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)")
node "$FORGE_ROOT/tools/collate.cjs" {SPRINT_ID} --purge-events
```

This single deterministic step: generates `COST_REPORT.md` from all
accumulated events, then deletes `.forge/store/events/{SPRINT_ID}/`.
`COST_REPORT.md` is the durable record; the raw event files are not retained
after retrospective close.

Emit the tombstone event (written after the purge — the only event in the
directory going forward):

```
/forge:store emit {SPRINT_ID} '{"type":"retrospective-complete","sprintId":"{SPRINT_ID}","eventId":"{EVENT_ID}"}'
```

The `eventId` MUST be the one passed by the orchestrator. No exceptions.

## Step 7 — Token Reporting

Before returning, the workflow MUST complete these steps:

1. Run `/cost` to retrieve session token usage
2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`,
   `cacheWriteTokens`, `estimatedCostUSD`
3. Write the usage sidecar:

```
/forge:store emit {SPRINT_ID} '{"type":"token-usage","inputTokens":{N},"outputTokens":{N},"cacheReadTokens":{N},"cacheWriteTokens":{N},"estimatedCostUSD":{X}}' --sidecar
```