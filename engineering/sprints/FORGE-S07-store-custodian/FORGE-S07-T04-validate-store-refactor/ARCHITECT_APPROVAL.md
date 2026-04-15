# Architect Approval — FORGE-S07-T04

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

- **Version bump:** Deferred to T09 (release engineering task for this sprint). No version bump in this task.
- **Migration entry:** Deferred to T09. When created, the `regenerate` targets should include `"schemas"` to prompt users to refresh `.forge/schemas/` via `/forge:update-tools`.
- **Security scan:** Deferred to T09. No new attack surface introduced — this is a pure refactor that removes embedded schemas and replaces private API access with public facade methods.
- **User-facing impact:** None until T09 is released. After release, users with stale `.forge/schemas/` copies will lose type-checking for newer optional fields until they run `/forge:update-tools` — this is benign since `validateRecord` does not enforce `additionalProperties: false`.

## Operational Notes

- No new installed artifacts or directories.
- No changes to `/forge:update` or `/forge:health` behavior.
- The `validate-store` tool now reads schemas from the filesystem at startup instead of using embedded inline definitions. This restores the standalone `forge/schemas/*.schema.json` files as the single source of truth.

## Follow-Up Items

- T09 must include a security scan covering this change along with all other S07 modifications.
- T09 should verify that the migration entry's `regenerate` targets include `"schemas"` so users refresh their installed schema copies.
- If `forge/schemas/*.schema.json` files gain new required fields in future sprints, the `MINIMAL_REQUIRED` map in `validate-store.cjs` must be updated to match — otherwise the minimal fallback will under-validate.