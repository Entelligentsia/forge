## Security Scan — forge:forge — 2026-04-07

**SHA**: not recorded (source scan — pre-release) | **Installed**: n/a | **Last updated**: n/a
**Scope**: source directory | **Install path**: `/home/boni/src/forge/forge/`

---

### Summary

89 files scanned (640K) | 0 critical | 2 warnings | 3 info

Incremental scan from v0.5.7 baseline. Changed files: `forge/commands/update.md` (679 lines — checked in full including tail), `forge/.claude-plugin/plugin.json`, `forge/migrations.json`. All hooks, tools, schemas, and other commands confirmed unchanged from prior clean baseline.

---

### Findings

#### [WARNING] forge/hooks/check-update.sh:44,55, forge/hooks/check-update.js:49
- **Check**: A — Outbound network call
- **Issue**: Both hook scripts make an outbound HTTPS GET to `raw.githubusercontent.com` on SessionStart when the 24-hour cache expires.
- **Excerpt**: `const remoteUrl = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Justified — read-only version check to official release endpoint, 5s timeout, no user data sent, graceful degradation.

#### [WARNING] forge/hooks/check-update.sh:19, forge/hooks/check-update.js:21
- **Check**: A — Temp directory write
- **Issue**: Cache file written to `/tmp/forge-plugin-data/` (or `$CLAUDE_PLUGIN_DATA`).
- **Excerpt**: `DATA_DIR="${CLAUDE_PLUGIN_DATA:-/tmp/forge-plugin-data}"`
- **Recommendation**: Low risk — content is `{lastCheck, remoteVersion, localVersion, migratedFrom}` only. Namespaced, env-var overrideable.

#### [INFO] forge/hooks/hooks.json:9
- **Check**: C — Hook timeout
- **Issue**: SessionStart timeout 10,000ms (above 5s advisory).
- **Recommendation**: Justified by network round-trip. Acceptable.

#### [INFO] forge/hooks/list-skills.js:27–30, forge/hooks/list-skills.sh:21
- **Check**: A — User config read
- **Issue**: Reads `~/.claude/plugins/installed_plugins.json` and `~/.claude/skills/`.
- **Recommendation**: Justified — skill availability lookup, no data written or transmitted.

#### [INFO] forge/hooks/hooks.json:13–25
- **Check**: C — PostToolUse/Bash hook
- **Issue**: `triage-error.js` fires after every Bash call.
- **Recommendation**: Allowlist-scoped, no writes, no network. Clean.

---

### New in v0.5.8 — forge/commands/update.md

The Step 2A/2B split restructures the decision table so the LLM cannot reach the install prompt when the plugin is already current. Key changes reviewed:

- Step 2B carries explicit `**Do NOT show an install prompt here.**` instruction — no security surface
- Both Step 2A and 2B fetch only from `raw.githubusercontent.com` (version check endpoint) — no new network destinations
- No credential reads, no env var captures, no prompt injection patterns
- File is 679 lines — full tail inspected (lines 630–679), no hidden instructions after final `---`

**Clean.**

---

### Clean Areas

- `forge/commands/update.md` — restructured routing logic only; no injection, no hidden content, no new network calls
- `forge/hooks/` — all hook scripts unchanged from v0.5.7
- `forge/tools/` — all CJS tools unchanged
- `forge/meta/` — all workflow and persona files unchanged
- `forge/schemas/`, `forge/migrations.json`, `forge/.claude-plugin/plugin.json` — metadata only
- No binaries, compiled artifacts, invisible Unicode, or base64 blobs

---

### Verdict

**SAFE TO USE**

v0.5.8 is a pure UX fix to `forge/commands/update.md` — the Step 2A/2B routing change introduces no new security surface. All prior findings carry forward as low-risk/justified.
