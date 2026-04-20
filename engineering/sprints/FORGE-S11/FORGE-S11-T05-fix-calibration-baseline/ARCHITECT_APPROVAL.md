# Architect Approval — FORGE-S11-T05

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

Version bump deferred to T08 (release engineering) as planned — correct for this sprint's
wave-parallel structure. The migration entry will specify `"regenerate": ["workflows", "commands"]`
covering both `sdlc-init.md` (init workflow chain) and `update.md` (command file). Neither change
is breaking — `calibrationBaseline` was already in the schema and absent fast-mode projects simply
lacked the field rather than having an incompatible shape.

Security scan deferred to T08 per sprint structure. No new trust boundaries or credential access
patterns introduced.

## Operational Notes

- Users running `/forge:init --fast` AFTER this change lands will automatically receive
  `calibrationBaseline` in their `config.json`. No user action required.
- Existing fast-mode projects already deployed will still lack `calibrationBaseline` until they
  re-run `/forge:init` or run `/forge:calibrate` which will instruct them to run `/forge:init`.
  This is existing correct behavior — no regression.
- After `/forge:update` applies this release's migrations, future update runs on fast-mode
  projects will refresh `calibrationBaseline` after artifact regeneration.
- No new directories, no new disk-write sites. The change only adds instruction prose to
  existing Markdown files.

## Follow-Up Items

- T08 (release engineering): version bump to 0.20.0, migration entry with
  `"regenerate": ["workflows", "commands"]`, security scan, CHANGELOG entry.
- Consider: could `calibrationBaseline` be backfilled for existing fast-mode projects via
  a `forge:update` migration step? This would improve the experience for users who installed
  before this fix. Low priority — worth noting for T08 review.
