## Security Scan — forge:forge — 2026-04-16

**SHA**: canary/source install (not recorded) | **Installed**: n/a | **Last updated**: 2026-04-16
**Scope**: user (canary) | **Install path**: /home/boni/src/forge/forge/

### Summary

126 files scanned | 0 critical | 2 warnings | 3 info

---

### Findings

#### [WARNING] forge/hooks/check-update.js:44,77
- **Check**: A — Hook Scripts / outbound network call
- **Issue**: `https.get()` fetches `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` on `SessionStart`. The URL is read from the installed `plugin.json` `updateUrl` field, with a hardcoded GitHub raw fallback. Destination is a known Entelligentsia release endpoint. The call is throttled to once per 24 hours via a local cache file. No user data is included in the request.
- **Excerpt**: `const FALLBACK_UPDATE_URL = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Safe — outbound is version-check only, to a documented official endpoint, rate-limited, data-free. No action required.

#### [WARNING] forge/hooks/check-update.js:24,54
- **Check**: A — Hook Scripts / writes to temp location
- **Issue**: Plugin-level throttle cache written to `os.tmpdir()/forge-plugin-data/update-check-cache.json` (typically `/tmp`). Content is `{ lastCheck, remoteVersion }` — no sensitive data. Location is explicitly chosen so the cache is shared across projects without requiring a project-specific directory.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Safe — data written is non-sensitive version metadata. The `CLAUDE_PLUGIN_DATA` env var allows users to override the path. No action required.

#### [INFO] forge/commands/update.md:130
- **Check**: B — Skill / Command files
- **Issue**: `update.md` instructs Claude to use `WebFetch` or `curl` to fetch the remote plugin manifest. The URL is resolved from the installed `plugin.json` `updateUrl` field. This is an intentional version-check mechanism, not a free-form network call.
- **Excerpt**: `Use the WebFetch tool (preferred) or \`curl\` via Bash:`
- **Recommendation**: Safe — URL resolved from plugin-controlled field pointing to documented release endpoint. No action required.

#### [INFO] forge/agents/tomoshibi.md
- **Check**: B — Agent file
- **Issue**: New agent added in v0.10.0. Description accurately matches body. No persona hijacking, no permission escalation, no exfiltration instructions. Reads agent instruction files (CLAUDE.md etc.) for presence/marker checks only — content is never executed or interpolated into section bodies. Writes only fixed templates with path substitution from config.
- **Excerpt**: `description: Tomoshibi (灯) — Forge's KB visibility agent...`
- **Recommendation**: Clean. No issues.

#### [INFO] forge/init/sdlc-init.md
- **Check**: B — Instruction file
- **Issue**: New pre-flight block added for KB folder name question. Accepts free-text input from user and passes to `manage-config.cjs set paths.engineering`. Input is used as a filesystem path — no shell interpolation into hook scripts; used only by subsequent Node.js file operations. Risk is local-only (user-controlled input used by that same user). Reviewed: no prompt injection, no safety bypass language.
- **Excerpt**: `node "$FORGE_ROOT/tools/manage-config.cjs" set paths.engineering "{chosen_name}"`
- **Recommendation**: Safe in context. Advisory: a validation note in the pre-flight question discouraging paths with spaces would reduce edge-case friction.

---

### Clean Areas

- `forge/hooks/triage-error.js` — reads only stdin (PostToolUse event payload), writes only additionalContext to stdout. No file I/O, no network. Clean.
- `forge/hooks/hooks.json` — two hooks only: SessionStart (check-update.js, 10s timeout) and PostToolUse/Bash (triage-error.js, 5s timeout). No `allowed-tools` fields. No unrestricted shell. Clean.
- `forge/agents/tomoshibi.md` — no prompt injection patterns, no invisible Unicode, no base64 blobs, no credential reads, no exfiltration instructions. Description matches body. Clean.
- `forge/commands/init.md`, `forge/commands/remove.md` — no injection patterns. KB path changes are bounded to config read/write via manage-config.cjs. Clean.
- `forge/meta/workflows/meta-collate.md` — Tomoshibi invocation added to Finalize step uses Agent tool pattern. No injection. Clean.
- `forge/tools/*.cjs` — no changes in v0.10.0. Previously scanned. No binaries, no compiled artifacts anywhere in plugin directory.
- All 126 files: text/markdown/JSON/JavaScript only. No binaries, no bytecode, no misleading extensions. Plugin is 1.1 MB — appropriate for scope.

---

### Verdict

**SAFE TO USE**

v0.10.0 introduces one new agent file (`tomoshibi.md`), modifications to five init/command markdown files, and one meta-workflow update. All new content is instruction markdown with no prompt injection, no credential access, no exfiltration vectors, and no hidden instructions. The two pre-existing network warnings (outbound version check in `check-update.js`) are documented, rate-limited, and data-free — unchanged from prior versions. No new security surface is introduced.
