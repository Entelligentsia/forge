# PLAN — FORGE-S07-T04: Refactor validate-store.cjs — remove embedded schemas and fix facade bypass

🌱 *Forge Engineer*

**Task:** FORGE-S07-T04
**Sprint:** FORGE-S07
**Estimate:** M

---

## Objective

Remove the embedded inline JSON schema objects from `validate-store.cjs` and replace them with runtime reads from the filesystem (`forge/schemas/` or `.forge/schemas/`), restoring the standalone schema files as the single source of truth. Simultaneously, replace the two remaining `store.impl.*` bypasses in the event validation loop with facade methods added in T02.

## Approach

Two independent but co-located changes:

**Part 1 — Schema-as-source-of-truth (R2):**
1. Delete the `SCHEMAS` const (lines 38-176, ~140 lines of inline JSON schema definitions).
2. Add a `loadSchemas()` function at module level that, for each entity type (`sprint`, `task`, `bug`, `event`, `feature`):
   - Tries `.forge/schemas/{type}.schema.json` first (project-installed copy).
   - Falls back to `forge/schemas/{type}.schema.json` (in-tree source, for dogfooding).
   - If neither file exists, builds a minimal schema from a hardcoded `MINIMAL_REQUIRED` map that only enforces required-field presence (no type/enum checks), and emits a stderr warning.
3. Replace all `SCHEMAS.{type}` references with `schemas.{type}` (the return value of `loadSchemas()`).

The `validateRecord()` function is unchanged -- it already works with any schema object that has `required` and `properties` keys. The minimal fallback schema has `required` populated and empty `properties`, so only required-field-presence is checked.

**Part 2 — Facade bypass fix (R7.3):**
1. Replace the event iteration loop (lines 368-428) that directly accesses `store.impl.storeRoot` and `store.impl._readJson()`:
   - `store.impl.storeRoot` + `fs.readdirSync()` → `store.listEventFilenames(sprintId)`.
   - `store.impl._readJson(path.join(eventsDir, eventFile))` → `store.getEvent(filename, sprintId)`.
2. Filter out `_`-prefixed ephemeral sidecars from the `listEventFilenames()` results (matching current behavior: `!f.startsWith('_')`).
3. The `filename` variable (used for backfill and rename logic) maps to `entry.id` from `listEventFilenames()`.

Both changes preserve all existing behavior: NULLABLE_FK handling, --fix backfill, ghost file rename, Pass 3 filesystem consistency checks.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/validate-store.cjs` | Remove `SCHEMAS` const; add `loadSchemas()` and `MINIMAL_REQUIRED`; replace `SCHEMAS.*` with `schemas.*`; replace `store.impl.storeRoot`/`store.impl._readJson()` with facade calls | Restore schema files as single source of truth; eliminate private impl access |

## Plugin Impact Assessment

- **Version bump required?** Yes — this is a material change to a tool in `forge/tools/`. However, the version bump is deferred to T09 per the sprint plan.
- **Migration entry required?** Yes — deferred to T09. The `regenerate` list will include `"schemas"` (users should run `/forge:update-tools` to refresh their `.forge/schemas/` from source).
- **Security scan required?** Yes — any change to `forge/` requires a scan. Deferred to T09.
- **Schema change?** No — the `forge/schemas/*.schema.json` files are unchanged. This task only changes how they are consumed.

## Testing Strategy

- Syntax check: `node --check forge/tools/validate-store.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run` — must produce the same error/warning summary as before (2 errors, same warnings).
- Manual smoke test: verify that removing `.forge/schemas/` temporarily causes stderr warnings and that validation still runs with the minimal fallback.

## Acceptance Criteria

- [ ] The `SCHEMAS` const with inline schema objects is removed entirely from `validate-store.cjs`
- [ ] `validate-store.cjs` reads `*.schema.json` from `.forge/schemas/` at startup; falls back to `forge/schemas/` if not found there
- [ ] When schema files are missing, a stderr warning is emitted and a minimal fallback schema enforces required-field presence only
- [ ] The event validation loop (Pass 2) uses `store.listEventFilenames(sprintId)` and `store.getEvent(id, sprintId)` — no access to `store.impl.storeRoot` or `store.impl._readJson()`
- [ ] Nullable-FK handling (BUG-004 fix) is preserved — `NULLABLE_FK` set and logic unchanged
- [ ] `--fix` mode backfill still works correctly
- [ ] `node --check forge/tools/validate-store.cjs` passes
- [ ] `node forge/tools/validate-store.cjs --dry-run` produces the same error/warning summary as before

## Operational Impact

- **Distribution:** Users who already have `.forge/schemas/` populated (via `/forge:init` or `/forge:update`) will see no behavioral change. Users whose `.forge/schemas/` is stale (missing newer fields like `goal`, `path`, `features` on sprint) will lose type-checking for those fields until they run `/forge:update-tools` — this is benign because `validateRecord` does not enforce `additionalProperties: false`.
- **Backwards compatibility:** Fully preserved. The minimal fallback ensures validate-store never crashes if schemas are absent.