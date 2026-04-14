# PLAN REVIEW — FORGE-S06-T06: Add `path` field to sprint schema

🌿 *Forge Supervisor*

**Task:** FORGE-S06-T06

---

**Verdict:** Approved

---

## Review Summary

The plan is correctly scoped and addresses all acceptance criteria from the task prompt. It correctly interprets the "required" phrasing in the task title as optional-with-warning, which is the right call given all 6 existing sprint records lack `path`. The two-file change is minimal and well-targeted.

## Feasibility

The approach is realistic. Both target files (`forge/schemas/sprint.schema.json` and `forge/tools/validate-store.cjs`) are correctly identified. The change is additive — adding an optional property and a non-fatal warning function — and carries minimal risk. Scope is appropriate for an S-sized task.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — schema change to `forge/schemas/sprint.schema.json` and `forge/tools/validate-store.cjs` is material per CLAUDE.md criteria.
- **Migration entry targets correct?** Yes — `regenerate: []` is correct because `validate-store.cjs` embeds its schemas (does not read from `.forge/schemas/`), so no user action is required. The source schema `sprint.schema.json` is also embedded and distributed with the plugin.
- **Security scan requirement acknowledged?** Yes — the plan explicitly states it is required.

## Security

No new risks. The change is a schema property addition and a validation warning. No Markdown content is introduced, no hooks are modified, no credential or network access is added.

## Architecture Alignment

- **`additionalProperties: false` preserved?** Yes — adding a property to the `properties` object does not affect the `additionalProperties: false` constraint. New `path` field will be accepted; everything else still rejected.
- **No-npm rule:** No new dependencies introduced. ✅
- **Path handling:** The plan does not introduce path construction logic (that is T07's concern). ✅
- **Embedded schema sync:** The plan correctly targets both the standalone schema and the embedded copy in `validate-store.cjs`. Pre-existing drift (`goal`, `features` in embedded but not in standalone) is out of scope for this task.

## Testing Strategy

The plan includes:
- `node --check forge/tools/validate-store.cjs` — ✅
- `node forge/tools/validate-store.cjs --dry-run` — ✅
- Manual verification that existing sprint records produce WARN (not ERROR) — ✅

This is adequate for the change. `node --check` validates syntax; `--dry-run` validates store integrity; manual check validates the warning behavior.

## Completeness

All five acceptance criteria from the task prompt are addressed:
1. ✅ `sprint.schema.json` includes `"path": { "type": "string" }`
2. ✅ Not in `required` array
3. ✅ Embedded `SCHEMAS.sprint` includes `"path"` property
4. ✅ WARN on missing `path` (not ERROR), exits 0
5. ✅ Syntax check + dry-run verification

---

## If Approved

### Advisory Notes

1. **`warn()` function design:** The plan mentions adding a `warn()` function. During implementation, ensure warnings are clearly distinguishable from errors (e.g., `WARN  FORGE-S01: missing optional field "path"`). Do not increment `errorsCount` — warnings should be informational only. Consider tracking `warningsCount` separately for reporting clarity.

2. **Documentation drift:** The `engineering/architecture/database.md` Sprint entity table does not list `path`. This should be updated after the schema change is committed, though it is not in scope for this task.

3. **Embedded schema drift:** The embedded `SCHEMAS.sprint` already has `goal` and `features` properties that are absent from the standalone `sprint.schema.json`. This pre-existing drift is out of scope but should be tracked for a future cleanup task.