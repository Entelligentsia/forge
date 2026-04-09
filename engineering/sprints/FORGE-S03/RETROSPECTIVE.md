# Retrospective — FORGE-S03: Lean Migration Architecture

**Sprint:** FORGE-S03
**Date:** 2026-04-09

---

## Sprint Summary

| Metric | Value |
|---|---|
| Tasks completed | 3/3 |
| Tasks carried over | 0 |
| Tasks abandoned | 0 |
| Total tracked time | ~17 min (event timestamps) |
| Version bumps shipped | 1 (v0.6.1) |
| Bugs filed | 0 |
| Security scans run | 1 |

## Metrics

| Task | Plan Iterations | Code Review Iterations | Notes |
|---|---|---|---|
| FORGE-S03-T01 | 2 | 1 | Plan rejected once — `generate-tools.md` missed in first pass |
| FORGE-S03-T02 | 1 | 1 | Clean single-pass |
| FORGE-S03-T03 | 1 | 1 | Subagent returned early; sprint runner completed implementation |

## What Went Well

- **T02 single-pass execution.** The granular migration target format and `migrations.json` corrections went through plan → review → implement → commit with zero revisions. The task prompt was precise enough that the plan was immediately approvable.
- **T01 plan review process worked as designed.** The Supervisor correctly caught the missing `generate-tools.md` file in the first plan iteration. The revision was minimal and targeted, and the corrected plan passed immediately.
- **Security scan result.** 0 critical findings across 91 files. The embedded-schema change (T01) was specifically noted in the scan as reducing attack surface by removing an external file-read path.
- **Dependency isolation.** T01 and T02 correctly deferred the version bump and security scan to T03, keeping each task's scope clean and the release gate clearly owned by a single commit.

## What to Improve

- **T03 subagent early return.** The T03 subagent ran plan → review-plan, then returned the security scan report without completing implement → commit. The `run_sprint.md` workflow spawned the subagent and accepted its return, but the task was only at `plan-approved` on disk. The sprint runner had to detect this and re-spawn. On the second spawn the subagent re-ran the scan (duplicate work) and again returned early. The sprint runner ultimately completed T03 implementation inline.

  Root cause: subagents that produce large output (a full security scan report) appear to treat the output as a natural conversation terminus, even when the pipeline is not complete. The `orchestrate_task.md` subagent relies on the Engineer being instructed to continue; if the scan output consumes most of the context, the subagent may not have enough remaining context to proceed to the commit phase.

- **`sprint.schema.md` drift.** T01 discovered that `sprint.schema.md` JSON Schema block is missing the `goal` and `features` fields that the live store uses. This is a pre-existing gap, not introduced by this sprint, but it was surfaced and not fixed (out of scope for T01). It should be addressed in a follow-up.

- **`.forge/schemas/` orphaned artifact.** After v0.6.1, the `.forge/schemas/` directory in existing projects is an unused artifact (validate-store no longer reads from it). The `0.6.0→0.6.1` migration entry has `"regenerate": []` and no `"manual"` steps to inform users they can delete it. A cleanup note should have been added.

## Knowledge Base Updates

| Document | Change |
|---|---|
| `engineering/architecture/processes.md` | Pre-existing `[?]` marker on "No CI/CD" section — confirmed accurate, no change needed |
| `forge/meta/store-schema/sprint.schema.md` | Gap identified: missing `goal` and `features` fields — not fixed this sprint, flagged for follow-up |

## Stack Checklist Changes

- **Added:** When removing a tool's external file-read path (e.g. removing `.forge/schemas/` reads from `validate-store.cjs`), scan all `migrations.json` entries for references to the old regeneration target and strip or replace them in the same sprint — do not leave this as a dependency on a follow-up task. (This was the core correctness concern that motivated T02.)

## Workflow Improvements

### `run_sprint.md` — Add non-terminal task re-spawn guard

After each subagent returns, the sprint runner reads the task status from disk. Currently, if the status is not `committed` / `abandoned` / `escalated`, the workflow proceeds without re-spawning. This allowed T03 to silently stall at `plan-approved`.

**Proposed addition to Step 3 (Sequential Mode):**

```
task_status = read_task_status(task.taskId)
if task_status not in ["committed", "abandoned", "escalated"]:
  # Subagent returned without reaching a terminal state.
  # Re-spawn once with explicit resume instruction.
  spawn_subagent(
    prompt="Read `.forge/workflows/orchestrate_task.md` and follow it. "
           "Task ID: {task.taskId}. "
           "The task is currently at status '{task_status}' — resume from that phase. "
           "Do not re-run phases that are already complete. "
           "Also read `engineering/MASTER_INDEX.md` for project state.",
    description="Resume pipeline for {task.taskId} (was {task_status})",
    model="sonnet"
  )
  task_status = read_task_status(task.taskId)
  if task_status not in ["committed", "abandoned", "escalated"]:
    escalate("Task {task.taskId} did not reach terminal state after re-spawn.")
```

This adds one retry before escalation, which would have resolved the T03 situation automatically.

### `orchestrate_task.md` — Release-engineering tasks with large scan output

For tasks that include a security scan as a pipeline step (typically T-last in a sprint), the scan report should be written to disk immediately after the scan completes, before proceeding to the commit phase. This prevents the scan output from consuming context and stalling the pipeline.

The current workflow already instructs the Engineer to save the report before committing — but the instruction may get lost if the scan output is very large. Consider adding an explicit checkpoint: after writing the scan report, verify the file exists on disk before continuing to the approve/commit phase.

## Bug Pattern Analysis

No bugs filed this sprint.

## Cost Analysis

_No token data available for this sprint._

## Recommendations for Next Sprint

- **Scope:** Address the two remaining follow-up items from T01 — (1) update `sprint.schema.md` to include `goal` and `features` fields, and (2) remove the dead `FALLBACK` object from `validate-store.cjs`. Add a `"manual"` migration note for `.forge/schemas/` cleanup to a future release.
- **Focus:** Implement the `run_sprint.md` re-spawn guard (workflow improvement above) so release-engineering tasks no longer require manual sprint runner intervention.
- **Mode:** sequential
