# FORGE-S07-T04: Refactor validate-store.cjs — remove embedded schemas and fix facade bypass

**Sprint:** FORGE-S07
**Estimate:** M
**Pipeline:** default

---

## Objective

Two related changes to `forge/tools/validate-store.cjs`:

1. **Schema-as-source-of-truth (R2):** Remove the embedded inline schema objects
   and replace them with runtime reads from `.forge/schemas/*.schema.json` (or
   `forge/schemas/*.schema.json` as fallback when running in-tree). When schema
   files are absent, fall back to a minimal built-in schema that enforces required
   fields only, and emit a stderr warning.

2. **Facade bypass fix (R7.3):** Replace direct access to `store.impl.storeRoot`
   (line 371) and `store.impl._readJson()` (line 378) with calls to the new
   `store.listEventFilenames(sprintId)` and `store.getEvent(id, sprintId)` methods
   added in T02.

## Acceptance Criteria

1. The embedded schema literals (the large JS objects currently inside validate-store.cjs)
   are removed entirely — no SCHEMA or SCHEMAS const with inline field definitions
2. At startup, validate-store.cjs reads `*.schema.json` from `.forge/schemas/` (project
   location); if not found, falls back to `{forgeRoot}/schemas/` (in-tree location)
3. When schema files are missing, validate-store.cjs emits a warning to stderr and
   uses a minimal fallback schema that only enforces `required` field presence
4. The event validation loop (Pass 2) no longer accesses `store.impl.storeRoot` or
   `store.impl._readJson()` — it uses `store.listEventFilenames(sprintId)` to iterate
   and `store.getEvent(id, sprintId)` to read each event record
5. The nullable-FK handling (e.g., allowing `null` taskId on sprint-level events) is
   preserved through the refactoring — BUG-004 fix must not regress
6. The `--fix` mode still works correctly (backfills, renames ghost files, etc.)
7. `node --check forge/tools/validate-store.cjs` passes
8. Running validate-store against the dogfooding store produces the same advisory
   summary as before (no new false errors introduced)

## Context

Requirements R2, R7.3, AC4, AC5.

The embedded schemas in validate-store.cjs were introduced in v0.6.1 when the tools
regenerate target was eliminated. They have since drifted from the standalone schema
files. This task restores the standalone files as the authority.

The `store.listEventFilenames(sprintId)` method added in T02 returns
`{ filename, id }` objects for all `.json` files in `events/{sprintId}/`. The
existing `store.getEvent(id, sprintId)` reads the event record. This is a drop-in
replacement for the current `store.impl._readJson(path.join(eventsDir, eventFile))` calls.

**Important:** The schema path resolution must handle both:
- In-project usage: `.forge/schemas/*.schema.json` (installed path)
- In-tree dogfooding: `forge/schemas/*.schema.json` (running from source)

## Plugin Artifacts Involved

- `forge/tools/validate-store.cjs` — remove embedded schemas, add runtime schema loading, fix event iteration

## Operational Impact

- **Version bump:** Required (included in T09)
- **Regeneration:** None required
- **Security scan:** Required (included in T09)
