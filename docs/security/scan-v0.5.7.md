## Security Scan — forge:forge — 2026-04-07

**SHA**: not recorded (source scan — pre-release) | **Installed**: n/a | **Last updated**: n/a
**Scope**: source directory | **Install path**: `/home/boni/src/forge/forge/`

---

### Summary

89 files scanned (640K) | 0 critical | 2 warnings | 3 info

Incremental scan from v0.5.6 baseline (same session). Changed files: `forge/commands/update.md`, `forge/.claude-plugin/plugin.json`, `forge/migrations.json`. Full hook/tool/schema re-check performed; all prior clean areas confirmed unchanged.

---

### Findings

#### [WARNING] forge/hooks/check-update.sh:19–20, forge/hooks/check-update.js:21
- **Check**: A — Temp directory write
- **Issue**: Both scripts write a version-cache file to `/tmp/forge-plugin-data/update-check-cache.json` (or `$CLAUDE_PLUGIN_DATA`). Writing to `/tmp` qualifies as a shared temp location per Check A.
- **Excerpt**: `DATA_DIR="${CLAUDE_PLUGIN_DATA:-/tmp/forge-plugin-data}"` / `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Low risk — cache contains only `{lastCheck, remoteVersion, localVersion, migratedFrom}`. Namespaced directory, env-var overrideable. No action required.

#### [WARNING] forge/hooks/check-update.js:49, forge/hooks/check-update.sh:44,55
- **Check**: A — Outbound network call
- **Issue**: Both hook scripts make an outbound HTTPS GET to `raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` on SessionStart when the 24-hour cache has expired.
- **Excerpt**: `const remoteUrl = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Expected and justified — version-check endpoint on `raw.githubusercontent.com`. Read-only GET, no user data sent, 5-second timeout, graceful degradation on failure.

#### [INFO] forge/hooks/hooks.json:9
- **Check**: C — Hook timeout
- **Issue**: `SessionStart` hook timeout is 10,000ms, above the 5s advisory threshold.
- **Excerpt**: `"timeout": 10000`
- **Recommendation**: Justified by the network fetch in `check-update.js`. Acceptable.

#### [INFO] forge/hooks/list-skills.js:27–30, forge/hooks/list-skills.sh:21
- **Check**: A — File system read of user config
- **Issue**: Both files read `~/.claude/plugins/installed_plugins.json` and enumerate `~/.claude/skills/`.
- **Excerpt**: `path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json')`
- **Recommendation**: Justified — correct source for skill availability. No data written or transmitted.

#### [INFO] forge/hooks/hooks.json:13–25
- **Check**: C — PostToolUse hook with Bash matcher
- **Issue**: `triage-error.js` fires after every Bash call to detect Forge-related errors.
- **Excerpt**: `"matcher": "Bash"` + `"command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/triage-error.js\""`
- **Recommendation**: Allowlist-scoped pattern matching, no writes, no network. Clean.

---

### New in v0.5.7 — forge/commands/update.md

The canary detection block added in this version reads `CLAUDE_PLUGIN_ROOT` (already present in v0.5.6 via `!echo "${CLAUDE_PLUGIN_ROOT}"`) and performs a string containment check against `"/.claude/plugins/cache/"`. This is:

- A path string comparison — not a credential read
- Used solely to branch between "skip install" and "guide through plugin manager" — no data sent anywhere
- **Clean** — no new security surface introduced

---

### Clean Areas

- `forge/commands/update.md` — canary detection logic is clean: string path check only, no network calls, no credential reads, no prompt injection
- `forge/meta/workflows/` — all 14 workflow files unchanged from v0.5.6 scan
- `forge/tools/` — all CJS tools unchanged
- `forge/hooks/` — all hook scripts unchanged
- `forge/schemas/`, `forge/migrations.json`, `forge/.claude-plugin/plugin.json` — metadata only
- No binary files, compiled artifacts, invisible Unicode, or base64 blobs anywhere in source tree

---

### Verdict

**SAFE TO USE**

v0.5.7 introduces one Markdown change (canary detection in `forge/commands/update.md`) and two JSON changes (version bump, migration entry). The canary detection is a plain string check with no security surface. All prior findings carry forward unchanged and remain low-risk/justified.
