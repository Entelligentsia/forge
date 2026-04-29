## Security Scan — forge:forge — 2026-04-12

**SHA**: 39582ada643f5a3b9829c6a04cf91e5c682fef4b | **Installed**: 2026-04-09T18:02:54.923Z | **Last updated**: 2026-04-12T10:58:19.350Z
**Scope**: local | **Install path**: /home/boni/.claude/plugins/cache/forge/forge/0.6.11
**Source scanned**: /home/boni/src/forge/forge/ (source directory, not cache)

### Summary
93 files scanned | 0 critical | 3 warnings | 0 info

### Findings

#### [WARNING] hooks/check-update.js:77
- **Check**: A — Hook Scripts — outbound network call
- **Issue**: `https.get(remoteUrl, ...)` makes an outbound HTTPS request to `raw.githubusercontent.com` to check for plugin updates. The URL is read from `plugin.json` `updateUrl` field with a hardcoded fallback to `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Justified — this is a version-check call to the plugin's own GitHub repository. The URL is constrained to `raw.githubusercontent.com`, uses a 5-second timeout, and only fetches the plugin manifest. No credentials or user data are transmitted. Safe to use.

#### [WARNING] hooks/check-update.js:54
- **Check**: A — Hook Scripts — writing to shared location
- **Issue**: Creates a plugin data directory and writes cache files (`update-check-cache.json`) to either `$CLAUDE_PLUGIN_DATA` or `os.tmpdir()/forge-plugin-data/`. Also writes a project-level cache to `.forge/update-check-cache.json`.
- **Excerpt**: `fs.mkdirSync(dataDir, { recursive: true });`
- **Recommendation**: Justified — cache files contain only version strings, timestamps, and distribution identifiers. No secrets or user data. The project-level cache is scoped to the `.forge/` directory. Safe to use.

#### [WARNING] hooks/check-update.js:126-131
- **Check**: A — Hook Scripts — writing to project config
- **Issue**: Writes to `.forge/config.json` to keep `paths.forgeRoot` in sync with the active plugin root path. This modifies project configuration on every session start when the path has drifted.
- **Excerpt**: `fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');`
- **Recommendation**: Justified — this is required for distribution-switch detection and ensures subagent tool invocations reference the correct plugin path. The write only modifies the `paths.forgeRoot` field. Safe to use.

### Clean Areas
- `hooks/triage-error.js` — no issues detected; reads stdin only, exits 0 on failure, no network calls
- `hooks/list-skills.js` — no issues detected; reads local filesystem only, no network calls
- `hooks/hooks.json` — no issues detected; two hooks registered with reasonable timeouts (10s, 5s)
- `tools/collate.cjs` — no issues detected; uses only `fs` and `path` built-ins, no network calls, no credential access
- `tools/validate-store.cjs` — no issues detected; filesystem-only operations
- `tools/seed-store.cjs` — no issues detected; filesystem-only operations
- `tools/manage-config.cjs` — no issues detected; filesystem-only operations
- `tools/estimate-usage.cjs` — no issues detected; filesystem-only operations
- `tools/generation-manifest.cjs` — no issues detected; filesystem-only operations
- `commands/*.md` — no prompt injection detected; no hidden instructions
- `meta/workflows/*.md` — no prompt injection detected; no persona hijacking
- `meta/personas/*.md` — no prompt injection detected; persona definitions are legitimate role descriptions for the SDLC pipeline
- `meta/templates/*.md` — no prompt injection detected
- `meta/tool-specs/*.md` — no prompt injection detected
- `meta/store-schema/*.md` — no prompt injection detected
- `init/**/*.md` — no prompt injection detected
- `vision/*.md` — no prompt injection detected
- `schemas/*.json` — valid JSON Schema files, no executable content
- `sdlc-config.schema.json` — valid JSON Schema, no executable content
- `.claude-plugin/plugin.json` — no excessive permissions; no `allowed-tools` declarations
- `migrations.json` — data-only JSON, no executable content
- No binary files, compiled artifacts, or files with misleading extensions detected
- No zero-width Unicode characters or base64-encoded blobs found
- Plugin size (684K) is proportionate to functionality

### Verdict

**SAFE TO USE**

No new findings introduced in v0.6.12. The three recurring warnings (outbound version-check to GitHub, cache file writes, config sync) are all justified by plugin functionality and have been present since v0.5.x. The two changes in this release (numeric glob fallback in `resolveDir`, attribution backfill in `loadSprintEvents`) are pure logic changes using only `fs` and `path` built-ins with no network, credential, or permission implications.
