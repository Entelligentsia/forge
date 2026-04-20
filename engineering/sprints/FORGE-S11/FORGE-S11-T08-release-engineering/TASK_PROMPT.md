# FORGE-S11-T08: Release engineering — version bump to v0.20.0, migration entry, security scan

**Sprint:** FORGE-S11
**Estimate:** M
**Pipeline:** default
**Depends on:** FORGE-S11-T01, T02, T03, T04, T05, T06, T07

---

## Objective

Wrap up Sprint S11 with a version bump to 0.20.0, migration entry, changelog, integrity manifest regeneration, security scan, and documentation updates. This task consolidates all release steps as required by CLAUDE.md versioning rules.

## Acceptance Criteria

1. `forge/.claude-plugin/plugin.json` version is `0.20.0`.
2. `forge/migrations.json` has a `"0.19.2"` entry pointing to `"0.20.0"` with:
   - `regenerate: ["tools", "workflows"]`
   - `breaking: false`
   - `manual: []`
   - Notes summarizing the 6 bug fixes, quiz-agent command, and flat-file cleanup.
3. `CHANGELOG.md` prepended with a `## [0.20.0] — 2026-04-20` entry following existing format.
4. `forge/integrity.json` regenerated: `node forge/tools/gen-integrity.cjs --forge-root forge/`
5. `forge/commands/health.md` `EXPECTED=` hash updated to match new `verify-integrity.cjs` hash.
6. Security scan run on `forge/` source (not installed cache): `/security-watchdog:scan-plugin forge:forge --source-path forge/`
7. Full scan report saved to `docs/security/scan-v0.20.0.md`.
8. `docs/security/index.md` prepended with new scan row.
9. `README.md` `## Security` table updated: new row prepended, oldest row removed (keep 3 most recent).
10. All 241 tests pass before bumping: `node --test forge/tools/__tests__/*.test.cjs`.

## Context

- This task runs AFTER all T01–T07 are committed.
- Follow the exact steps in CLAUDE.md `## Versioning` section — steps 1–7.
- Migration `regenerate` must include both `"tools"` and `"workflows"` (T01/T02/T04 fix tools; T03/T05/T07 fix workflows).

## Plugin Artifacts Involved

- `forge/.claude-plugin/plugin.json` — version bump
- `forge/migrations.json` — new migration entry
- `CHANGELOG.md` — new version entry
- `forge/integrity.json` — regenerated
- `forge/commands/health.md` — EXPECTED hash updated
- `docs/security/scan-v0.20.0.md` — new security scan report
- `docs/security/index.md` — updated scan history
- `README.md` — security table updated

## Operational Impact

- **Version bump:** this IS the version bump task
- **Regeneration:** `["tools", "workflows"]` — users must run `/forge:update`
- **Security scan:** required (performed in this task)
