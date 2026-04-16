# Architect Approval — FORGE-S06-T07

*Forge Architect*

**Status:** Approved

## Architectural Review

- **Backwards compatibility:** Maintained. Legacy bare-ID directories (`S01/`, `T01/`, `B01/`) are still discovered via fallback regexes. The sprint `path` field is optional in the schema (added in T06), so existing stores without it are valid. No breaking changes.

- **Migration correctness:** `regenerate: []` is correct. This change only affects `seed-store.cjs`, which is a bootstrap tool run via `/forge:init` or manually. No generated workflows, commands, or tools need to be regenerated. Users do not need to take any manual action after upgrading.

- **Update path:** This change does not affect `/forge:update` itself. The `check-update.js` hook is unaffected. The change only impacts directory discovery in `seed-store.cjs`, which runs during init, not during update.

- **Cross-cutting concerns:** The `deriveSlug()` function is defined but not yet called by any other tool. It is an API surface for future use by sprint-intake or other tools that create directories. No current tool depends on it. The `collate.cjs` and `validate-store.cjs` tools have their own directory discovery logic and will be updated in T08 and T09 respectively.

- **Operational impact:** No new installed artifacts. No new directories. One additional write site: sprint `path` field populated during seed-store execution. This is a pre-existing schema field that was previously not populated by seed-store.

- **Security posture:** Security scan report present at `docs/security/scan-v0.7.8.md`, verdict: SAFE TO USE. No new trust boundaries. The prefix is properly escaped before regex construction. No network calls, no credential access, no untrusted input paths beyond filesystem directory names.

## Distribution Notes

Version bumped 0.7.7 -> 0.7.8. Migration entry added with `regenerate: []` and `breaking: false`. No user action required after upgrade — the change affects only how seed-store discovers existing directories, and existing stores are not broken by the fallback logic.

## Operational Notes

No regeneration required. Users who re-run `/forge:init` or `node forge/tools/seed-store.cjs` will get the `path` field populated on sprints and correct task IDs for T10+ directories. This is a non-destructive enhancement.

## Follow-Up Items

1. **`deriveSlug()` should be exported or moved to a shared utility** — currently defined as an internal function in seed-store.cjs. Sprint-intake and other tools that create directories will need it. Consider adding `module.exports.deriveSlug = deriveSlug` or extracting to a shared utility module in a future task.

2. **Bug ID padding inconsistency** — seed-store uses `padStart(2, '0')` producing `FORGE-BUG-01`, while actual bug directories use 3-digit `BUG-001` format. This is cosmetic (the store records are consistent at 2 digits) but should be aligned in a future cleanup task.

3. **T08 and T09** — `collate.cjs` and `validate-store.cjs` have their own directory discovery logic that will need similar slug-aware updates. This is correctly scoped in separate tasks (FORGE-S06-T08 and FORGE-S06-T09).