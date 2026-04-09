# Security Scan — forge:forge — 2026-04-09

**SHA**: faea732 (source tree, pre-release) | **Installed**: canary source | **Last updated**: 2026-04-09
**Scope**: user (canary) | **Install path**: `/home/boni/src/forge/forge/`
**Plugin version scanned**: 0.6.3

### Summary
91 files scanned | **0 critical** | **1 warning** | **2 info** | 660K total

---

### Findings

#### [WARNING] `hooks/check-update.sh`:13,47,58
- **Check**: A — Hook scripts, shared temp write
- **Issue**: The bash fallback hook was not updated alongside `check-update.js` in the initial 0.6.3 patch. It still wrote `localVersion` to the shared plugin-level cache, mixing throttle state with per-project migration state — the same bug fixed in the JS version. Not registered in `hooks.json`; only the JS hook runs automatically.
- **Excerpt**: `CACHE_FILE="$DATA_DIR/update-check-cache.json"` … `printf '{"lastCheck":%d,"remoteVersion":"%s","localVersion":"%s"}\n'`
- **Recommendation**: Fixed in this release — bash fallback now mirrors the JS split-cache logic (throttle in plugin-level cache, migration state in `.forge/update-check-cache.json`).

#### [INFO] `hooks/check-update.js`:28, `hooks/check-update.sh` (new: `REMOTE_URL`)
- **Check**: A — Outbound network call
- **Issue**: Both hooks fetch `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` at most once per 24 hours. URL is hardcoded — no dynamic construction, no user-controlled input reaches the URL.
- **Recommendation**: Expected and justified for version-check functionality. Safe.

#### [INFO] `hooks/check-update.js`:31 / `hooks/check-update.sh` (`PLUGIN_CACHE_FILE`)
- **Check**: A — Writes to shared temp location
- **Issue**: Plugin-level throttle cache written to `$CLAUDE_PLUGIN_DATA` or `/tmp/forge-plugin-data/`. Post-fix, contains only `lastCheck` (epoch int) and `remoteVersion` (semver string). No migration state, no sensitive data.
- **Recommendation**: Acceptable. Migration state is now project-scoped in `.forge/update-check-cache.json`.

---

### Clean Areas
- `commands/` — no prompt injection, no exfiltration instructions, descriptions match body content
- `meta/workflows/`, `meta/personas/`, `meta/templates/` — no hidden instructions, no invisible Unicode, no base64 blobs
- `tools/*.cjs` — plain Node.js CJS source (not compiled), no eval, no credential reads, no network calls
- `hooks/triage-error.js` — reads stdin event JSON, pattern-matches on Forge command names only, no network, exits 0 on all failures
- `hooks/list-skills.js`, `hooks/list-skills.sh` — reads `installed_plugins.json` and `~/.claude/skills/`, no network, no writes
- `hooks.json` — two hooks (SessionStart + PostToolUse/Bash), both with reasonable timeouts (10s / 5s), no `allowed-tools` escalation
- `plugin.json` — no `allowed-tools` in manifest, no suspicious fields
- `schemas/` — pure JSON Schema, no executable content
- No binary files, no compiled artifacts, no `.pyc`/`.so`/`.class`

---

### Verdict

**SAFE TO USE**

No prompt injection, exfiltration, credential access, or permission escalation found. The one warning (bash fallback using shared cache) was identified and fixed within the same release. All network calls are version-check only, to a hardcoded GitHub raw URL.
