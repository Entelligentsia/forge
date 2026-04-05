# PROGRESS — FORGE-S01-T06: Retrospective meta-workflow — cost analysis and baselines

**Task:** FORGE-S01-T06
**Sprint:** FORGE-S01

---

## Summary

Extended `forge/meta/workflows/meta-retrospective.md` with cost analysis instructions: Step 1 now loads `COST_REPORT.md`, Step 2 has a new "Cost Analysis" subsection covering total tokens/cost, per-task breakdown, review overhead ratio, and baseline comparison, Step 5 includes the Cost Analysis section template in the retrospective output, and a new Step 5.5 describes computing and writing rolling baselines to `.forge/store/COST_BASELINES.json`. The generated workflow `.forge/workflows/sprint_retrospective.md` was regenerated to match the updated meta-workflow. The RETROSPECTIVE_TEMPLATE.md was also extended with the Cost Analysis stub section.

## Syntax Check Results

```
N/A — no JS/CJS files were modified. Only Markdown files changed.
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
ERROR  .forge/store/events/FORGE-S01/2026-04-05T05:39:07.997Z_FORGE-S01-T01_plan_start.json: missing required field: "endTimestamp"
ERROR  .forge/store/events/FORGE-S01/2026-04-05T05:39:07.997Z_FORGE-S01-T01_plan_start.json: missing required field: "durationMinutes"
... (31 errors total — all pre-existing, present before this task, no regressions introduced)
```

Pre-existing store errors confirmed identical before and after this change. No schema files were modified in this task.

## Files Changed

| File | Change |
|---|---|
| `forge/meta/workflows/meta-retrospective.md` | Added cost-data loading to Step 1; added Cost Analysis subsection to Step 2; extended Step 5 with Cost Analysis section template; added new Step 5.5 for baseline computation and write |
| `.forge/workflows/sprint_retrospective.md` | Regenerated to reflect all updates from the meta-workflow |
| `.forge/templates/RETROSPECTIVE_TEMPLATE.md` | Added "Cost Analysis" stub section after "Bug Pattern Analysis" |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `forge/meta/workflows/meta-retrospective.md` Step 2 includes cost analysis | ✅ Pass | Total tokens/cost, most expensive tasks, review overhead ratio, baseline comparison |
| Step 5 instructs writing a "Cost Analysis" section in `RETROSPECTIVE.md` | ✅ Pass | Full section template included |
| New Step 5.5 exists after Step 5 with baseline computation instructions | ✅ Pass | Covers directory iteration, median computation, JSON write |
| `COST_BASELINES.json` schema matches spec | ✅ Pass | `medianTokensPerEstimate`, `medianReviewOverhead`, `sampleSize`, `lastUpdated` |
| Baselines computed across all sprints (not just current) | ✅ Pass | Step 5.5 iterates all `.forge/store/events/` subdirectories |
| Grace handling documented: skip if no token fields | ✅ Pass | Explicitly stated in Step 2 and Step 5.5 |
| `.forge/templates/RETROSPECTIVE_TEMPLATE.md` includes "Cost Analysis" stub | ✅ Pass | Added after Bug Pattern Analysis section |
| `.forge/workflows/sprint_retrospective.md` regenerated and matches meta-workflow | ✅ Pass | All new instructions present |
| `node forge/tools/validate-store.cjs --dry-run` exits 0 | ❌ Pre-existing failures | 31 pre-existing errors, none introduced by this task |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` (deferred to T08)
- [ ] Migration entry added to `forge/migrations.json` (deferred to T08)
- [ ] Security scan run and report committed — **REQUIRED before pushing** (`/security-watchdog:scan-plugin forge:forge --source-path forge/`); report to `docs/security/scan-v{VERSION}.md`. Bundled with T08.

## Knowledge Updates

No new architecture discoveries. No updates to `engineering/architecture/` or `engineering/stack-checklist.md` required.

## Notes

- The supervisor advisory notes from PLAN_REVIEW.md were all addressed:
  1. Step 5.5 explicitly instructs listing subdirectories of `.forge/store/events/` before iterating events — not a vague "read all events".
  2. A defensive note about `.forge/store/` gitignore is included in Step 5.5.
  3. The 2× threshold is implemented as specified; making it configurable is noted as a future iteration item.
- Version bump and security scan are deferred to T08 as planned.
