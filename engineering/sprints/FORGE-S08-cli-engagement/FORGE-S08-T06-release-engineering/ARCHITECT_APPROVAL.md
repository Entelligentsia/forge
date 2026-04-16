# Architect Approval — FORGE-S08-T06

🗻 *Forge Architect*

**Status:** Approved

## Architectural Review

### Backwards Compatibility

Fully backwards compatible. The v0.9.2 release adds new optional schema fields (`inputTokens`, `outputTokens`, etc. on events; `path` on sprints; `feature_id` on tasks; `abandoned` status on sprints/tasks) and renames a utility file (`list-skills.js` from hooks/ to tools/). No existing data or workflow is broken. Users on 0.9.1 can upgrade to 0.9.2 without manual intervention beyond running `/forge:update`.

### Migration Correctness

The `0.9.1 -> 0.9.2` migration entry specifies `regenerate: ["commands", "tools"]`, which correctly reflects that command frontmatter changes and schema/tool spec changes require regeneration. The migration chain is walkable from 0.8.0 to 0.9.2 with no gaps. `breaking: false` and `manual: []` are correct.

### Update Path

The update path (`check-update.js` -> `/forge:update`) is not modified by this release. The `list-skills.js` rename from `hooks/` to `tools/` is already reflected in `health.md` and `skill-recommendations.md`. The `hooks.json` file does not reference `list-skills.js` (only `check-update.js` and `triage-error.js` are registered hooks). No update-path risk.

### Cross-cutting Concerns

- Command `name:` frontmatter additions affect command registration but do not change command behavior.
- Schema documentation updates in `forge/meta/store-schema/` describe shapes that are already partially in use (sprint `path`, task `feature_id`) or newly introduced (event token fields, `abandoned` status). These documentation updates align with the actual store data and validate-store behavior.
- The `seed-store.spec.md` bug status default change from `open` to `reported` aligns with BUG-002 fix.

### Operational Impact

No new directories, no new disk-write sites, no new installed artifacts beyond the updated files. Users run `/forge:update` to regenerate commands and tools.

### Security Posture

Security scan report exists at `docs/security/scan-v0.9.2.md`. Verdict: SAFE TO USE. 0 critical, 2 carry-forward warnings (update check network call, destructive remove command). No new attack surface introduced.

## Distribution Notes

- **Version bump:** 0.9.1 -> 0.9.2
- **Migration entry:** `regenerate: ["commands", "tools"]`, `breaking: false`, `manual: []`
- **Security scan:** 106 files, 0 critical, 2 carry-forward warnings, SAFE TO USE
- **User-facing impact:** Users will be prompted to run `/forge:update` after installing 0.9.2. The update will regenerate commands (frontmatter) and tools (schema/tool spec updates).

## Operational Notes

- Deployment: merge to `main`, then merge `main` to `release` branch for skillforge distribution.
- The prior commit (338431c) contains the material changes. The version bump, migration, and scan report are in uncommitted changes ready for the final commit.
- `.forge/store/` changes (task status, events) are dogfooding data and should NOT be included in the version bump commit.

## Follow-Up Items

1. The `forge/schemas/sprint.schema.json` should be updated to include the `path` field and `abandoned` status to align with `forge/meta/store-schema/sprint.schema.md`. This would eliminate the 8 pre-existing validate-store errors about "undeclared field: path". (Tracked in BUG-002/BUG-003.)
2. The `forge/schemas/task.schema.json` should be updated to include `feature_id` and `abandoned` status similarly.
3. The `forge/schemas/event.schema.json` should be updated to include the token fields and `tokenSource` enum.
4. The `.forge/store/` S01 legacy event data with non-standard field names (`timestamp`, `agent`, `status`, etc.) should be cleaned up or backfilled.