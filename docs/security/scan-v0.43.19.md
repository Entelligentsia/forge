## Security Scan — forge:forge — 2026-05-17

**SHA**: c6bd01b (local source — backfill commit) | **Installed**: source-path scan | **Last updated**: 2026-05-17
**Scope**: source-path override | **Install path**: /home/boni/src/forge-engineering/forge/forge/

### Summary

318 files scanned | **0 critical** | **2 warnings** | **3 info**

### Findings

#### [WARNING] commands/store-query.md
- **Check**: C — Permissions
- **Issue**: `allowed-tools: [Bash]` with no command pattern restriction. Unrestricted shell access granted to this command.
- **Excerpt**: `allowed-tools:\n  - Bash`
- **Recommendation**: Acceptable given the command's stated purpose (running store-query CLI invocations from user prompts), but a `Bash:node forge/tools/store-query.cjs *` allowlist would be safer. Track as ergonomic improvement.

#### [WARNING] hooks/check-update.js:130
- **Check**: A — Hook Scripts (outbound network)
- **Issue**: Outbound HTTPS to `raw.githubusercontent.com` for version-check.
- **Excerpt**: `const FALLBACK_UPDATE_URL = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Justified — matches the explicit version-check allowlist in Check A. URL is the project's own repo on the official GitHub CDN. Pass.

#### [INFO] hooks/post-init.cjs, hooks/post-sprint.cjs, tools/store-cli.cjs
- **Check**: A — `spawnSync` usage
- **Issue**: Process spawn via `child_process.spawnSync`.
- **Excerpt**: `spawnSync('node', [cli, 'emit', 'enhancement', JSON.stringify(event)], ...)`
- **Recommendation**: All call sites use argv-array form (no shell-string interpolation). Safe from command injection.

#### [INFO] hooks.json — multiple event registrations
- **Check**: C — Permissions
- **Issue**: Hooks registered on SessionStart, PreToolUse, PostToolUse, Stop, etc.
- **Excerpt**: standard Forge hook surface
- **Recommendation**: Justified by Forge's runtime architecture (version check, write validation, error triage, query logging). Each hook has a tight timeout (3–10s).

#### [INFO] No prompt-injection patterns in 200+ markdown files
- **Check**: B — Skill/Command/Context
- **Issue**: None.
- **Recommendation**: Pass.

### Clean Areas

- `meta/personas/` — no injection patterns, no zero-width unicode, no hidden instructions
- `meta/workflows/` — no injection patterns
- `meta/skills/` — no injection patterns
- `commands/` — no eval, no obfuscation, no credential reads
- `tools/lib/suggest.cjs` (T03 new) — pure utility, no I/O, no network, 46 unit tests
- `tools/store-cli.cjs` (T02/T03/T05 changes) — additive surface, no privileged operations
- `schemas/` — JSON only, no executable content
- No binary artifacts, no `.pyc`/`.so`/`.exe`/`.dylib`

### Verdict

**SAFE TO USE**

Forge plugin v0.43.19 source at `/home/boni/src/forge-engineering/forge/forge/` contains no critical security findings. Two warnings (unrestricted Bash on `store-query` command; outbound HTTPS to official GitHub CDN for version check) are both justified by stated function and consistent with prior release scans. All `spawnSync` calls use argv-array form. No credential reads, no eval/base64 obfuscation, no persistence mechanisms. T02/T03/T05 additive surface clean.
