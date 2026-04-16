# Retrospective — FORGE-S01: Token Usage Tracking

**Sprint:** FORGE-S01
**Date:** 2026-04-05

---

## Sprint Summary

| Metric | Value |
|---|---|
| Tasks completed | 8/8 |
| Tasks carried over | 0 |
| Tasks abandoned | 0 |
| Version bumps shipped | 1 (0.3.15 → 0.4.0) |
| Bugs filed | 0 |
| Security scans run | 1 (SAFE TO USE) |
| Code review revisions | 1 (T04) |

## Metrics

| Task | Plan Iterations | Code Review Iterations | Estimate |
|---|---|---|---|
| FORGE-S01-T01 | 1 | 1 | S |
| FORGE-S01-T02 | 1 | 1 | S |
| FORGE-S01-T03 | 1 | 1 | M |
| FORGE-S01-T04 | 1 | 2 | M |
| FORGE-S01-T05 | 1 | 1 | L |
| FORGE-S01-T06 | 1 | 1 | M |
| FORGE-S01-T07 | 1 | 1 | S |
| FORGE-S01-T08 | 1 | 1 | S |

## What Went Well

- **Schema-first design worked.** T01 (event schema) as the foundation task with all others depending on it meant no schema drift or late-discovery type mismatches.
- **Dependency graph was clean.** The wave structure (T01 → T02-T05 → T06-T07 → T08) avoided merge conflicts in sequential mode and kept each task focused.
- **Only 1 code review revision across 8 tasks.** T04's revision was a legitimate catch: `process.on('uncaughtException', ...)` in a tool (where it masks bugs) vs. a hook (where it prevents user noise). The stack checklist already covered this but the distinction was subtle enough to slip through planning.
- **Deferred version bump to T08** reduced churn — no intermediate bumps or migration entries needed per-task.
- **Security scan discipline held.** Full scan completed before the release commit, report committed as a versioned artifact.

## What to Improve

- **Event quality from subagent orchestration.** 39 pre-existing store validation errors accumulated during the sprint — most are start events with null `endTimestamp`/`durationMinutes`, or events missing the `model` field. The orchestrator writes start events before spawning subagents but doesn't always pair them with properly populated complete events. This is a data quality issue in the orchestration workflow itself.
- **Token self-reporting is chicken-and-egg.** T03 implemented the sidecar merge pattern for token capture, but since the sprint runner was already executing without that capability, only 1 of 52 events has token data. Future sprints will benefit, but this sprint's cost data is minimal.
- **Inconsistent role casing in events.** Some events use `"Engineer"` (capitalized) while the schema and workflows use `"engineer"` (lowercase). The event schema should enforce lowercase with an enum constraint, or the emitters should normalize.
- **Sidecar filter convention divergence.** `collate.cjs` uses `f.startsWith('_')` while `estimate-usage.cjs` uses `f.includes('_sidecar')`. Should be aligned to the prefix convention documented in `engineering/architecture/database.md`.

## Knowledge Base Updates

| Document | Change |
|---|---|
| `engineering/architecture/database.md` | Added "Ephemeral Sidecar Files" section documenting `_{eventId}_usage.json` convention (T03) |
| `engineering/stack-checklist.md` | Added `toLocaleString()` ICU fallback check for CJS tools (T05) |

### Resolved `[?]` Items

- `engineering/architecture/processes.md`: `## No CI/CD [?]` — Confirmed by S01–S08 retrospectives as accurate observation. `[?]` marker removed on 2026-04-15.

## Stack Checklist Changes

- **Added:** `toLocaleString()` ICU fallback check — prompted by T05 code review noting that minimal Node.js ICU builds may not format numbers as expected.
- **No items removed.** All existing checklist items were triggered during the sprint.

## Workflow Improvements

No workflow file edits are proposed. The sprint ran smoothly with the current workflow definitions. The sidecar merge pattern (T03) and cost analysis additions (T06) are meta-workflow changes that will take effect after regeneration via `/forge:update`.

**Potential future improvement:** The orchestrator could pair start/complete events more reliably by using a single `emit_event` call after the subagent returns (with both timestamps) instead of emitting separate start and complete events.

## Bug Pattern Analysis

No bugs were filed during this sprint. The single code review revision (T04) was a convention enforcement issue, not a functional bug.

**Recurring data quality pattern:** Incomplete event records (missing `endTimestamp`, `durationMinutes`, `model`) suggest the orchestrator's event emission is fragile when subagents don't complete the expected lifecycle. This is a systemic issue worth addressing in a future sprint.

## Cost Analysis

| Metric | Value |
|---|---|
| Total input tokens | 3,150 |
| Total output tokens | 1,350 |
| Total estimated cost | $0.0135 |
| Review overhead ratio | 0.0% |

**Note:** Only 1 of 52 events carries token data (the T01 implement event with estimated tokens). The token self-reporting infrastructure (T03) was implemented during this sprint but was not active during execution. These numbers are not representative of actual sprint cost.

### Most Expensive Tasks

| Task | Total Tokens | Est. Cost USD | Source |
|---|---|---|---|
| FORGE-S01-T01 | 4,500 | $0.0135 | estimated |

### Baseline Comparison

_Baseline comparison omitted — no prior baseline data._

## Post-Sprint Store Repair (2026-04-15)

During the 0.8.10 → 0.9.2 Forge update, `/forge:store-repair` was run and applied the following fixes to FORGE-S01 events:

- **52 events cleaned:** Removed pre-schema legacy fields (`timestamp`, `agent`, `status`, `summary`, `output`, `commitHash`, `filesChanged`, `details`, `actor`) that were not part of the 0.9.2 event schema
- **Preserved schema-valid fields:** `verdict`, `notes`, `inputTokens`, `outputTokens`, `estimatedCostUSD` are now valid in 0.9.2 and were retained
- **Backfilled required fields:** `phase` (derived from role + action) and `iteration` (set to 1) added to all events
- **Token data migrated:** `tokenUsage.inputTokens`/`outputTokens` → `inputTokens`/`outputTokens` at schema level
- **T05 status corrected:** `implemented` → `committed` (was a stale store state; task was committed in git)
- **`[?]` marker resolved:** `engineering/architecture/processes.md` "No CI/CD [?]" → "No CI/CD" (confirmed by S01–S08 retrospectives)

After repair, `validate-store` reports 0 errors on FORGE-S01 events (8 remaining errors are the sprint `path` schema gap — see Entelligentsia/forge#38).

## Recommendations for Next Sprint

- **Scope:** Address the event data quality issues — normalize role casing, enforce start/complete event pairing in the orchestrator, and backfill the 39 malformed events from this sprint.
- **Focus:** Validate that the token self-reporting sidecar pattern actually works end-to-end now that the meta-workflow is in place. Run a small (2-3 task) sprint to confirm real token data flows through collation and into COST_REPORT.md.
- **Mode:** sequential (until parallel worktree support is tested)
