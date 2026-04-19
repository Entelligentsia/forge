# Architect Approval — FORGE-S06-T04

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

- **Version bump:** 0.7.3 → 0.7.4 — correct. This is a material change (bug fix in distributed tooling).
- **Migration entry:** 0.7.3 → 0.7.4 with `regenerate: []`, `breaking: false`. Correct — tools are copied on install, not generated from templates. Users do not need to run `/forge:update` after upgrading.
- **Security scan:** `docs/security/scan-v0.7.4.md` — SAFE TO USE. No critical findings.
- **User-facing impact:** Users who install 0.7.4 will automatically get the ghost-file fix. Running `validate-store --fix` on stores with legacy mismatched event filenames will clean them up (rename or backfill as appropriate).

## Operational Notes

- No new installed artifacts or directories.
- No regeneration required (`regenerate: []`).
- No manual steps required.
- The `/forge:update` flow is unaffected by this change.
- The `store.cjs` API gains one new method (`renameEvent`) on the public facade. This is additive and non-breaking.

## Follow-Up Items

1. **Legacy event cleanup:** The store contains ~19 mismatched event files from FORGE-S02/S04/S05. Running `validate-store --fix` would clean these up, but this should be done deliberately and not as part of this commit. Consider a one-time maintenance action after the sprint completes.
2. **validate-store ↔ FSImpl coupling:** The event loop in validate-store now accesses `store.impl.storeRoot` and `store.impl._readJson` directly. If the Store facade ever gains a non-filesystem backend, this coupling will need to be broken. Acceptable for now given the current architecture.
3. **Pre-existing validation errors:** 108 errors from legacy data (missing fields on old events). These are out of scope for this task but should be tracked as tech debt.