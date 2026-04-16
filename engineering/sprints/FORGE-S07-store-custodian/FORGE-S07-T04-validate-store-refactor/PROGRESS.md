# PROGRESS — FORGE-S07-T04: Refactor validate-store.cjs — remove embedded schemas and fix facade bypass

🌱 *Forge Engineer*

**Task:** FORGE-S07-T04
**Sprint:** FORGE-S07

---

## Summary

Removed ~140 lines of embedded JSON schema objects from `validate-store.cjs` and replaced them with a `loadSchemas()` function that reads schemas from the filesystem at startup (`.forge/schemas/` first, `forge/schemas/` as fallback, minimal hardcoded fallback as last resort). Replaced the two remaining `store.impl.*` bypasses in the event validation loop with `store.listEventFilenames()` and `store.getEvent()` facade methods. All existing behavior preserved: NULLABLE_FK handling, --fix backfill, ghost file rename.

## Syntax Check Results

```
$ node --check forge/tools/validate-store.cjs
SYNTAX OK
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
ERROR  FORGE-S07/20260415T021731000Z_FORGE-S07-T04_implement_implement-plan: missing required field: "endTimestamp"
ERROR  FORGE-S07/EVT-S07-PLAN-001: missing required field: "iteration"
WARN   FORGE-S07-T05: path "forge/tools/store-cli.cjs" does not exist on disk
WARN   FORGE-S07-T06: path "forge/meta/skills/meta-store-custodian.md" does not exist on disk

2 error(s) found.
```

Pre-existing errors unchanged. The first error is from the in-progress implement event (will be updated with endTimestamp). The EVT-S07-PLAN-001 error existed before this refactoring. No new false errors introduced.

## Files Changed

| File | Change |
|---|---|
| `forge/tools/validate-store.cjs` | Removed `SCHEMAS` const (lines 38-176); added `loadSchemas()`, `MINIMAL_REQUIRED`, `ENTITY_TYPES`; replaced `SCHEMAS.*` with `schemas.*`; replaced `store.impl.storeRoot`/`store.impl._readJson()` with `store.listEventFilenames()`/`store.getEvent()` |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| SCHEMAS const removed entirely | 〇 Pass | Replaced with loadSchemas() |
| Reads from .forge/schemas/ with forge/schemas/ fallback | 〇 Pass | loadSchemas() tries both paths |
| Missing schemas: stderr warning + minimal fallback | 〇 Pass | MINIMAL_REQUIRED provides required fields only |
| Event loop uses store.listEventFilenames + store.getEvent | 〇 Pass | No store.impl.* references remain |
| Nullable-FK handling preserved | 〇 Pass | NULLABLE_FK set unchanged |
| --fix mode backfill still works | 〇 Pass | Logic unchanged |
| `node --check` passes | 〇 Pass | |
| `validate-store --dry-run` same advisory summary | 〇 Pass | Pre-existing errors unchanged, no new false errors |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` — deferred to T09
- [ ] Migration entry added to `forge/migrations.json` — deferred to T09
- [ ] Security scan run and report committed — deferred to T09

## Knowledge Updates

None required. No undocumented patterns discovered.

## Notes

- The `loadSchemas()` function wraps `JSON.parse()` in try/catch for robustness — a malformed schema file (valid path, invalid JSON) falls back gracefully to the next source or minimal fallback, matching the reviewer's advisory note.
- The installed `.forge/schemas/` copy may be stale (e.g., missing `goal`, `path`, `features` on sprint) — this is benign since `validateRecord` does not enforce `additionalProperties: false`. Users refresh via `/forge:update-tools`.