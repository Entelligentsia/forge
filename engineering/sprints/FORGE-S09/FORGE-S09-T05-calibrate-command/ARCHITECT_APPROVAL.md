# Architect Approval — FORGE-S09-T05

🗻 *Forge Architect*

**Status:** Approved

## Architectural Review

- **Backwards compatibility:** Fully backwards compatible. `calibrationHistory` is an optional property (not in `required`). Existing projects without it will work fine — calibrate starts with empty history on first run. No breaking changes.
- **Migration correctness:** `regenerate: ["commands"]` is correct. Users need `/forge:update` after installing to get the new `/forge:calibrate` command wrapper. This follows the same pattern as the health command migration (0.9.10→0.9.11).
- **Update path:** The change does NOT affect `/forge:update` itself. The update command reads `migrations.json` and runs regeneration — the new migration entry is a standard addition.
- **Cross-cutting concerns:** The calibrate command references `/forge:regenerate` for executing patches. This creates a dependency on the regenerate command's behavior. If regenerate's interface changes, calibrate's Step 7 may need updating. This is acceptable — regenerate is a stable command.
- **Operational impact:** One new command file (`forge/commands/calibrate.md`). One new config property (`calibrationHistory`). One new disk-write site (config.json update in Step 8). All writes are gated on Architect approval in the command flow.
- **Security posture:** `docs/security/scan-v0.9.12.md` exists with SAFE TO USE verdict. 0 critical, 1 accepted warning (inline node -e command follows established pattern). No new trust boundaries introduced.

## Distribution Notes

- Version bump: 0.9.11 → 0.9.12
- Migration entry: `0.9.11 → 0.9.12`, `regenerate: ["commands"]`, `breaking: false`
- Security scan: `docs/security/scan-v0.9.12.md` — SAFE TO USE
- User-facing impact: New `/forge:calibrate` command available after `/forge:update`. Users with existing calibration baselines can immediately use it to detect and resolve drift.

## Operational Notes

- Users must run `/forge:update` after installing to regenerate command wrappers
- The `calibrationHistory` field in `.forge/config.json` will be created on first calibrate run — no manual setup needed
- The command depends on the calibration baseline established by `/forge:init` (T03) — users who haven't run init since T03 will be prompted to do so

## Follow-Up Items

- None. The calibrate command is self-contained and does not create tech debt.