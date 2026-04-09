# Architect Approval — FORGE-S03-T01

⛰️ *Forge Architect*

**Status:** Approved

## Distribution Notes

- **Version bump:** Deferred to T03. Changes in T01 are intermediate — not yet released.
- **Migration entry:** None for T01. T03 will add the 0.6.0 → 0.6.1 migration entry.
- **Security scan:** Deferred to T03. T03 is the gate task before any distribution occurs. No security surface added by T01.
- **User-facing impact:** After the T03 release, users who run `/forge:update` will get the updated `validate-store.cjs` which no longer reads `.forge/schemas/`. The `.forge/schemas/` directory in existing projects becomes an unused artifact — users can delete it. T03's migration notes should document this.

## Operational Notes

- The `tools` target in `/forge:regenerate` is removed. Users who had `tools` bookmarked or scripted will encounter a missing handler. This is correct — the target was vestigial.
- **Cross-cutting concern (T02 dependency):** Existing migration entries in `forge/migrations.json` include `"tools"` in their `regenerate` arrays (13 entries). Users upgrading from pre-0.6.1 versions who pass through these migration steps will attempt `/forge:regenerate tools` which no longer has a handler. T02 ("Introduce granular migration target format") must address this before T03 bumps the version. T01's commit is safe in isolation because it has no migration entry yet; the concern only materialises when T03 ships the version.
- No new disk-write sites or directories introduced by this change.

## Follow-Up Items

1. **T02:** Fix the granular migration target format — specifically, ensure old migration entries with `"tools"` in `regenerate` are handled gracefully (either via a no-op handler, a deprecation notice, or a data migration of old entries).
2. **T03:** Migration notes should mention that `.forge/schemas/` is now orphaned in existing projects and can be safely deleted.
3. **Future:** The `FALLBACK` object in `validate-store.cjs` is now dead code. Schedule removal in a future cleanup sprint.
4. **Future:** The `sprint.schema.md` JSON Schema block is missing `goal` and `features` fields that the real store uses. This discrepancy should be corrected.
