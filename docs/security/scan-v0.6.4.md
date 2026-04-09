# Security Scan — forge:forge — 2026-04-10

**SHA**: pre-release (source tree, 0.6.4) | **Installed**: canary source | **Last updated**: 2026-04-10
**Scope**: user (canary) | **Install path**: `/home/boni/src/forge/forge/`
**Plugin version scanned**: 0.6.4

### Summary
91 files scanned | **0 critical** | **1 warning** | **2 info** | 664K total

---

### Findings

#### [WARNING] `hooks/check-update.js`:31–37, `hooks/check-update.sh`:22–23
- **Check**: A — Outbound network call destination now configurable
- **Issue**: The URL used for the version-check GET request is no longer hardcoded — it is read from `plugin.json` → `updateUrl`. A distribution that ships a tampered `plugin.json` could redirect the beacon to an attacker-controlled host. The GET carries no sensitive payload (no tokens, no env vars, no file contents), so the worst-case impact is IP/timing tracking. The fallback URL is the legitimate forge endpoint. The source of `updateUrl` is the plugin distribution itself — not user input or a network response — so this is equivalent in trust level to a hardcoded URL in a plugin you chose to install.
- **Excerpt**: `return manifest.updateUrl || FALLBACK_UPDATE_URL;` / `REMOTE_URL=$(jq -r '.updateUrl // ""' "$PLUGIN_ROOT/.claude-plugin/plugin.json")`
- **Recommendation**: Acceptable by design — the purpose is distribution-aware update routing (forge vs skillforge). No data leaves the machine in the request. Trust boundary is the same as any plugin: if you trust the publisher, you trust their `plugin.json`. No action needed.

#### [INFO] `hooks/check-update.js`:37, `hooks/check-update.sh`:69
- **Check**: A — Outbound network call
- **Issue**: GET request to `updateUrl` (default: `raw.githubusercontent.com/Entelligentsia/forge`). Throttled to once per 24 hours via plugin-level cache. No request body, no env vars sent.
- **Recommendation**: Expected and justified. Safe.

#### [INFO] `hooks/check-update.js`:114–115 / `hooks/check-update.sh`:71
- **Check**: A — Write to shared temp location
- **Issue**: Plugin-level throttle cache (`$CLAUDE_PLUGIN_DATA/update-check-cache.json`) contains only `lastCheck` (epoch int) and `remoteVersion` (semver string from the remote). No sensitive data.
- **Recommendation**: Acceptable. Migration state is project-scoped separately in `.forge/update-check-cache.json`.

---

### Clean Areas
- `plugin.json` — new `updateUrl`/`migrationsUrl` fields are plain HTTPS URLs to `raw.githubusercontent.com`; no `allowed-tools` escalation
- `commands/update.md` — URL substitution is read-only from plugin.json, not user input; no injection vector
- `hooks/triage-error.js`, `hooks/list-skills.js`, `hooks/list-skills.sh` — unchanged; clean
- `hooks.json` — unchanged; two hooks, reasonable timeouts (10s SessionStart, 5s PostToolUse)
- `commands/`, `meta/` — no prompt injection, no invisible Unicode, no base64 blobs, descriptions match body content
- `tools/*.cjs` — no eval, no network calls, no credential reads; plain CJS source
- `schemas/` — pure JSON Schema
- No binary files, no compiled artifacts

---

### Verdict

**SAFE TO USE**

The only new surface introduced in 0.6.4 is the configurable `updateUrl` — a deliberate design choice for multi-distribution support. The network call is a one-way GET with no data payload; the URL source is the plugin's own `plugin.json`, which is already in the trust boundary of an installed plugin. Zero critical findings across all 91 files.
