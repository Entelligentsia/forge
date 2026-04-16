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

## Step 1 — Load Sprint Data

- Read all task artifacts from `engineering/sprints/{SPRINT_DIR}/` (PLAN, PROGRESS, PLAN_REVIEW, CODE_REVIEW, ARCHITECT_APPROVAL)
- Read all events from `.forge/store/events/{SPRINT_ID}/`
- Read sprint JSON from `.forge/store/sprints/FORGE-S{NN}.json`
- Read all bugs fixed during the sprint from `.forge/store/bugs/` (cross-reference `resolvedAt` against sprint window)
- Read `COST_REPORT.md` from `engineering/sprints/{SPRINT_DIR}/` if it exists (pre-computed cost view from collate). If it does not exist, note that cost analysis will be skipped in Step 2 and Step 5.

## Step 2 — Analyse Patterns

**Iteration counts:** How many plan-review and code-review loops per task? If >2 consistently, what was the root cause?

**Review themes:** What did the Supervisor flag repeatedly? (Missing security scan? Missing version bump? No-npm violations? Path hardcoding?) Any of these should become stack-checklist items.

**Version management:** Were all material changes correctly versioned? Any bumps that were missed, added late, or overcounted?

**Security scan compliance:** Were all `forge/` changes scanned before pushing? Were reports committed?

**Migration correctness:** Did any migration entry need correction after the fact? Any `regenerate` targets missed?

**Plugin-specific friction:** Were there any surprises with the Claude Code plugin API, hook execution, or tool distribution?

**Bug root causes:** If bugs were fixed, group by `rootCauseCategory` — are any categories recurring?

### Cost Analysis

If any events loaded in Step 1 have an `inputTokens` field, compute the following (otherwise skip this subsection entirely):

- **Total tokens:** sum of `inputTokens + outputTokens` across all events with token data.
- **Total estimated cost:** sum of `estimatedCostUSD` across those events.
- **Per-task token totals:** group events by `taskId`, sum tokens per task, sort descending.
- **Review overhead ratio:** sum of tokens for events where `role` is `review-plan`, `review-code`, or `approve` divided by total sprint tokens. Express as a percentage.
- **Baseline comparison:** if `.forge/store/COST_BASELINES.json` exists, load it and compare the current sprint's median tokens per estimate tier (S/M/L/XL) to the stored baseline medians. Flag any task whose total tokens exceed 2× the baseline for its tier.

Gracefully skip all cost aggregation if no events have token fields.

## Step 3 — Knowledge Base Review

- Review all `[?]` writebacks added to `engineering/architecture/` during the sprint — confirm or remove each
- Promote patterns that appeared 2+ times to `engineering/stack-checklist.md`
- If any new Forge-specific invariant was discovered (hook exit discipline, no-npm, path-from-config), ensure it is in the checklist

## Step 4 — Workflow Improvements

- If a workflow step consistently caused friction, propose a concrete edit to the relevant file in `.forge/workflows/`
- If a template section was consistently skipped, propose removing it
- If a new check category emerged, propose adding it to `review_plan.md` or `review_code.md`
- If a stack-checklist item was never triggered, consider removing it

## Step 5 — Write Retrospective

Write `RETROSPECTIVE.md` to `engineering/sprints/{SPRINT_DIR}/RETROSPECTIVE.md`
using `.forge/templates/RETROSPECTIVE_TEMPLATE.md`.

Sections:
- Sprint summary with metrics (tasks planned / committed / escalated)
- What went well
- What to improve
- Knowledge base updates made
- Workflow improvements proposed

Include a "Cost Analysis" section using the data computed in Step 2. If token data was available, use the following structure:

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

Update sprint JSON: set `status` to `retrospective-done`, set `completedAt`.

## Step 5.5 — Update Cost Baselines

Compute rolling baselines across **all** sprints (not just the current one):

1. List all subdirectories of `.forge/store/events/` — each is a sprint ID directory.
2. Read all event JSON files from each subdirectory.
3. Filter to events that have an `inputTokens` field defined.
4. For each filtered event, join with its task record at `.forge/store/tasks/{taskId}.json` to obtain the task's `estimate` field (S/M/L/XL).
5. Group events by estimate tier. For each tier with at least one data point, compute the **median** of `inputTokens + outputTokens`.
6. Compute the **median review overhead ratio** across all sprints: per-sprint review tokens / total tokens, then take the median.
7. Count total data points used (`sampleSize`).
8. If at least one data point exists, write (or overwrite) `.forge/store/COST_BASELINES.json`:

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

   Only include estimate tiers for which at least one data point exists. If no token data exists across any sprint, skip writing the file entirely — do not write an empty or zero-filled baseline.

**Note:** `.forge/store/COST_BASELINES.json` is a project-internal computed artifact. If `.forge/store/` is gitignored, this file will also be gitignored. Check `.gitignore` and inform the user if they want it persisted to version control.

## Step 6 — Collate

Run the runtime-read collate command:

```bash
FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)")
node "$FORGE_ROOT/tools/collate.cjs"
```

Or — since this repository is Forge itself — use the in-tree tool:

```bash
node forge/tools/collate.cjs
```

This updates `engineering/MASTER_INDEX.md` and all per-directory `INDEX.md` files with the final sprint state.
