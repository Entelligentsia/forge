# Sprint Requirements — FORGE-S12

**Captured:** 2026-04-20
**Source:** sprint-intake (GitHub issues #60–#64, no Q&A)
**Feature:** FEAT-005 — Pipeline Reliability and Bug-Fix Workflow Hardening

---

## Goals

1. **Eliminate dead ends in Forge workflows** — every user-facing command path reaches a valid terminal state; no workflow step can be silently skipped or left unguarded.
2. **Ensure data integrity in store writes and records** — bug/sprint records carry real timestamps, cost data is capturable, and schema-violated writes halt the workflow instead of being ignored.
3. **Fix telemetry accuracy** — model discovery and calibration baseline initialization produce correct values, not hardcoded fallbacks.

## In Scope

### S12-T01: `/forge:calibrate` baseline auto-initialization [must-have] {#60}

When `calibrationBaseline` is absent from `.forge/config.json`, `/forge:calibrate` should compute the current `MASTER_INDEX.md` hash, gather completed sprint IDs, and write the initial baseline — then report "〇 Baseline established" and exit. This mirrors `/forge:init` Phase 5 behavior. The current dead end ("△ No calibration baseline found — run `/forge:init`") must be removed.

**Changes:** `forge/` (distributed). Requires version bump and migration entry.

**Acceptance criteria:**
- `/forge:calibrate` on a project with no `calibrationBaseline` writes the initial baseline and reports success
- `/forge:health` check 2 still detects a missing baseline and recommends calibration
- Running `/forge:calibrate` after `/forge:health` no longer produces a dead end
- Existing projects with a baseline are unaffected (no regression in drift detection)

---

### S12-T02: Fix-bug Finalize phase gate and collate bug-ID support [must-have] {#61}

Two related fixes:

1. **Add a Finalize phase gate** to `fix_bug.md` that checks for INDEX.md existence in the bug directory before allowing the workflow to mark the bug as `resolved`. Collate must succeed; the bug cannot close without it.
2. **Make `collate.cjs` accept bug IDs without `--purge-events`** — `collate.cjs HELLO-B02` should work identically to `collate.cjs HELLO-B02 --purge-events`. Bug IDs are a first-class argument, not a side effect of a flag.

**Changes:** `forge/` (distributed). Requires version bump and migration entry.

**Acceptance criteria:**
- Running the fix-bug workflow end-to-end produces INDEX.md and updates MASTER_INDEX.md — Finalize gate blocks otherwise
- `collate.cjs {BUG_ID}` processes that bug without requiring `--purge-events`
- `collate.cjs {BUG_ID} --purge-events` still works (backwards compatible)
- `collate.cjs` with no args still processes all bugs (existing behavior preserved)

---

### S12-T03: Real timestamps and programmatic cost capture for bug fixes [must-have] {#62}

Two related fixes:

1. **`store-cli.cjs write bug` auto-populates timestamp fields** with the current ISO datetime when the agent supplies a date-only value (matching `YYYY-MM-DD` pattern). All `T00:00:00Z` timestamps become real datetimes.
2. **Programmatic cost capture** — provide a `store-cli.cjs record-usage` subcommand (or equivalent) that agents can call to write token-usage sidecars, replacing the non-functional `/cost` instruction in the workflow. Collate's `--purge-events` should aggregate cost data from event files into the bug markdown artifact before purging.

**Changes:** `forge/` (distributed). Requires version bump and migration entry.

**Acceptance criteria:**
- Bug records written via `store-cli.cjs write bug` contain real ISO datetimes (not `T00:00:00Z`) even when the agent supplies a date-only string
- `store-cli.cjs record-usage` (or equivalent) writes a usage sidecar with token data that agents can call programmatically
- `collate.cjs --purge-events` aggregates cost data from event files into the bug markdown artifact before removing events
- Bug fix markdown artifacts contain a `## Cost Summary` section when cost data is available

---

### S12-T04: Sprint planning store-write verification loop [must-have] {#64}

Agents executing `architect_sprint_plan.md` must verify that every write to the Forge store succeeds. If a `PreToolUse` hook rejects a write due to a schema violation, the agent must:
1. Parse the error message for the specific field violation
2. Correct the JSON and retry the write
3. Halt all further progress in the workflow until the write is confirmed successful

This applies to all store-write operations in sprint planning and task orchestration workflows.

**Changes:** `forge/` (distributed — workflow instructions). Requires version bump and migration entry.

**Acceptance criteria:**
- When a schema violation rejects a task JSON write, the agent retries with corrected JSON instead of silently proceeding
- A sprint with invalid task JSONs cannot reach `planning` completion — the workflow halts at the write step
- Valid task writes succeed without extra retries (no performance regression)

---

### S12-T05: Deterministic model discovery for event records [nice-to-have] {#63}

Event records should capture the actual model being used, not a hardcoded or stale fallback. The current model discovery logic records `claude-opus-4-7` even when running on ollama/glm-5.1 or other non-Anthropic models.

**Changes:** `forge/` (distributed). Requires version bump if implemented.

**Acceptance criteria:**
- Event records reflect the model the session is actually running on
- Fallback to a reasonable default when model identity is unavailable, but never silently records an incorrect model name
- Works across Claude Code, ollama, and other model providers

## Out of Scope

- CI/CD pipeline changes or new test infrastructure
- Full rewrite of the event store schema
- Marketplace listing or distribution changes
- New LSP tools or MCP integrations
- Changes to `/forge:init` beyond the calibration baseline fix (T01)
- Multi-language support

## Nice-to-Have *(attempt if must-haves complete)*

- T05 (model discovery) — low priority, depends on platform API availability

## Constraints

- **Plugin compatibility:** Must not break projects on Forge v0.18.0+; migrations must cover all schema/behavior changes
- **Distribution:** All changes are in `forge/` (distributed to users) — every task requires a version bump, migration entry, and security scan
- **Dependencies:** Node.js built-ins only — no new npm packages
- **Regeneration:** Workflow changes (T02, T04) require users to run `/forge:update` to regenerate workflows after upgrading

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| collate bug-ID parsing conflicts with sprint-ID namespace | Low | Bug IDs have a different pattern (PROJECT-BNNN) vs sprint IDs (FORGE-SNN); disambiguate by pattern |
| store-cli timestamp auto-population breaks custom timestamp formats | Low | Only auto-fill when value matches `YYYY-MM-DD` pattern; pass through anything else unchanged |
| Model discovery API varies across Claude Code versions | Medium | Use defensive fallback; document which platform versions provide reliable model identity |
| Phase gate for Finalize adds friction to rapid bug-fix iteration | Low | Gate checks for INDEX.md existence only; collate is fast |

## Carry-Over from FORGE-S11

| Item | Status | Notes |
|---|---|---|
| Wave-parallel worktree path verification | Not started | Retrospective recommends fixing before using wave-parallel mode again; not in this sprint's scope |
| Terminal-state contract for subagents | Not started | Retrospective recommends adding explicit "drive to committed status" instruction; not in this sprint's scope |
| Token event emission coverage | Partial | S12-T03 addresses bug cost capture; sprint-level token emission not addressed |