# FORGE-S11-T01: Fix event timestamps — store-cli.cjs zeros time component (#56)

**Sprint:** FORGE-S11
**Estimate:** S
**Pipeline:** default

---

## Objective

Event records in `.forge/store/events/` have date-only timestamps (e.g. `2026-04-20T00:00:00.000Z`) because `store-cli.cjs` uses `new Date().toISOString().split('T')[0]` (or equivalent) when writing `startTimestamp` and `endTimestamp`. This makes `durationMinutes` always compute to 0 and destroys intra-day event ordering.

Fix `store-cli.cjs` to write real full ISO 8601 timestamps with actual time-of-day.

## Acceptance Criteria

1. Event records written by `store-cli.cjs` have timestamps with non-zero time components (e.g. `2026-04-20T14:32:07.123Z`).
2. `durationMinutes` computed from start/end timestamps reflects actual elapsed time (non-zero when events are written seconds apart).
3. All existing passing tests still pass.
4. A new test in `forge/tools/__tests__/store-cli.test.cjs` confirms the timestamp has a non-zero time component (not just a date string).
5. `node --check forge/tools/store-cli.cjs` exits 0.

## Context

- GitHub issue: #56
- The bug is in `forge/tools/store-cli.cjs` — likely in a `timestamp()` helper or similar date-generation function.
- Write a failing test FIRST, then fix the code, then watch it pass. This is mandatory per CLAUDE.md.
- Run the full test suite before marking done: `node --test forge/tools/__tests__/*.test.cjs` — all 241 tests must pass.

## Plugin Artifacts Involved

- `forge/tools/store-cli.cjs` — primary fix
- `forge/tools/__tests__/store-cli.test.cjs` — new regression test

## Operational Impact

- **Version bump:** required (addressed in T08)
- **Regeneration:** users must run `/forge:update-tools` after installing (tools target)
- **Security scan:** required (addressed in T08)
