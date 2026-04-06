# Meta-Workflow: Sprint Retrospective

## Purpose

Sprint closure: review what happened, extract learnings, update the
knowledge base, and improve workflows.

## Algorithm

### Step 1 — Load Sprint Data
- Read all task artifacts from the sprint (PLAN, PROGRESS, CODE_REVIEW)
- Read all events from .forge/store/events/{SPRINT_ID}/
- Read all bugs fixed during the sprint
- Read `COST_REPORT.md` from `engineering/sprints/{SPRINT_DIR}/` if it exists (pre-computed cost view from collate). If it does not exist, note that cost analysis will be skipped in Step 2 and Step 5.

### Step 2 — Analyse Patterns
- Review iteration counts (how many plan/code review loops per task)
- Identify recurring review feedback themes
- Identify recurring bug root cause categories
- Note any workflow friction points

#### Cost Analysis

If any events loaded in Step 1 have an `inputTokens` field, compute the following (otherwise skip this subsection entirely):

- **Total tokens:** sum of `inputTokens + outputTokens` across all events that have token data.
- **Total estimated cost:** sum of `estimatedCostUSD` across those events.
- **Per-task token totals:** group events by `taskId`, sum tokens per task, sort descending by total tokens (most expensive first).
- **Review overhead ratio:** sum of tokens for events where `role` is `review-plan`, `review-code`, or `approve` divided by total sprint tokens. Express as a percentage.
- **Baseline comparison:** if `.forge/store/COST_BASELINES.json` exists, load it and compare the current sprint's median tokens per estimate tier (S/M/L/XL) to the stored baseline medians. Flag any task whose total tokens exceed 2× the baseline for its estimate tier.

Gracefully skip all cost aggregation if no events have token fields.

### Step 3 — Knowledge Base Review
- Review all `[?]` writebacks from the sprint
- Confirm or remove each one
- Promote patterns that appeared 2+ times to the stack checklist

### Step 4 — Workflow Improvements
- If a workflow step consistently caused friction, propose an edit
- If a template section was consistently skipped, propose removal
- If a new check category emerged, propose addition

### Step 5 — Write Retrospective
- Sprint summary with metrics
- What went well
- What to improve
- Knowledge base updates made
- Workflow improvements proposed
- Include a "Cost Analysis" section using the data computed in Step 2. If token data was available, use the following structure:

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

### Step 5.5 — Update Cost Baselines

Compute rolling baselines across **all** sprints (not just the current one):

1. List all subdirectories of `.forge/store/events/` — each is a sprint ID directory.
2. Read all event JSON files from each subdirectory.
3. Filter to events that have an `inputTokens` field defined.
4. For each filtered event, join with its task record at `.forge/store/tasks/{taskId}.json` to obtain the task's `estimate` field (S/M/L/XL).
5. Group events by estimate tier. For each tier with at least one data point, compute the **median** of `inputTokens + outputTokens`.
6. Compute the **median review overhead ratio** across all sprints: for each sprint, compute review tokens / total tokens, then take the median of those per-sprint ratios (only sprints with token data).
7. Count total data points used (`sampleSize` = total event records with token data across all sprints).
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

**Note:** `.forge/store/COST_BASELINES.json` is a project-internal computed artifact. If the project's `.forge/store/` directory is gitignored, this file will also be gitignored. Check `.gitignore` and inform the user if they need to explicitly add `COST_BASELINES.json` to version control if they want it persisted.

### Step 6 — Collate
- Run collation to update all indexes

## Generation Instructions
- Reference the project's sprint artifact paths
- Reference the project's domain docs and stack checklist
- Include the project's workflow file paths for proposed edits
