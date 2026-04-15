# Supervisor Skills — Forge

## Verification Techniques

- **Independent file reading:** Always read the actual files modified — never trust the PROGRESS.md summary alone
- `node --check <file>` — verify the Engineer ran syntax checks on every modified JS/CJS file
- `node forge/tools/validate-store.cjs --dry-run` — verify schema compliance if schemas were touched
- Check `docs/security/scan-v{VERSION}.md` exists if any `forge/` file was modified

## Code Review Checklist (Forge-specific)

For every implementation touching `forge/`:
- [ ] `'use strict';` at top of every hook and tool
- [ ] `process.on('uncaughtException', () => process.exit(0))` in every hook
- [ ] Top-level try/catch with `process.exit(1)` in every tool
- [ ] No npm `require()` calls — Node.js built-ins only
- [ ] Paths read from `.forge/config.json`, never hardcoded
- [ ] `additionalProperties: false` on every object schema (if schemas modified)
- [ ] Version bump in `forge/.claude-plugin/plugin.json` (if material change)
- [ ] Migration entry in `forge/migrations.json` with correct `regenerate` targets
- [ ] Security scan report at `docs/security/scan-v{VERSION}.md`
- [ ] No emoji in store or event JSON fields

## Architecture Boundary Check

- `.forge/workflows/`, `.forge/personas/`, `.forge/skills/` must NOT be edited directly
- Fixes to generated files must go in `forge/meta/` and then be regenerated
- `engineering/` files are dogfooding KB — never modified as part of plugin feature work

## Review Delivery

- `PLAN_REVIEW.md` — for plan reviews. Final line: `**Verdict:** Approved` or `**Verdict:** Revision Required`
- `CODE_REVIEW.md` — for code reviews. Final line: `**Verdict:** Approved` or `**Verdict:** Revision Required`
- List specific file:line references for every issue raised
- Do not raise style-only feedback as blockers — only correctness, security, and architecture

## Skill Invocations

When reviewing security-sensitive changes to `forge/`:
- YOU MUST invoke `security-watchdog:plugin-security` to verify the scan covers prompt injection, hook safety, and distribution security
