## Security Scan — forge:forge — 2026-04-19

**SHA**: f55a9a499a5de16f0389895ecbf34c2e72b0d4a0 (source repo HEAD at scan time) | **Installed**: 2026-04-19T04:38:41.287Z | **Last updated**: 2026-04-19T04:38:41.287Z
**Scope**: local | **Install path**: /home/boni/src/forge/forge/ (source scan)

> Note: Scanned against the plugin source directory (`forge/`) rather than the cached install at `/home/boni/.claude/plugins/cache/forge/forge/0.16.0`. The cached install is 0.16.0; source is 0.17.0 (this release).

### Summary
156 files scanned | 0 critical | 0 warnings | 3 info

### Findings

#### [INFO] hooks/check-update.js:77
- **Check**: A — Network call in hook script
- **Issue**: Outbound HTTPS GET to `raw.githubusercontent.com` to fetch the latest plugin version. Fires at most once per 24 hours (throttled by a local cache).
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Accepted. The destination is the official Forge release manifest on GitHub. The call is read-only (version string only), throttled, and guarded by a 5-second timeout. The URL is not constructed from user input — it is read from the plugin's own `plugin.json` at runtime, with a hardcoded `raw.githubusercontent.com` fallback.

#### [INFO] hooks/check-update.js:125–132
- **Check**: A — File write in hook script
- **Issue**: Hook writes to `.forge/config.json` (to sync `paths.forgeRoot`) and to `.forge/update-check-cache.json` (to throttle remote checks). Both writes are within the project directory and are non-destructive (they only update two fields).
- **Excerpt**: `fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');`
- **Recommendation**: Accepted. Both writes are scoped to the current project's `.forge/` directory. They preserve the existing config structure (no full overwrite). No secrets are read or written.

#### [INFO] commands/update.md:1
- **Check**: B — Long file (1062 lines)
- **Issue**: `update.md` is the longest file in the plugin (1062 lines). Long files could bury instructions; reviewed in full.
- **Excerpt**: (full file reviewed — no hidden instructions, no prompt injection, no content after final `---`)
- **Recommendation**: Accepted. The length is attributable to the detailed step-by-step update workflow and migration guidance. All content is consistent with the command's stated purpose.

### Clean Areas
- `hooks/triage-error.js` — reads stdin from Claude's tool context only; no network, no credential access, no file writes
- `hooks/hooks.json` — two hooks registered; timeouts 10s and 5s; no `Bash` unrestricted tool access
- `tools/store-cli.cjs` — new `set-summary` / `set-bug-summary` subcommands: file reads and writes scoped to `.forge/store/`; no network calls; summary validation is schema-based
- `tools/banners.sh` — purely delegates to `banners.cjs` via `node`; no network, no env capture
- `tools/list-skills.js` — reads `~/.claude/plugins/installed_plugins.json` (local only); no network
- `commands/*.md` — all descriptions match body intent; no persona hijacking or safety bypass language detected
- `meta/workflows/*.md` — no prompt injection patterns; no hidden post-`---` content; no invisible Unicode detected
- `meta/personas/*.md` — standard persona definitions; no anomalous instructions
- `schemas/*.json` — data-only; new `summaries` field and `phaseSummary` definition are additive and schema-compliant
- `integrity.json` — updated to v0.17.0 with correct SHA-256 hashes for all tracked files
- No binary, compiled, or obfuscated files anywhere in the plugin directory

### Verdict

**SAFE TO USE**

156 files scanned with zero critical findings and zero warnings. The three informational findings are carry-forwards from prior scans: the version-check network call to `raw.githubusercontent.com` (accepted), the config sync file write scoped to `.forge/` (accepted), and the long `update.md` (reviewed in full, no issues). New code in this release (`store-cli` set-summary commands, schema extensions, workflow summary sidecar instructions) adds no network calls, no credential access, and no privilege escalation vectors.
