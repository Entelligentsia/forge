# Architect Approval — FORGE-S07-T05

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

- **Version bump:** Deferred to T09 (release engineering). The new `store-cli.cjs` tool file is a material change that will trigger a version bump, but per the sprint plan, T09 handles all S07 versioning in a single batch.
- **Migration entry:** Will be added by T09 with `regenerate: ["tools"]` — users running `/forge:update-tools` will receive the new CLI file.
- **Security scan:** Deferred to T09. The scan will cover all S07 changes including `store-cli.cjs` before the version bump commit.
- **User-facing impact:** New tool available after `/forge:update-tools`. No existing tools, commands, hooks, or workflows are modified. Fully additive change.

## Operational Notes

- **Deployment:** No special deployment steps. The `store-cli.cjs` file ships as part of the `tools` regeneration target.
- **Regeneration requirements:** Users need to run `/forge:update-tools` after T09's version bump to receive the new CLI.
- **Backwards compatibility:** Fully backwards compatible. The CLI is a new file with no impact on existing tool, command, or hook behavior. No schema changes. No migration needed for existing store data.
- **No changes to `/forge:update`** — the update flow itself is unaffected.

## Cross-Cutting Concerns

- The `store-cli.cjs` tool is a dependency for T06 (store custodian skill) and T07 (workflow migration), which will reference it via the skill layer. The CLI is designed to be the deterministic backend that the probabilistic skill wraps.
- The `--dry-run` flag is consistent with all other Forge tools, maintaining the existing convention.

## Follow-Up Items

1. **T06:** The store custodian skill (`forge/meta/skills/meta-store-custodian.md`) must be created to wrap this CLI for the LLM layer.
2. **T07:** All 16 meta-workflows must be updated to reference the custodian skill instead of direct store writes.
3. **T08:** The `migrate.md` command must be updated to use the custodian.
4. **T09:** Version bump, migration entry, and security scan must be completed before the release commit.
5. **Future:** Consider adding a `store-cli.cjs status` command that shows the current transition table for a given entity — useful for debugging transition errors.