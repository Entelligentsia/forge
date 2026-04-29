## Security Scan — forge:forge — 2026-04-16

**SHA**: not recorded (source scan) | **Installed**: 0.9.9 (cached) | **Source scanned**: `forge/` at repo HEAD
**Scope**: local + user | **Source path**: `/home/boni/src/forge/forge/`

### Summary
113 files scanned | 0 critical | 1 warning | 2 info

### Findings

#### [WARNING] forge/hooks/check-update.js:77
- **Check**: A — Hook Scripts
- **Issue**: Outbound HTTPS network call to `raw.githubusercontent.com` for version check. The URL is read from `plugin.json`'s `updateUrl` field (not hardcoded), and the response is only parsed for a `version` field. No data is sent beyond the GET request. This is the plugin's legitimate update-check mechanism, but any outbound network call is flagged by policy.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe to ignore — this is the documented update-check endpoint. The URL is configurable per distribution branch and only fetches version metadata.

#### [INFO] forge/commands/update.md:130
- **Check**: B — Skill/Command Files
- **Issue**: The update command instructs users to use `curl` via Bash to fetch migration JSON if `WebFetch` is unavailable. This is an explicit fallback for the update workflow, not automatic network access.
- **Excerpt**: `Use the WebFetch tool (preferred) or curl via Bash:`
- **Recommendation**: Safe to ignore — this is documented user-facing guidance for the update path, not automatic exfiltration.

#### [INFO] forge/commands/add-task.md (NEW)
- **Check**: B — Skill/Command Files
- **Issue**: New command file takes user input (title, objective, acceptance criteria) and writes it to project-local files. The content stays within the user's own project directory. No network calls, no credential access, no environment variable capture beyond the standard `CLAUDE_PLUGIN_ROOT`.
- **Excerpt**: N/A (no issues found)
- **Recommendation**: Clean — no action needed.

### Clean Areas
- `forge/hooks/check-update.js` — proper hook discipline: `'use strict';`, `process.on('uncaughtException', () => process.exit(0))`, exits 0 on all error paths
- `forge/hooks/triage-error.js` — proper hook discipline: stdin-based, no network calls, no credential access, clean no-op on all errors
- `forge/tools/*.cjs` — all use `'use strict';`, top-level try/catch, `process.exit(1)` on error, `--dry-run` support, paths from config
- `forge/schemas/*.schema.json` — all preserve `additionalProperties: false`
- `forge/commands/*.md` (all 13) — no prompt injection patterns, no invisible Unicode, no credential access instructions, no exfiltration paths
- `forge/meta/**/*.md` — all meta-definitions are clean; no injection, no hidden instructions
- No `require()` calls for non-built-in modules anywhere in the codebase
- No binaries, compiled code, or bytecode files found

### Verdict

**SAFE TO USE**

Zero critical findings. The one warning is the documented update-check HTTPS call to GitHub raw content, which is the plugin's legitimate and configurable update mechanism. The new `add-task.md` command is clean — no injection, no credential access, no network calls.