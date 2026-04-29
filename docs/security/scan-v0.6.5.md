# Security Scan — forge:forge — 2026-04-10

**SHA**: pre-release (source tree, 0.6.5) | **Installed**: canary source | **Last updated**: 2026-04-10
**Scope**: user (canary) | **Install path**: `/home/boni/src/forge/forge/`
**Plugin version scanned**: 0.6.5

### Summary
92 files scanned | **0 critical** | **1 warning** | **2 info** | 668K total

---

### Findings

#### [WARNING] `hooks/check-update.js`:35–39, `hooks/check-update.sh`:22–26
- **Check**: A — Outbound network call destination now path-derived
- **Issue**: `REMOTE_URL` / `remoteUrl` is now determined by path-based detection on `CLAUDE_PLUGIN_ROOT`: if it contains `/cache/skillforge/forge/`, the URL is the hardcoded `SKILLFORGE_UPDATE_URL`; otherwise it falls back to `updateUrl` in `plugin.json` or the forge default. The URL source is either a hardcoded constant or the plugin's own `plugin.json` (same trust boundary as the plugin itself). The GET carries no payload. Throttled to once per 24 hours.
- **Excerpt**: `if (pluginRoot.includes('/cache/skillforge/forge/')) { return SKILLFORGE_UPDATE_URL; }` / `if echo "$PLUGIN_ROOT" | grep -q '/cache/skillforge/forge/'; then REMOTE_URL="$SKILLFORGE_UPDATE_URL"`
- **Recommendation**: Acceptable and strictly safer than the 0.6.4 approach. `CLAUDE_PLUGIN_ROOT` is set by Claude Code's plugin runtime (not by the plugin itself or by user input), so the detection is reliable and non-spoofable. The two derived URLs are hardcoded string constants, not constructed from any dynamic input. No action needed.

#### [INFO] `hooks/check-update.js`:120–134, `hooks/check-update.sh`:69–82
- **Check**: A — Outbound network call
- **Issue**: GET request to `remoteUrl` (either `SKILLFORGE_UPDATE_URL` or forge default). Throttled to once per 24 hours via plugin-level cache. No request body, no env vars sent.
- **Recommendation**: Expected and justified. Safe.

#### [INFO] `hooks/check-update.js`:124 / `hooks/check-update.sh`:73
- **Check**: A — Write to shared temp location
- **Issue**: Plugin-level throttle cache (`$CLAUDE_PLUGIN_DATA/update-check-cache.json`) contains only `lastCheck` (epoch int) and `remoteVersion` (semver string). Project-level migration cache (`.forge/update-check-cache.json`) contains only `migratedFrom`/`localVersion` (semver strings). No sensitive data in either file.
- **Recommendation**: Acceptable. Two-file split cleanly separates shared throttle state from per-project migration state.

---

### Clean Areas
- `plugin.json` — `updateUrl`/`migrationsUrl` are plain HTTPS URLs to `raw.githubusercontent.com`; no `allowed-tools` escalation
- `commands/update.md` — new distribution detection table uses hardcoded HTTPS URLs, not user input; no injection vector
- `hooks/triage-error.js` — no network calls; reads stdin JSON only; exits 0 on any failure
- `hooks/list-skills.js`, `hooks/list-skills.sh` — no network calls; reads local filesystem only; no sensitive data access
- `hooks/hooks.json` — two hooks, reasonable timeouts (10s SessionStart, 5s PostToolUse); no unrestricted Bash
- `commands/`, `meta/` — no prompt injection, no invisible Unicode, no base64 blobs, descriptions match body content
- `tools/*.cjs` — no eval, no network calls, no credential reads; plain CJS source
- `schemas/` — pure JSON Schema
- No binary files, no compiled artifacts

---

### Verdict

**SAFE TO USE**

The only new surface in 0.6.5 is path-based distribution detection replacing `updateUrl`/`migrationsUrl` reads from `plugin.json`. This is strictly safer than 0.6.4 — `CLAUDE_PLUGIN_ROOT` is set by Claude Code's runtime (not the plugin), and the derived URLs are hardcoded constants, not constructed from dynamic input. Zero critical findings across all 92 files.
