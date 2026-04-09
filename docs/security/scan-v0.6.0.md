## Security Scan — forge:forge — 2026-04-09

**SHA**: not recorded (source install) | **Installed**: n/a | **Last updated**: n/a
**Scope**: source | **Install path**: /home/boni/src/forge/forge/

### Summary
93 files scanned | 0 critical | 2 warnings | 1 info

### Findings

#### [WARNING] hooks/check-update.sh:44,55
- **Check**: A — outbound network call
- **Issue**: `curl` fetches `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` to compare versions. Call is justified (version-check endpoint on official repo), but flagged per policy as any outbound call warrants review.
- **Excerpt**: `REMOTE_VERSION=$(curl -sf --max-time 5 "$REMOTE_URL" 2>/dev/null | jq -r '.version // ""' 2>/dev/null || echo "")`
- **Recommendation**: Safe. Destination is the plugin's own GitHub release manifest; timeout is 5s; failure is handled gracefully. Equivalent logic in `check-update.js` uses `https.get` with the same URL and timeout.

#### [WARNING] hooks/check-update.js:21 / hooks/check-update.sh:13
- **Check**: A — writing to `/tmp`
- **Issue**: Cache file written to `$CLAUDE_PLUGIN_DATA/forge-plugin-data/update-check-cache.json`, falling back to `/tmp/forge-plugin-data/update-check-cache.json` when `CLAUDE_PLUGIN_DATA` is unset. Cache contains only `{ lastCheck, remoteVersion, localVersion, migratedFrom }` — no credentials or sensitive data.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Safe. Cache content is non-sensitive version metadata. Prefer `CLAUDE_PLUGIN_DATA` over `/tmp` when available — this is already the implementation's preference.

#### [INFO] hooks/check-update.js:13 / hooks/triage-error.js:33
- **Check**: A — uncaughtException exit 0
- **Issue**: Both hooks suppress all uncaught exceptions and exit 0. This prevents hook failures from surfacing as noise to the user (stated intent), but also means internal errors are silently swallowed.
- **Excerpt**: `process.on('uncaughtException', () => process.exit(0));`
- **Recommendation**: Acceptable for session hooks where failure must be non-disruptive. No security impact.

### Clean Areas
- `hooks/list-skills.js` / `hooks/list-skills.sh` — filesystem reads only, no network, no writes
- `hooks/triage-error.js` — reads stdin event, writes additionalContext to stdout only; no network, no file I/O
- `tools/collate.cjs` — reads `.forge/store/`, writes `engineering/` markdown; no network, no shell exec
- `tools/manage-config.cjs` — reads/writes `.forge/config.json` only; validates pipeline name with `[a-z0-9_-]`
- `tools/validate-store.cjs` — reads `.forge/store/` and schemas; no writes beyond `--fix` mode
- `tools/generation-manifest.cjs` — reads/writes `.forge/generation-manifest.json`; uses atomic rename pattern
- `tools/seed-store.cjs` — reads `engineering/`, writes `.forge/store/`; no network
- `tools/estimate-usage.cjs` — local computation only
- All `commands/*.md` — no prompt injection, no credential reads, no hidden instructions
- All `meta/workflows/*.md` — no prompt injection, no persona hijacking, no exfiltration instructions
- All `meta/personas/*.md` — clean
- `hooks/hooks.json` — two hooks: `SessionStart` (10s timeout) and `PostToolUse`/Bash (5s); no `allowed-tools` escalation
- `plugin.json` — minimal manifest, no suspicious permissions
- No binaries, compiled artifacts, or unexpected file types (93 files: .md, .json, .cjs, .js, .sh only)
- No zero-width or invisible Unicode characters
- No base64 blobs in markdown
- No `allowed-tools` grants in any frontmatter
- Total size 680K — proportionate to functionality

### Verdict

**SAFE TO USE**

No critical findings. Two warnings are both expected behaviours (version-check network call and `/tmp` cache fallback) that are justified by the plugin's stated function and contain no sensitive data. All hook scripts, tools, and prompt files are clean.
