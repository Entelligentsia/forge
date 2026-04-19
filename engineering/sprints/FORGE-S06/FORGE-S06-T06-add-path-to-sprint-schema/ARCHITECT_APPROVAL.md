# Architect Approval — FORGE-S06-T06

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

- **Version bump:** 0.7.5 to 0.7.6 (schema change is material)
- **Migration entry:** 0.7.5 to 0.7.6, `regenerate: []`, `breaking: false`, `manual: []`
- **Security scan:** `docs/security/scan-v0.7.6.md` present, verdict SAFE TO USE. One benign WARNING on check-update.js (expected outbound HTTPS for version checking).
- **User-facing impact:** After upgrading, `validate-store` will emit 6 WARN lines for existing sprints missing the `path` field. These are advisory only, do not affect exit code, and require no user action.

## Architectural Review

| Question | Answer |
|----------|--------|
| Backwards compatibility | Fully backward compatible. `path` is optional (not in `required` array). Existing sprint records without `path` emit a WARN line only, not an ERROR. No data loss or breakage on upgrade. |
| Migration correctness | `regenerate: []` is correct. The sprint schema is embedded in `validate-store.cjs` (shipped with the plugin), not user-regenerated. The standalone `sprint.schema.json` is copied during `/forge:init`, not regenerated. Users need only install the updated plugin. |
| Breaking change declaration | Not a breaking change. `"breaking": false`, `"manual": []` correctly set. |
| Update path integrity | This change does not affect `/forge:update`, `check-update.js`, or migration logic. The update path is unaffected. |
| Cross-cutting concerns | The `path` field on sprints enables slug-named directory resolution (downstream tasks T07, T08, T09). The `warn()` function pattern in `validate-store.cjs` is new but clean and consistent with the existing `err()` pattern. No other commands, hooks, tools, or workflows are affected. |
| Operational impact | No new installed artifacts, no new directories, no new disk-write sites. The only behavioral change is advisory WARN output in `validate-store` for sprints missing `path`. |
| Security posture | No new trust boundaries introduced. The change is purely local schema/validation logic. Security scan clean (SAFE TO USE). |

## Operational Notes

- **No regeneration required.** Schemas are embedded in validate-store.cjs and ship with the plugin install. Users do not need to run `/forge:regenerate` or `/forge:update` beyond installing the new plugin version.
- **WARN lines are expected.** After upgrading, users will see `WARN FORGE-SNN: missing optional field "path"` for each existing sprint. This is informational and will resolve as sprints are updated with `path` values (via T07 seed-store changes).
- **No manual steps required.**

## Follow-Up Items

1. `engineering/architecture/database.md` Sprint entity table should be updated to include the `path` field after this change ships.
2. Pre-existing embedded schema drift: `SCHEMAS.sprint` in validate-store.cjs has `goal` and `features` properties not present in the standalone `sprint.schema.json`. This should be reconciled in a future task.
3. The `warningsCount` variable is tracked but only printed when `errorsCount === 0`. A future enhancement could print the warning count in the error summary block too.