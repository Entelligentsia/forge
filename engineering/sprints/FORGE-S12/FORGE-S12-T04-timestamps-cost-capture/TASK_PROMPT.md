# FORGE-S12-T04: Store-cli timestamp auto-population + record-usage + collate cost aggregation

**Sprint:** FORGE-S12
**Estimate:** L
**Pipeline:** default

---

## Objective

Three related tool-layer fixes for data integrity in bug-fix workflows:

1. **Timestamp auto-population:** `store-cli.cjs write bug` auto-populates timestamp fields with the current ISO datetime when the agent supplies a date-only value (matching `YYYY-MM-DD` pattern). All `T00:00:00Z` timestamps become real datetimes.
2. **Programmatic cost capture:** Provide a `store-cli.cjs record-usage` subcommand that agents can call to write token-usage sidecars, replacing the non-functional `/cost` instruction in the workflow.
3. **Collate cost aggregation:** Collate's `--purge-events` should aggregate cost data from event files into the bug markdown artifact before purging. Bug fix markdown artifacts should contain a `## Cost Summary` section when cost data is available.

## Acceptance Criteria

1. Bug records written via `store-cli.cjs write bug` contain real ISO datetimes (not `T00:00:00Z`) even when the agent supplies a date-only string
2. Only date-only values matching `YYYY-MM-DD` pattern are auto-populated; other formats pass through unchanged
3. `store-cli.cjs record-usage` writes a usage sidecar with token data that agents can call programmatically
4. `collate.cjs --purge-events` aggregates cost data from event files into the bug markdown artifact before removing events
5. Bug fix markdown artifacts contain a `## Cost Summary` section when cost data is available
6. `node --check` passes on all modified CJS files
7. All existing tests pass, plus new tests for timestamp auto-population, record-usage, and cost aggregation: `node --test forge/tools/__tests__/*.test.cjs`

## Context

- GitHub issue #62 — Real timestamps and programmatic cost capture
- `forge/tools/store-cli.cjs` — store custodian CLI (31.5 KB), already has `_isZeroedTimestamp()` and `_normalizeEventTimestamps()` for event timestamps (S11-T01 fix). This task extends the same logic to bug `reportedAt` and `resolvedAt` fields.
- `forge/tools/collate.cjs` — collation tool; T03 (bug-ID first-class argument) must land first
- `forge/schemas/event-sidecar.schema.json` — sidecar schema already supports `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`, `model`, `tokenSource`
- Bug records have `reportedAt` and `resolvedAt` fields in `forge/schemas/bug.schema.json`
- The fix-bug workflow's `/cost` instruction is non-functional — agents have no way to programmatically record token usage
- S11 retrospective: "Token event emission coverage — most phases emitted no token data this sprint, making cost analysis unreliable"

## Plugin Artifacts Involved

- `forge/tools/store-cli.cjs` — timestamp auto-population + record-usage subcommand (tool layer)
- `forge/tools/collate.cjs` — cost aggregation on purge-events (tool layer)
- `forge/tools/__tests__/store-cli.test.cjs` — new/updated tests
- `forge/tools/__tests__/collate.test.cjs` — new/updated tests

## Operational Impact

- **Version bump:** Required — changes distributed tool behavior and adds new subcommand
- **Regeneration:** Users must run `/forge:update` to get updated tools
- **Security scan:** Required — changes `forge/`

## Plan Template

Follow `.forge/templates/PLAN_TEMPLATE.md` for the plan phase.