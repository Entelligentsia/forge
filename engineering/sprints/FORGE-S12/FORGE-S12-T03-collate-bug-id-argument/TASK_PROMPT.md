# FORGE-S12-T03: Collate bug-ID first-class argument — no --purge-events required

**Sprint:** FORGE-S12
**Estimate:** M
**Pipeline:** default

---

## Objective

Make `collate.cjs` accept bug IDs as a first-class positional argument. Currently, `collate.cjs HELLO-B02` does nothing — you must pass `--purge-events` as well. Bug IDs should be a first-class argument, not a side effect of a flag. `collate.cjs {BUG_ID}` should work identically to `collate.cjs {BUG_ID} --purge-events` when the ID matches a bug pattern (`PROJECT-BNNN`).

## Acceptance Criteria

1. `collate.cjs {BUG_ID}` processes that bug without requiring `--purge-events` — generates INDEX.md and purges events
2. `collate.cjs {BUG_ID} --purge-events` still works (backwards compatible)
3. `collate.cjs` with no args still processes all bugs (existing behavior preserved)
4. Bug IDs are disambiguated from sprint IDs by pattern: `{PREFIX}-B{NNN}` = bug, `FORGE-S{NNN}` = sprint
5. `node --check` passes on collate.cjs
6. All existing tests pass, plus new tests for the bug-ID argument behavior: `node --test forge/tools/__tests__/*.test.cjs`

## Context

- GitHub issue #61 — collate bug-ID support (paired with T02's Finalize gate)
- `forge/tools/collate.cjs` — the collation tool (29.6 KB)
- Bug IDs follow pattern `{PROJECT_PREFIX}-B{NNN}` (e.g., `FORGE-BUG-001`, `HELLO-B02`)
- Sprint IDs follow pattern `FORGE-S{NNN}`
- Current arg parsing treats positional args as sprint IDs; bug IDs are only processed if `--purge-events` is also passed
- The `--purge-events` flag currently triggers event deletion for the given sprint/bug ID
- T04 (cost aggregation) will also modify collate.cjs — T03 must land first

## Plugin Artifacts Involved

- `forge/tools/collate.cjs` — primary change (tool layer)
- `forge/tools/__tests__/collate.test.cjs` — new/updated tests

## Operational Impact

- **Version bump:** Required — changes distributed tool behavior
- **Regeneration:** Users must run `/forge:update` to get updated tools
- **Security scan:** Required — changes `forge/`

## Plan Template

Follow `.forge/templates/PLAN_TEMPLATE.md` for the plan phase.