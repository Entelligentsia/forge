# CODE REVIEW — FORGE-S09-T05: Calibrate command — drift detection, categories, surgical patches

🌿 *Forge Supervisor*

**Task:** FORGE-S09-T05

---

**Verdict:** Approved

---

## Review Summary

The implementation matches the approved plan. All four files were created/modified as specified. The command file follows established patterns (YAML frontmatter, $FORGE_ROOT resolution, --path argument, on-error footer). The schema addition preserves `additionalProperties: false`. Version bump and migration entry are correct. Security scan report exists at `docs/security/scan-v0.9.12.md` with SAFE verdict. No JS/CJS files were modified so `node --check` is not applicable.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | Markdown command only; shell commands use only `crypto`, `fs` built-ins |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | N/A | No tools modified |
| `--dry-run` supported where writes occur | N/A | No tools modified |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 | Engineering path read from config; `.forge/config.json` referenced directly per established pattern |
| Version bumped if material change | 〇 | `plugin.json` shows `0.9.12` — matches plan declaration |
| Migration entry present and correct | 〇 | `migrations.json` entry `0.9.11→0.9.12` with `regenerate: ["commands"]`, `breaking: false` |
| Security scan report committed | 〇 | `docs/security/scan-v0.9.12.md` exists — SAFE TO USE |
| `additionalProperties: false` preserved in schemas | 〇 | Both `calibrationHistory` items and nested `patches` items have `additionalProperties: false` |
| `node --check` passes on modified JS/CJS files | N/A | No JS/CJS files modified |
| `validate-store --dry-run` exits 0 | 〇 | No new errors introduced; 73 pre-existing errors documented as FORGE-S09-T08 |
| No prompt injection in modified Markdown files | 〇 | No injection patterns found in `calibrate.md` — no "ignore prior rules", "dump env", or external URL fetch instructions |

## Issues Found

None.

---

## Advisory Notes

1. The inline `node -e` commands in calibrate.md Steps 3 and 8 follow the same pattern as health.md and init.md. This was accepted as a WARNING in the security scan. The pattern is established and no user-supplied variables are interpolated into the command string.

2. The `calibrationHistory` patch entries use `{target, type, applied}` rather than the `{target, type, patch}` format mentioned in the task prompt AC #2. The `applied` boolean is more useful for an audit trail than a generic `patch` description. This was flagged in the plan review and accepted.

3. Error handling for regeneration failures is included in Step 7 — failed patches are recorded as `applied: false` and the user is warned. This addresses the plan review advisory.

4. The `routing.md` architecture doc and `README.md` commands table have been updated to include the new calibrate command.