## Security Scan — forge:forge — 2026-04-15

**SHA**: not recorded (source scan — local `forge/` directory) | **Installed**: 2026-04-09T18:02:54.923Z | **Last updated**: 2026-04-15T11:08:02.491Z
**Scope**: local | **Install path**: /home/boni/src/forge/forge/ (source scan, not cache)

### Summary
106 files scanned | 0 critical | 1 warning | 2 info

### Findings

#### [WARNING] forge/commands/update.md
- **Check**: B — large file
- **Issue**: 902 lines — the largest file in the plugin. Reviewed in full; no hidden instructions found after apparent document end, no HTML comments, no injection patterns. The size is justified: `update.md` implements a multi-step migration orchestration workflow (version check, install, apply migrations, pipeline audit, summary). All sections are clearly labeled and correspond to the command's declared purpose.
- **Excerpt**: `description: Check for Forge updates, review changes, install, and apply migrations — all in one command`
- **Recommendation**: Monitor for size growth in future versions. Current content is clean.

#### [INFO] forge/hooks/check-update.js — outbound HTTPS call
- **Check**: A — network call in hook
- **Issue**: `check-update.js` makes one outbound `https.get()` call on `SessionStart`. The destination URL is read from `plugin.json`'s `updateUrl` field (distribution-aware). The fallback URL is `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`. This is a legitimate version-check call to the official GitHub raw content host for the plugin's own repository.
- **Excerpt**: `const FALLBACK_UPDATE_URL = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Safe. The call is read-only (fetches `plugin.json` for version string only), has a 5-second timeout, handles errors silently, and never transmits user data. The URL is resolved from the installed plugin's own manifest, not hardcoded per-distribution, which prevents URL injection during distribution switches.

#### [INFO] forge/hooks/hooks.json — two event types registered
- **Check**: C — hooks registered on multiple event types
- **Issue**: Two hook event types: `SessionStart` (check-update.js) and `PostToolUse` (triage-error.js). Both are scoped and purposeful: the SessionStart hook does update detection and context injection; the PostToolUse hook is restricted to `Bash` tool calls via the `matcher` field and only fires on non-zero exits from Forge-related commands.
- **Excerpt**: `"matcher": "Bash"` — PostToolUse is properly gated
- **Recommendation**: Safe. Both hooks exit 0 on any error (`process.on('uncaughtException', () => process.exit(0))`), have defined timeouts (10s and 5s respectively), use only Node.js built-ins, and scope their actions appropriately.

### Clean Areas

- `forge/hooks/check-update.js` — no credential reads, no env var capture, no persistence, no eval, proper error handling, `'use strict'`, uncaughtException guard
- `forge/hooks/triage-error.js` — no network calls, no file writes outside the plugin's concern, reads stdin event JSON only, proper error handling
- `forge/tools/*.cjs` and `forge/tools/*.js` — all use only Node.js built-ins (`fs`, `path`, `os`, `https`) plus internal `./store.cjs` dependency; no npm requires; no network calls in any tool; no exec/spawn/eval
- `forge/.claude-plugin/plugin.json` — no `allowed-tools` declarations (plugin does not claim expanded permissions); no dangerous fields
- `forge/hooks/hooks.json` — no unrestricted `allowed-tools: ["Bash"]`; PostToolUse gated by `matcher: "Bash"`; timeouts within acceptable range
- `forge/meta/workflows/meta-fix-bug.md` (modified in v0.9.5) — new PERSONA_MAP + spawn_subagent announcement algorithm reviewed; no injection patterns, no exfiltration instructions, no permission escalation; changes are additive algorithm documentation only
- `forge/migrations.json` — data-only JSON; no executable content
- All markdown files — no zero-width Unicode characters; no base64 blobs; no HTML comments with hidden instructions; no post-document-end content
- All hooks: `'use strict'` present; `process.on('uncaughtException', () => process.exit(0))` present
- No binary or compiled files found in plugin directory (816K total, all text/JSON/JS/Markdown)
- No environment variable capture for TOKEN, SECRET, KEY, PASSWORD, AUTH, API_KEY
- No credential-adjacent path reads (no .ssh, .aws, .gnupg, .env, .pem, .key access)
- No shell init file writes (.bashrc, .zshrc, .profile)
- No persistence mechanisms (no crontab, systemctl, launchctl, nohup)
- No sudo usage
- No software installation (no apt-get, brew install, npm install -g)

### Verdict

**SAFE TO USE**

106 files scanned across hooks, tools, commands, meta-workflows, schemas, and vision docs. No critical findings. The one warning (update.md file size) is cosmetic. The two info-level items (outbound HTTPS version check and dual hook registration) are both justified by the plugin's declared functionality and implemented safely with proper timeouts, error handling, and minimal data exposure. The v0.9.5 change (PERSONA_MAP + announcement algorithm added to meta-fix-bug.md) is clean — additive Markdown documentation with no executable side effects.
