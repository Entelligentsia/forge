## Security Scan — forge:forge — 2026-04-16

**SHA**: not recorded | **Installed**: source install | **Last updated**: 2026-04-16
**Scope**: project | **Install path**: forge/ (local source)

### Summary
114 files scanned | 0 critical | 1 warning | 2 info

### Findings

#### [INFO] forge/hooks/check-update.js:76-84
- **Check**: A — Hook Scripts
- **Issue**: Outbound HTTPS call to `raw.githubusercontent.com` for version checking. This is the documented update-check endpoint declared in `plugin.json.updateUrl`. The call fetches only `plugin.json` (version metadata) and `migrations.json` (migration chain). No credentials or project data are sent.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe to ignore. This is the legitimate update-check mechanism documented in CLAUDE.md.

#### [WARNING] forge/hooks/check-update.js:24
- **Check**: A — Hook Scripts
- **Issue**: Uses `os.tmpdir()` as fallback for plugin data directory. While the data stored is only version check cache (not sensitive), writing to shared temp directories could theoretically be observed by other users on multi-user systems.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Low risk. The cached data contains no secrets. Consider using `XDG_CACHE_HOME` or `CLAUDE_PLUGIN_DATA` (which is set by the runtime) as the primary path, with `os.tmpdir()` only as a last resort.

#### [INFO] forge/commands/update.md:130
- **Check**: B — Skill/Command Files
- **Issue**: Documents using `curl` via Bash for remote version checking. This is instructional text in a slash command, not an automatic hook. The curl target is the same `raw.githubusercontent.com` endpoint.
- **Excerpt**: `Use the WebFetch tool (preferred) or curl via Bash`
- **Recommendation**: Safe to ignore. The command instructs the agent to use WebFetch preferentially and only suggests curl as a fallback.

### Clean Areas
- `forge/hooks/hooks.json` — single SessionStart and single PostToolUse hook, both with appropriate timeouts (10s, 5s)
- `forge/hooks/triage-error.js` — reads only stdin JSON, emits context for error triage, no network or file writes
- `forge/tools/*.cjs` — all deterministic CLI tools operating on local store/config files, no network access
- `forge/commands/*.md` — all slash command definitions, no hidden instructions or suspicious patterns
- `forge/meta/**/*.md` — generation instructions, no prompt injection or exfiltration content
- `forge/schemas/*.json` — JSON Schema definitions, no executable content
- No binary files, no compiled artifacts, no zero-width Unicode, no base64 blobs, no credential reads, no `eval()`, no `sudo`, no persistence mechanisms

### Verdict

**SAFE TO USE**

No critical findings. One low-risk warning about `os.tmpdir()` fallback that is mitigated by the runtime setting `CLAUDE_PLUGIN_DATA`. All network calls are to the documented GitHub update endpoint for version checking only.