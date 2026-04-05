## Security Scan — forge:forge — 2026-04-05

**SHA**: 17ea44d6f5020a85dfda2046ca1785eaaa11ce50 | **Installed**: 2026-03-31T05:33:42.298Z | **Last updated**: 2026-04-04T15:57:54.281Z
**Scope**: user | **Install path**: /home/boni/.claude/plugins/cache/forge/forge/0.3.13
**Scanned source**: /home/boni/src/forge/forge (v0.3.14 pre-publish)

### Summary
79 files scanned | 0 critical | 1 warning | 1 info

### Findings

#### [WARNING] forge/hooks/check-update.sh:44,55
- **Check**: A — Hook Scripts / Network calls
- **Issue**: `curl` calls to `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` (version check). Justified by plugin function — fetches only the plugin manifest to compare versions. Max timeout 5s, silent on failure, cached for 24h.
- **Excerpt**: `REMOTE_VERSION=$(curl -sf --max-time 5 "$REMOTE_URL" 2>/dev/null | jq -r '.version // ""' 2>/dev/null || echo "")`
- **Recommendation**: Safe — version check to official repo only. No credentials or user data transmitted.

#### [INFO] forge/hooks/check-update.js:49
- **Check**: A — Hook Scripts / Network calls
- **Issue**: `https.get` to same `raw.githubusercontent.com` URL as the shell variant. Node.js built-in HTTPS module, 5s timeout, no credentials sent.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => { ... })`
- **Recommendation**: Safe — identical purpose and destination as the shell hook.

### Clean Areas
- `forge/commands/` (13 files) — no issues detected
- `forge/init/` (11 files) — no issues detected
- `forge/meta/` (24 files) — no issues detected; "impact assessment" string in meta-architect.md is domain-appropriate, not credential access
- `forge/vision/` (9 files) — no issues detected
- `forge/tools/` (4 files) — no issues detected; all use Node.js built-ins only
- `forge/schemas/` (4 files) — no issues detected; pure JSON Schema
- `forge/hooks/list-skills.js`, `forge/hooks/list-skills.sh` — no issues detected; read-only filesystem queries
- `forge/hooks/triage-error.js` — no issues detected; stdin-only, no network, no file writes
- `forge/hooks/hooks.json` — 2 hooks registered (SessionStart, PostToolUse:Bash), reasonable timeouts (10s, 5s)
- `forge/.claude-plugin/plugin.json` — no `allowed-tools` field, no permission escalation
- `forge/migrations.json` — data only, no executable content
- `forge/sdlc-config.schema.json` — pure JSON Schema

### Additional Checks
- **No binary files** in plugin directory
- **No compiled artifacts** (.pyc, .so, .class, .exe, .dylib)
- **No zero-width Unicode characters** detected
- **No base64 blobs** in markdown files
- **No eval()** or code injection patterns
- **No credential/secret access** patterns
- **No prompt injection** patterns detected
- **No settings.json or allowed-tools manipulation**
- **Plugin size**: 544K — appropriate for functionality
- **No npm dependencies** — all scripts use Node.js built-ins only

### Verdict

**SAFE TO USE**

All 79 files scanned. The only network activity is a daily version-check to the plugin's own GitHub repository — no credentials transmitted, cached for 24h, fails silently. No prompt injection, no credential access, no permission escalation, no binary artifacts. Changes in v0.3.14 are limited to validate-store.cjs (validation logic) and validate-store.spec.md (documentation) — both purely local file operations.
