# Retrospective — FORGE-S07: Store Custodian — Deterministic Store Gateway

**Sprint:** FORGE-S07
**Date:** 2026-04-15

---

## Sprint Summary

| Metric | Value |
|---|---|
| Tasks completed | 9/9 |
| Tasks carried over | 0 |
| Tasks abandoned | 0 |
| Version bumps shipped | 1 (0.8.10 → 0.9.0) |
| Bugs filed | 0 |
| Security scans run | 1 (scan-v0.9.0.md: SAFE, 0 critical, 2 carry-forward warnings) |

All 9 tasks completed and committed with zero escalations. The sprint delivered the full Store Custodian gateway: schema reconciliation, store facade extensions, facade bypass fixes, validate-store refactoring, the CLI tool itself, skill + tool spec, 16-workflow migration, migrate command update, and release engineering.

## Metrics

| Task | Plan Iterations | Code Review Iterations | Notes |
|---|---|---|---|
| T01 Schema reconciliation | 1 | 1 | First-try approval |
| T02 Store facade extension | 1 | 1 | First-try approval |
| T03 Collate facade fix | 1 | 1 | First-try approval |
| T04 Validate-store refactor | 1 | 1 | First-try approval |
| T05 Store custodian CLI | 1 | 2 | Code review revision: missing `--dry-run` |
| T06 Store custodian skill | 1 | 1 | Minor inline fix during review |
| T07 Workflow migration | 2 | 1 | Plan revision: 4 blocking items |
| T08 Command migration | 1 | 1 | First-try approval |
| T09 Release engineering | 1 | 1 | First-try approval |

**Revision loops:** 2 total — T05 code review (1 extra), T07 plan review (1 extra). Both resolved on second iteration.

## What Went Well

- **Clean sequential execution:** All 9 tasks committed in dependency order with no escalations or blocked tasks. The dependency graph was well-structured (T01/T02 foundational, T09 as capstone).
- **Batched release model:** Deferring version bump and security scan to T09 worked well. Every task T01-T08 correctly deferred these concerns, and T09 delivered a clean scan.
- **Schema reconciliation first (T01):** Starting with the schema change before the code that depends on it prevented integration issues. T04 (validate-store refactor) cleanly consumed the reconciled schemas.
- **Store CLI design (T05):** The custodian CLI enforcement of `additionalProperties: false` at write time closed a long-standing validation gap that validate-store could not enforce on read.
- **Status value corrections (T07):** The workflow migration surfaced three invalid sprint statuses and two invalid task statuses that would have been silently accepted by direct file writes but are now caught by the custodian's schema validation.

## What to Improve

- **`--dry-run` coverage is an afterthought:** T05's code review caught a missing `--dry-run` flag on write-capable commands. This is a recurring pattern — the stack checklist already has a `--dry-run` item under "Tools (CJS)" but it was still missed on first implementation. Consider making `--dry-run` a mandatory gate check in `review_code.md` rather than relying on the reviewer to notice its absence.
- **Plan quality for large-scope tasks:** T07 (XL estimate, 16 files) required a plan revision with 4 blocking items — invalid status values, missing `commit_hash` handling, missing `taskIds` update, and insufficient detail. The initial plan tried to cover too many files without verifying schema validity of the status values it was writing. For XL tasks, the plan phase should explicitly validate enum values against the schema before proposing them.
- **Token self-reporting (sidecar) not working:** No S07 event files contain `inputTokens`/`outputTokens` fields. The orchestrate_task workflow instructs subagents to run `/cost` and write a sidecar, but this step was consistently skipped across all 9 tasks. Cost analysis for this sprint is not possible.
- **Event timestamp inconsistencies:** Several T09 events have `endTimestamp` earlier than `startTimestamp`, and T08 has a `.md` extension on what should be a `.json` event file. These are minor but indicate the event emission logic needs hardening.

## Knowledge Base Updates

No architecture writebacks were produced during this sprint.

## Stack Checklist Changes

- **Added:** `additionalProperties: false` enforcement at custodian write time — the custodian CLI now rejects store writes that include fields not in the schema, closing a gap that validate-store could only check on read.
- **No removals.**

## Workflow Improvements

### 1. `--dry-run` gate in code review

The `review_code.md` workflow should include an explicit check: "If the modified file is a CLI tool or utility that performs writes, verify `--dry-run` is supported on all write-capable commands." This prevents the T05 pattern from recurring.

### 2. Plan-phase schema validation for enum values

When a plan proposes status transitions or field values, the plan template should require verification against the relevant `*.schema.json` enum. This would have caught the T07 invalid status values before they reached plan review.

### 3. Sidecar token reporting needs debugging

The `orchestrate_task.md` workflow's sidecar pattern (`/cost` → parse → write `_usage.json`) is not producing output. The instruction is present but subagents consistently skip it. This needs investigation — either the `/cost` command is unavailable in the subagent context or the instruction is being deprioritized.

## Bug Pattern Analysis

No bugs were filed during this sprint. The sprint was purely feature work.

## Cost Analysis

_No token data available for this sprint._

Sidecar token reporting did not produce data for any of the 66 events in FORGE-S07. The `inputTokens` and `outputTokens` fields are absent from all event files. The only token data in the store comes from FORGE-S01 and BUG-007 (6 events total, 186,600 tokens, $0.50).

## Recommendations for Next Sprint

- **Scope:** Investigate and fix the sidecar token reporting gap. Consider adding a validation check in the commit phase that the `_usage.json` sidecar was written. Address the event timestamp inconsistency (end before start). Consider promoting the remaining incomplete sprints (S02-S05) or closing them.
- **Focus:** Quality and correctness of the event pipeline — the store custodian is now the write gateway, so event data quality is critical for retrospectives and cost tracking.
- **Mode:** Sequential (the dependency structure of most sprints benefits from sequential execution, and S07 proved it works well).