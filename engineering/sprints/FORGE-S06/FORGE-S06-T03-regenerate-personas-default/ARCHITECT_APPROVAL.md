# ARCHITECT APPROVAL — FORGE-S06-T03: Add personas to forge:regenerate defaults

🗻 *Forge Architect*

**Task:** FORGE-S06-T03
**Status:** Approved

---

## Distribution Notes

**Version bump:** 0.7.8 → 0.7.9 — correct. The change is material: it alters the default behavior of `/forge:regenerate` for all installed users.

**Migration chain:** Continuous. `0.7.7 → 0.7.8 → 0.7.9`. No gaps.

**Migration entry correctness:**
- `"regenerate": [{ "target": "personas", "type": "functional", "patch": "..." }]` — correct. Users who run `/forge:update` will automatically regenerate their `.forge/personas/` directory.
- `"breaking": false` — correct. Adding `personas` to the default run is purely additive.
- `"manual": []` — correct. No manual steps required.

**User-facing impact:** Low disruption. Users who already ran `/forge:regenerate personas` explicitly will see no change. Users who never did will get personas generated automatically on next regeneration or update. Fully backwards compatible.

## Operational Notes

**Regeneration required after upgrade:** Yes — `personas`. This is correctly captured in the migration entry. The `/forge:update` flow will prompt users to regenerate personas.

**Security posture:** `docs/security/scan-v0.7.9.md` exists and reports SAFE TO USE (0 critical, 1 pre-existing warning unrelated to this change).

**Schema integrity:** No schema changes. `additionalProperties: false` constraints remain unchanged.

## Follow-up Items

- The WARNING in the security scan (`list-skills.js` located in `hooks/` but exiting 1) is a cosmetic issue that could be addressed in a future cleanup sprint (move to `tools/` for clarity).
