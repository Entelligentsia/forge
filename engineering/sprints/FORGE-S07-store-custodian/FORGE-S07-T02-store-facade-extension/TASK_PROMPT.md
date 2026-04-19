# FORGE-S07-T02: Store facade extension — writeCollationState, purgeEvents, listEventFilenames

**Sprint:** FORGE-S07
**Estimate:** M
**Pipeline:** default

---

## Objective

Extend `forge/tools/store.cjs` with three new public methods on the `Store` class
(and the underlying `FSImpl` backend): `writeCollationState(data)`,
`readCollationState()`, `purgeEvents(sprintId)`, and `listEventFilenames(sprintId)`.
These are the facade operations currently bypassed by deterministic code (R7); adding
them here lets T03 and T04 close those bypasses cleanly.

## Acceptance Criteria

1. `Store` class exposes `writeCollationState(data)` — writes `COLLATION_STATE.json`
   to the store root via `_writeJson()`
2. `Store` class exposes `readCollationState()` — reads `COLLATION_STATE.json` from
   the store root via `_readJson()`; returns null if absent
3. `Store` class exposes `purgeEvents(sprintId, { dryRun: false } = {})` — deletes
   the entire `events/{sprintId}/` directory; dry-run mode returns the file list
   without deleting; guards that the resolved path stays within the events base directory
4. `Store` class exposes `listEventFilenames(sprintId)` — returns an array of
   `{ filename: string, id: string }` objects for all `.json` files (including
   `_`-prefixed sidecars) in `events/{sprintId}/`; returns `[]` if directory absent
5. All four methods are implemented directly on the `Store` class (not just FSImpl),
   matching the pattern of existing methods like `writeEvent()`
6. `node --check forge/tools/store.cjs` passes
7. No existing methods are modified or broken

## Context

This task implements requirements R7.1, R7.2, and R7.3 at the facade layer.

- **R7.1** (`writeCollationState` / `readCollationState`): collate.cjs currently writes
  `COLLATION_STATE.json` directly via `writeFile()` at line 509 of `collate.cjs`.
  The `readCollationState` is a natural companion and allows future tools to read state
  without bypassing the facade.

- **R7.2** (`purgeEvents`): collate.cjs currently uses `fs.rmSync(eventsDir, { recursive: true })`
  at line 532. The facade method should include the same safety guard (resolved path
  must stay within the `events/` base).

- **R7.3** (`listEventFilenames`): validate-store.cjs accesses `store.impl.storeRoot`
  (line 371) and `store.impl._readJson()` (line 378) to iterate event files. The new
  method exposes filename + id information without leaking implementation details.

## Plugin Artifacts Involved

- `forge/tools/store.cjs` — add four new public methods to the `Store` class

## Operational Impact

- **Version bump:** Required (included in T09)
- **Regeneration:** None required
- **Security scan:** Required (included in T09)
