# FORGE-S01-T06: Retrospective meta-workflow — cost analysis and baselines

**Sprint:** FORGE-S01
**Estimate:** M
**Pipeline:** default

---

## Objective

Extend the retrospective meta-workflow to include cost analysis in sprint reviews
and create/update cost baselines for future comparison.

## Acceptance Criteria

1. `forge/meta/workflows/meta-retrospective.md` Step 2 (Analyse Patterns) includes:
   - Total token usage and estimated cost for the sprint
   - Most expensive tasks (sorted by total tokens)
   - Review overhead ratio (review-role tokens / total tokens)
   - Comparison to baselines from `.forge/store/COST_BASELINES.json` if it exists
2. Step 5 (Write Retrospective) includes a "Cost Analysis" section in the output
3. New Step (after Step 5, before Step 6): update `.forge/store/COST_BASELINES.json` with:
   - `medianTokensPerEstimate` — median total tokens grouped by task estimate size (S/M/L/XL)
   - `medianReviewOverhead` — median ratio of review tokens to total tokens
   - `sampleSize` — number of completed tasks with token data
   - `lastUpdated` — ISO timestamp
4. Baselines computed across all completed sprints with token data (not just current sprint)
5. Gracefully handles events without token fields (skip them in aggregation)

## Context

Depends on T05 (COST_REPORT.md — the retrospective reads it). The retrospective
already loads all events in Step 1 — extend that to aggregate token data.

Cost baselines are stored in `.forge/store/COST_BASELINES.json` (project-internal,
not distributed). The file is created on first retrospective and updated on each
subsequent one.

## Plugin Artifacts Involved

- `forge/meta/workflows/meta-retrospective.md` — the retrospective meta-definition

## Operational Impact

- **Version bump:** Required (bundled with T08)
- **Regeneration:** Users must regenerate workflows
- **Security scan:** Not required for this task alone
