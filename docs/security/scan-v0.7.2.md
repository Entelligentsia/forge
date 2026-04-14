## Security Scan — forge:forge — 2026-04-14

**SHA**: source scan (pre-commit) | **Installed**: N/A | **Last updated**: 2026-04-14
**Scope**: source directory | **Install path**: forge/

### Summary
102 files scanned | 0 critical | 0 warnings | 3 info

### Findings

#### [INFO] forge/hooks/check-update.js:44,77
- **Check**: A — Hook network call
- **Issue**: Outbound HTTPS GET on `SessionStart` to fetch remote plugin version. URL is read from `plugin.json → updateUrl` at runtime with a hardcoded fallback to `raw.githubusercontent.com/Entelligentsia/forge/main/...`. No user data is transmitted — only a version string is read from the response.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, ...)`
- **Recommendation**: Expected and justified. URL is scoped to the official release endpoint. Fallback is to the same domain. No data exfiltration path.

#### [INFO] forge/hooks/check-update.js:124-131
- **Check**: A — File write in hook
- **Issue**: Hook writes to `.forge/config.json` to keep `paths.forgeRoot` in sync with the active plugin root after a distribution switch. Write is scoped to the project directory only; no writes to shared or system paths.
- **Excerpt**: `fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n')`
- **Recommendation**: Expected and documented behaviour. Write is bounded to `.forge/config.json` in the current working directory. No concern.

#### [INFO] forge/hooks/check-update.js:192-208
- **Check**: A — File write in hook
- **Issue**: Hook writes to `.forge/update-check-cache.json` and a plugin-level cache file under `CLAUDE_PLUGIN_DATA` (defaults to `os.tmpdir()/forge-plugin-data/`). Used for throttling daily update checks and recording migration state. No sensitive data stored.
- **Excerpt**: `fs.writeFileSync(projectCacheFile, JSON.stringify(...))`
- **Recommendation**: Expected. Writes to `/tmp` equivalent is noted but the content is version metadata only — no credentials, no user data.

### Clean Areas

- `forge/hooks/triage-error.js` — no network calls, no file writes, reads only stdin (PostToolUse event payload), outputs additionalContext to stdout only
- `forge/hooks/list-skills.js` — no network calls, reads `~/.claude/plugins/installed_plugins.json` (read-only, expected for skill enumeration)
- `forge/hooks/hooks.json` — two hooks only (SessionStart, PostToolUse/Bash); timeouts 10000ms and 5000ms; no unrestricted Bash; no `allowed-tools` escalation
- `forge/tools/*.cjs` — all tools use Node.js built-ins only; no network calls; no eval; no credential reads; no dangerous shell invocations
- `forge/commands/*.md` — no prompt injection patterns detected; no persona hijacking; no safety bypass language; no exfiltration instructions; no hidden content after document end
- `forge/meta/**/*.md` — no prompt injection; no invisible unicode; no base64 blobs; no credential references
- `forge/.claude-plugin/plugin.json` — no unexpected fields; `updateUrl` and `migrationsUrl` both point to `raw.githubusercontent.com/Entelligentsia/forge/`
- `forge/schemas/*.json` — pure JSON Schema definitions; no executable content
- No binary files, compiled artifacts (.pyc, .class, .so, .exe, .dylib), or files with misleading extensions found
- Total size 712K — well within expected range for a skill/workflow plugin of this scope

### Verdict

**SAFE TO USE**

102 files scanned across hooks, tools, commands, meta-workflows, personas, and schemas. No critical or warning-level findings. The three info findings are all expected, documented behaviours (version check network call, project config sync write, update cache write). No prompt injection, no credential access, no exfiltration paths, no persistence mechanisms, no hidden instructions.
