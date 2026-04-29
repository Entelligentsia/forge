## Security Scan — forge:forge — 2026-04-16

**SHA**: not recorded (canary/source install) | **Installed**: 2026-04-16 | **Last updated**: 2026-04-16
**Scope**: local | **Install path**: /home/boni/src/forge/forge/

### Summary

111 files scanned | 0 critical | 1 warning | 3 info

### Scope

Version 0.9.9 introduced the following new and modified files:

**New files:**
- `forge/tools/banners.cjs` — ANSI art banner library (10 agent identities, 3 render modes)
- `forge/tools/banners.sh` — bash wrapper around banners.cjs

**Modified files:**
- `forge/meta/workflows/` — banner integration into orchestrator announcement algorithms
- `forge/meta/personas/` — Banner field and banner command added to Persona block format

All findings are carry-forward from [scan-v0.9.8.md](scan-v0.9.8.md). No new findings introduced by the 0.9.9 banner library additions.

---

### Findings

#### [INFO] forge/hooks/check-update.js
- **Check**: A — Hook Scripts (network call)
- **Issue**: Outbound HTTPS GET to `raw.githubusercontent.com` on every SessionStart where the update-check interval (24h) has elapsed.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, ...)`
- **Recommendation**: Safe. Destination is the official `Entelligentsia/forge` GitHub repo. URL is read from the installed `plugin.json updateUrl` field (not hardcoded). 5-second timeout with graceful fallback. Core function of the update-check hook.

#### [INFO] forge/hooks/check-update.js
- **Check**: A — Hook Scripts (writes to config file)
- **Issue**: Writes `paths.forgeRoot` into `.forge/config.json` to sync the plugin root path on distribution switch.
- **Excerpt**: `fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');`
- **Recommendation**: Safe. Write is scoped to the project's own `.forge/config.json`. No sensitive data written. Non-fatal on failure.

#### [WARNING] forge/hooks/hooks.json
- **Check**: C — Permissions (PostToolUse on Bash)
- **Issue**: Hook registered on `PostToolUse` with matcher `Bash` — fires after every Bash tool invocation.
- **Excerpt**: `"matcher": "Bash", "hooks": [{"type": "command", "command": "node .../triage-error.js", "timeout": 5000}]`
- **Recommendation**: Accepted. `triage-error.js` reads stdin, emits `additionalContext` for Forge-related errors only. No network calls, no credential reads, no writes to sensitive paths. Timeout 5000ms (within 30s limit).

#### [INFO] forge/commands/report-bug.md
- **Check**: B — Commands (reads local config, network via `gh`)
- **Issue**: Reads `.forge/config.json` and files GitHub issues via `gh issue create --repo Entelligentsia/forge`.
- **Excerpt**: `forge_config: !cat ".forge/config.json" 2>/dev/null | head -30`
- **Recommendation**: Safe. Interactive with explicit confirmation. Requires user-authenticated `gh` CLI. Issues filed to public Entelligentsia/forge repo.

---

### New File Review (0.9.9)

#### forge/tools/banners.cjs
Pure JavaScript ANSI art rendering library. 10 static banner definitions. Three render modes (full/badge/mark). No network calls, no file system writes, no credential access, no eval. CLI mode for direct invocation. Exports clean module API. No security concerns.

#### forge/tools/banners.sh
Thin bash wrapper: sets `_BANNERS_JS` to the absolute path of `banners.cjs` and defines 5 functions that invoke `node "$_BANNERS_JS"` with fixed flags. No network, no eval, no credential reads, no environment variable capture. Clean.

---

### Clean Areas

- `forge/tools/banners.cjs` — no network, no FS writes, no credential access; pure ANSI rendering library
- `forge/tools/banners.sh` — no network, no eval; thin bash wrapper
- All other tool, hook, command, and schema files — see [scan-v0.9.8.md](scan-v0.9.8.md) for full details
- No prompt injection patterns detected in any markdown file
- No binary files, compiled artifacts, or misleading extensions detected

---

### Verdict

**SAFE TO USE**

111 files scanned. No new findings at v0.9.9. The banner library additions (banners.cjs, banners.sh) are pure rendering utilities with no network access, no credential reads, and no file system side effects. All prior findings from v0.9.8 carry forward unchanged (1 accepted warning, 3 info). See [scan-v0.9.8.md](scan-v0.9.8.md) for the full baseline.
