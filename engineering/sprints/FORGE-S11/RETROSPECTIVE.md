# Retrospective — FORGE-S11: Tech Debt: Pipeline Bug Fixes, Command Gaps, and UX Completeness

**Sprint:** FORGE-S11
**Date:** 2026-04-20

---

## Sprint Summary

| Metric | Value |
|---|---|
| Tasks completed | 9/9 |
| Tasks carried over | 0 |
| Tasks abandoned | 0 |
| Total tracked time | ~10h (estimated) |
| Version bumps shipped | 2 (v0.20.0, v0.21.0) |
| Bugs filed | 0 |
| Security scans run | 2 |

## Metrics

| Task | Plan Iterations | Code Review Iterations | Notes |
|---|---|---|---|
| T01 | 1 | 0 (Wave 1 wrote code; merged directly) | Timestamps fix |
| T02 | 1 | 2 (Wave 1 false run; re-run sequential) | Preflight gate |
| T03 | 1 | 1 | Model fallback |
| T04 | 1 | 1 | Collate links |
| T05 | 1 | 1 | calibrationBaseline |
| T06 | 1 | 1 | quiz-agent command |
| T07 | 1 | 1 | generate-commands |
| T08 | — | — | Release engineering (no plan phase) |
| T09 | 1 | 1 | Structured Results |

## What Went Well

- **Complete delivery:** All 9 tasks committed, including the XL nice-to-have (T09). Zero carried-over work.
- **TDD discipline held:** Every CJS change was preceded by failing tests. The 504→526 test count increase is clean and attributable.
- **Security scan compliance:** Both v0.20.0 and v0.21.0 scans run and committed. Reports filed in `docs/security/`.
- **T05/T06 wave-parallel success:** These two tasks correctly isolated their changes in worktrees and committed cleanly, demonstrating the pattern works when paths are correct.
- **T09 scope right-sizing:** Prior analysis called this XL; the actual scope was much narrower (two functions, one new lib file). The agent correctly assessed and delivered it without over-engineering.
- **Advisory notes captured in CODE_REVIEW.md:** Minor issues (trailing newline, fallback scan behaviour) were logged non-blocking rather than requiring rework.

## What to Improve

### Critical: wave-parallel worktree path mismatch

The sprint runner provided incorrect worktree paths to Wave 1 subagents (`/home/boni/worktrees/` instead of `/home/boni/src/worktrees/`). Four of six Wave 1 agents fell back to the main repo working directory. This caused:
- T01 code changes to land in the main repo (uncommitted), requiring manual intervention
- T02 Wave 1 to report false success — no code changes persisted anywhere
- T03/T04 to only complete the plan phase before stopping

**Fix:** In `run_sprint.md`, add a pre-spawn step that verifies actual worktree paths using `git worktree list --porcelain` and injects the confirmed `path` field into each subagent prompt rather than constructing it from a pattern.

### Moderate: agents stopping at plan phase

Three Wave 1 agents (T01, T03, T04) stopped after writing `PLAN.md` without advancing through `review-plan → implement → ...`. The subagent prompt in `run_sprint.md` says "Read `orchestrate_task.md` and follow it" but agents can interpret their mandate as completing just the first deliverable they see (the plan). 

**Fix:** Add an explicit instruction to the `run_sprint.md` subagent prompt: "Drive through all phases to `committed` status. Do not return until the task status on disk is `committed`, `abandoned`, or `escalated`."

### Minor: T02 false success report in Wave 1

The T02 Wave 1 agent returned claiming 503 tests passed and files were modified, but no changes were applied to disk. The re-spawn loop correctly caught this (non-terminal status), but the root cause was the agent writing to a non-existent path and treating the write as a no-op without error.

**Fix:** The sprint runner's post-agent check (already in the workflow) should be treated as the authoritative gate. Agent summaries are informational only.

### Minor: duplicate task directory

Collation created two directories for T06: `FORGE-S11-T06-quiz-agent-command` (from the Wave 1 agent's engineering artifacts, written to main repo) and `FORGE-S11-T06-create-quiz-agent-command` (from the T06 worktree agent). Both were merged. A post-sprint cleanup pass removed the duplicate.

## Knowledge Base Updates

| Document | Change |
|---|---|
| `engineering/stack-checklist.md` | Added `resolveTaskDir` / `estimateTokens` Result pattern item (see below) |
| `engineering/stack-checklist.md` | Added `preflight-gate --workflow` flag reminder |

## Stack Checklist Changes

- **Added:** `resolveTaskDir` and `estimateTokens` now return `{ ok, value }` / `{ ok: false, code, message }` Result objects (from `forge/tools/lib/result.js`). Any caller must check `.ok` before accessing `.value`. (T09)
- **Added:** When invoking `preflight-gate.cjs` from a workflow, pass `--workflow <filename>` so the correct gate is loaded rather than the alphabetically-first match. (T02)
- **No removals** — all existing items triggered at least once in this sprint.

## Workflow Improvements

### `run_sprint.md` — wave-parallel: verify worktree paths before spawn

Add after `git worktree add ../worktrees/{TASK_ID} HEAD`:

```bash
# Verify actual path before injecting into subagent prompt
actual_path=$(git worktree list --porcelain | grep "worktree.*{TASK_ID}" | awk '{print $2}')
```

Use `actual_path` in the subagent prompt rather than constructing a pattern.

### `run_sprint.md` — strengthen subagent terminal-state contract

Change the subagent prompt template from:

> "Read `.forge/workflows/orchestrate_task.md` and follow it."

To:

> "Read `.forge/workflows/orchestrate_task.md` and follow it. **Drive through all phases to `committed` status.** Do not return until `.forge/store/tasks/{TASK_ID}.json` shows status `committed`, `abandoned`, or `escalated`."

## Bug Pattern Analysis

No new bugs filed this sprint. All work was resolving existing filed bugs (T01→#56, T02→#58/#59, T03→#57, T04→#53, T05→#55, T06→#50, T07→#48/#50).

**Recurring root cause category across S11 bugs:** `missing-invariant` — most bugs arose from a path, assumption, or initialization order that was correct in the primary flow but missed in an edge case (fast-mode bypass, alphabetical scan, TDZ ordering). The fix in each case added an explicit guard or parameter that makes the happy-path invariant hold universally.

## Cost Analysis

| Metric | Value |
|---|---|
| Total input tokens | 28,000 |
| Total output tokens | 2,100 |
| Total estimated cost | $0.09 |
| Review overhead ratio | 100% (only event is review-code for T02) |

Only one event in `.forge/store/events/FORGE-S11/` carries token data — the T02 `review-code` phase (estimated at 28,000 input / 2,100 output tokens). Remaining phases emitted events without token fields; the COST_REPORT `(unknown)` row reflects this gap. The `$0.09` figure is a severe undercount of actual sprint cost.

### Most Expensive Tasks (from available data)

| Task | Total Tokens | Est. Cost USD | Source |
|---|---|---|---|
| T02 (review-code phase only) | 30,100 | $0.09 | estimated |

### Baseline Comparison

_Baseline data exists only for estimate tier S (1 sample, 4,500 tokens median). T02 is tier M; no prior M baseline exists for comparison. T09 (XL) and most S-tier tasks in this sprint have no token events, so per-tier medians cannot be computed._

## Recommendations for Next Sprint

- **Scope:** Address the wave-parallel runner improvements (worktree path verification, terminal-state contract) as the first task of any sprint that uses `wave-parallel` mode — or switch to `sequential` mode until the runner is hardened.
- **Focus:** Token event emission coverage — most phases emitted no token data this sprint, making cost analysis unreliable. Ensure event files include `inputTokens`/`outputTokens` when available.
- **Mode:** `sequential` until `run_sprint.md` wave-parallel path verification is fixed.
