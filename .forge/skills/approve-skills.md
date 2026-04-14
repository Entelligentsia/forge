# Architect Approval Skills — Forge

## Distribution Impact Assessment

Before signing off, answer each question explicitly:

1. **Backwards compatibility:** Can a user on the previous Forge version run `/forge:update` and get to this version without data loss?
2. **Migration correctness:** Are the `regenerate` targets right? Will users be prompted to regenerate the correct artifacts?
3. **Breaking change declaration:** If the change requires manual user action, is `"breaking": true` set with clear `"manual"` steps in `migrations.json`?
4. **Update path integrity:** Does this change affect `/forge:update`, `check-update.js`, or the migration logic itself? If so, has the update flow been exercised?

## Architectural Coherence

- Does this change respect the two-layer architecture (`forge/` vs `engineering/`)?
- Does it follow the established hook/tool/command patterns in `engineering/architecture/routing.md`?
- Does it introduce any new trust boundary or external call?

## Security Sign-off

Read `docs/security/scan-v{VERSION}.md`:
- Is the scan verdict SAFE?
- Are there any flagged items that were dismissed? Are those dismissals justified?

If the scan report is missing or shows a non-SAFE verdict: do NOT approve.

## Operational Notes

In `ARCHITECT_APPROVAL.md`, document:
- What users will see differently after upgrading
- Whether `/forge:update` + `/forge:regenerate` is required
- Any follow-up items for the next sprint
