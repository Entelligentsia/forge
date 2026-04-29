## Security Scan — forge:forge — 2026-04-10

**SHA**: not recorded (source scan) | **Installed**: n/a | **Last updated**: 2026-04-10
**Scope**: source | **Install path**: /home/boni/src/forge/forge/

### Summary
87 files scanned (680K) | 0 critical | 0 warnings | 2 info

### Findings

#### [INFO] hooks/check-update.js:44
- **Check**: A — Hook outbound network call
- **Issue**: Single outbound HTTPS GET to `raw.githubusercontent.com` to fetch remote `plugin.json` for version comparison.
- **Excerpt**: `const FALLBACK_UPDATE_URL = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Expected and justified — this is the plugin's version-check mechanism. The URL is the official release endpoint for this plugin. The actual URL used at runtime is read from the installed `plugin.json` (updateUrl field), with this as a fallback only.

#### [INFO] hooks/check-update.js:24
- **Check**: A — Writes to temp directory
- **Issue**: Plugin-level throttle cache written to `$CLAUDE_PLUGIN_DATA` (defaults to `os.tmpdir()/forge-plugin-data/`).
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Safe — cache file contains only `{ lastCheck, remoteVersion }`. No sensitive data. Shared across projects intentionally for throttling (24h interval). Project-scoped migration state is written to `.forge/update-check-cache.json` instead.

### Clean Areas
- `hooks/triage-error.js` — no network calls, no credential reads, reads only stdin (PostToolUse event payload), writes only additionalContext to stdout
- `hooks/list-skills.js` — reads only `installed_plugins.json` and `~/.claude/skills/`; no network calls; no file writes
- `tools/manage-config.cjs` — reads/writes `.forge/config.json` only; validates pipeline names with strict `[a-z0-9_-]` regex; no network calls
- `tools/validate-store.cjs` — reads `.forge/store/` and `.forge/config.json`; writes with atomic rename; no network calls
- `tools/collate.cjs` — reads store JSON, writes markdown to `engineering/`; no network calls
- `tools/seed-store.cjs` — reads `engineering/` directory structure, writes to `.forge/store/`; no network calls
- `tools/estimate-usage.cjs` — reads/writes `.forge/store/events/`; atomic writes; no network calls
- `tools/generation-manifest.cjs` — reads/writes `.forge/generation-manifest.json`; uses only `crypto` built-in for SHA-256 hashing; no network calls
- `hooks/hooks.json` — two hooks registered: `SessionStart` (check-update.js, 10s timeout) and `PostToolUse:Bash` (triage-error.js, 5s timeout); no `allowed-tools` escalation; no `bash -c` with interpolated variables
- `forge/.claude-plugin/plugin.json` — no `allowed-tools` declared; standard metadata only
- All `commands/*.md`, `meta/**/*.md` — no prompt injection patterns, no persona hijacking, no safety bypasses, no exfiltration instructions, no hidden instructions after document end
- New files (`meta/personas/meta-product-manager.md`, `meta/personas/meta-qa-engineer.md`, `meta/workflows/meta-validate.md`) — clean; contain only workflow/persona instructions scoped to the Forge SDLC domain
- No binary files, compiled artifacts, or misleading file extensions found
- No zero-width or invisible Unicode characters detected
- No base64-encoded blobs detected
- No `eval`, `sudo`, `chmod +x`, package installers, or persistence mechanisms found anywhere in the plugin

### Verdict

**SAFE TO USE**

All 87 files are clean. The single outbound network call in `check-update.js` targets only `raw.githubusercontent.com` for version checking, reads no credentials, and is rate-limited to once per 24 hours. New files added in 0.6.9 (PM/QA personas, validate workflow) contain only scoped SDLC instructions with no injection vectors.
