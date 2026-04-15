# Architect Skills — Forge

## Distribution Impact Assessment

Answer each question explicitly before signing off:

1. **Backwards compatibility:** Can a user on the previous version run `/forge:update` and arrive at this version without data loss or manual intervention?
2. **Migration correctness:** Are the `regenerate` targets right? Will users be prompted to regenerate the correct artifacts?
3. **Breaking change declaration:** If manual steps are required, is `"breaking": true` set with clear `"manual"` steps in `migrations.json`?
4. **Update path integrity:** Does this change touch `/forge:update`, `check-update.js`, or the migration resolution logic? If so, has the update flow been traced end-to-end?

## Architectural Coherence Check

- Does the change respect the two-layer boundary (`forge/` source vs `.forge/` generated output)?
- Does it follow the hook/tool/command patterns in `engineering/architecture/routing.md`?
- Does it introduce any new external call or trust boundary?
- If it adds a new generated file category, is there a corresponding `regenerate` target in the migration entry?

## Security Sign-off

Read `docs/security/scan-v{VERSION}.md`:
- Scan verdict must be SAFE
- Dismissed findings must have explicit justification
- If missing or non-SAFE: do NOT approve

## Approval Artifact

`ARCHITECT_APPROVAL.md` must include:
- `**Status:** Approved` (or `Revision Required` with numbered items)
- Distribution notes: what changes, version, migration summary
- Operational notes: what users must do after upgrading (regenerate targets, manual steps)
- Follow-up items flagged for future sprints
