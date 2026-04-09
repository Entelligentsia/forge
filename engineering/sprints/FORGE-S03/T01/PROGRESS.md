# PROGRESS — FORGE-S03-T01: Eliminate tools regenerate target and embed store schemas

🌱 *Forge Engineer*

**Task:** FORGE-S03-T01
**Sprint:** FORGE-S03

---

## Summary

All five JSON schemas were embedded as a top-level `SCHEMAS` constant in `validate-store.cjs`. The `loadSchema()` function, `schemasPath` variable, the `schemas` object, and the `missingSchemas` warning block were removed. All four `validateRecord()` call sites updated from `schemas.*` to `SCHEMAS.*`. The `tools` category was removed from `regenerate.md`, all `tools` regeneration target references removed from `update.md`, Phase 8 in `sdlc-init.md` updated with a note, Step 2 removed from `generate-tools.md`, and all five `forge/meta/store-schema/*.md` files reframed. The `feature.schema.md` file received a new `## JSON Schema` section (it previously had none).

Discovery: the sprint schema in the markdown file was missing `goal` and `features` fields that are used in this project's sprint records. The embedded `SCHEMAS.sprint` includes these fields (sourced from the actual store records), and `additionalProperties: false` is enforced. The markdown schema block in `sprint.schema.md` is left as-is (it is the published API surface; those fields were added via writeback and not backported to the md). This is flagged for T02/T03 awareness but does not affect validation since the embedded schema has the correct fields.

## Syntax Check Results

```
$ node --check forge/tools/validate-store.cjs
exit: 0
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (6 sprint(s), 21 task(s), 6 bug(s)).
exit: 0

$ node forge/tools/validate-store.cjs
Store validation passed (6 sprint(s), 21 task(s), 6 bug(s)).
exit: 0
```

Smoke test (without `.forge/schemas/`):
```
$ mv .forge/schemas .forge/schemas.bak && node forge/tools/validate-store.cjs --dry-run
Store validation passed (6 sprint(s), 21 task(s), 6 bug(s)).
exit: 0
(then restored .forge/schemas)
```

## Files Changed

| File | Change |
|---|---|
| `forge/tools/validate-store.cjs` | Added `SCHEMAS` constant with all 5 embedded schemas; removed `loadSchema()`, `schemasPath`, `schemas` object, `missingSchemas` warning; updated all 4 `validateRecord()` calls to use `SCHEMAS.*` |
| `forge/init/sdlc-init.md` | Phase 8 output updated to remove `.forge/schemas/`; added one-line note that schema validation is internal to `validate-store.cjs` |
| `forge/init/generation/generate-tools.md` | Removed Step 2 (schema copy); updated Purpose, Inputs, Outputs sections; renumbered Step 3 → Step 2 |
| `forge/commands/regenerate.md` | Removed `tools` from arguments list; removed `## Category: tools` section |
| `forge/commands/update.md` | Replaced 2 occurrences of `/forge:regenerate workflows tools` with `/forge:regenerate workflows`; removed `tools,` from Step 4 non-knowledge-base targets sentence |
| `forge/meta/store-schema/task.schema.md` | Reframed JSON Schema section intro |
| `forge/meta/store-schema/sprint.schema.md` | Reframed JSON Schema section intro |
| `forge/meta/store-schema/bug.schema.md` | Reframed JSON Schema section intro |
| `forge/meta/store-schema/event.schema.md` | Reframed JSON Schema section intro |
| `forge/meta/store-schema/feature.schema.md` | Added `## JSON Schema` section with canonical block (section was absent) |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| validate-store passes without `.forge/schemas/` | 〇 Pass | Smoke tested |
| `node --check forge/tools/validate-store.cjs` exits 0 | 〇 Pass | |
| `node forge/tools/validate-store.cjs` on this repo exits 0 | 〇 Pass | |
| `forge/commands/init.md` Phase 8 ref removed | 〇 Pass | Phase 8 updated in `sdlc-init.md` (the actual location) |
| `forge/commands/regenerate.md` no `tools` category | 〇 Pass | Section and argument row removed |
| `forge/commands/update.md` no `tools` as regeneration target | 〇 Pass | 3 references removed/updated |
| All five `*.schema.md` files reframed | 〇 Pass | `feature.schema.md` also received new JSON Schema section |
| `node --check` passes on all modified JS/CJS files | 〇 Pass | |

## Plugin Checklist

- [x] Version bump: not required — deferred to T03
- [x] Migration entry: not required — deferred to T03
- [x] Security scan: required (forge/ modified) — deferred to T03 per task spec

## Knowledge Updates

Discovery: `sprint.schema.md` JSON Schema block was missing `goal` and `features` fields that the Forge project itself uses. The embedded `SCHEMAS.sprint` was sourced directly from the live sprint records and includes these fields. The markdown schema doc block was not updated (scope of this task is limited to reframing the intro sentence, not expanding the schema block). The discrepancy between `sprint.schema.md` JSON block and the actual schema is a pre-existing gap — no new gap was introduced.

## Notes

No deviations from PLAN.md. The `feature.schema.md` JSON Schema block was sourced from `forge/schemas/feature.schema.json` as planned. The `FALLBACK` object remains in `validate-store.cjs` as a dead-code safety net per advisory note from the plan review.
