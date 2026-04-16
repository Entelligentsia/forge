# Architect Approval — FORGE-S09-T02

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

**Version bump:** Deferred to T09 (expected 0.9.4). Sprint convention: the final release-engineering task owns the version number decision and commit.

**Migration entry:** Deferred to T09. Correct `regenerate` target is `["tools"]` — users must run `/forge:update-tools` to receive the updated `sdlc-config.schema.json` in their project's `.forge/schemas/` directory. This is a non-breaking change; `"breaking": false` and `"manual": []` are correct.

**Security scan:** Deferred to T09. The current scan report `docs/security/scan-v0.9.3.md` covers the previous release. T09 must run a fresh scan before pushing. The deferral is architecturally acceptable: the change is pure JSON with no executable code, no Markdown instruction changes, no hooks or tools — minimal risk profile.

**User-facing impact:** After upgrading and running `/forge:update`, users will have `calibrationBaseline` available in their schema copy. Existing configs without the field remain valid (field is optional at top level). No user action is required beyond running `/forge:update`.

## Operational Notes

**Regeneration requirements:** `regenerate: ["tools"]` — users run `/forge:update` which will prompt `/forge:update-tools` to copy the updated schema.

**Backwards compatibility:** Fully backwards compatible. `calibrationBaseline` is optional — absent field does not fail schema validation. No existing field was modified or removed.

**Manual steps for users:** None required.

**T03 dependency satisfied:** The `calibrationBaseline` object is now defined in the schema. T03 (init writes calibration baseline + incomplete init guard) may proceed.

**T04 dependency satisfied:** The `required` arrays at every nesting level have been audited and confirmed correct. T04 (health config-completeness check) may use these arrays as its authoritative source.

## Follow-Up Items

1. **`masterIndexHash` minLength (T05 or T09):** Consider adding `"minLength": 64` to make the SHA-256 contract explicit once T05 confirms the exact hash format used.

2. **`sprintsCovered` uniqueItems (T05):** Consider adding `"uniqueItems": true` when T05 implements the calibration write logic, to prevent duplicate sprint IDs.

3. **`lastCalibrated` format (T05 monitor):** Currently `format: date` (YYYY-MM-DD). If `/forge:calibrate` (T05) records full datetime precision, amend to `format: date-time`.

4. **Group C — `additionalProperties` hardening (future sprint):** The top-level schema object and several sub-objects (`stack`, `pipeline`, `sprint`) lack `additionalProperties: false`. This is a known gap deferred out of scope from T02 to avoid a potentially breaking change for existing configs with undocumented fields. Track as a future hardening task.
