## Security Scan — forge:forge — 2026-04-14

**SHA**: d7ebd8faefbaab523d9a76840699c8cb387bd806 (user scope) | **Installed**: 2026-04-13T04:23:17.026Z | **Last updated**: 2026-04-14T03:10:39.823Z
**Scope**: user | **Install path**: /home/boni/.claude/plugins/cache/forge/forge/0.7.2
**Source scanned**: /home/boni/src/forge/forge/ (version 0.7.9)

### Summary
102 files scanned | 0 critical | 1 warning | 2 info

### Findings

#### [WARNING] hooks/list-skills.js:21
- **Check**: A — Hook Scripts
- **Issue**: `list-skills.js` is located in the `hooks/` directory and uses `process.on('uncaughtException', () => process.exit(1))`. Hook scripts MUST exit 0 on failure to avoid surfacing noise in Claude Code sessions. However, this file is **not registered in `hooks.json`** — it is a utility query helper invoked by commands and `sdlc-init.md` directly. The `exit(1)` behaviour is semantically correct for its actual role (query exit code signals skill availability). Low risk given it is not a hook, but the placement in `hooks/` creates ambiguity.
- **Excerpt**: `process.on('uncaughtException', () => process.exit(1));`
- **Recommendation**: Move `list-skills.js` to `tools/` to clarify it is not a lifecycle hook, or add a comment to `hooks.json` explaining it is intentionally excluded. No security action needed.

#### [INFO] commands/update.md:112
- **Check**: B — Skill/Command files
- **Issue**: `update.md` instructs use of `WebFetch` or `curl` to fetch from GitHub (`raw.githubusercontent.com`). The destination URL is read from the installed `plugin.json` (`updateUrl` / `migrationsUrl` fields), not hardcoded to an arbitrary domain. This is the intended update-check mechanism and is clearly scoped to the Entelligentsia/forge repository. Flagged for completeness.
- **Excerpt**: `Use the WebFetch tool (preferred) or curl via Bash:`
- **Recommendation**: Safe. The URL source is the installed plugin.json, and the default/fallback URLs resolve to `raw.githubusercontent.com/Entelligentsia/forge`. No action required.

#### [INFO] hooks/check-update.js:77
- **Check**: A — Hook Scripts
- **Issue**: Makes an outbound HTTPS call on every `SessionStart` (throttled to once per 24h). Destination is resolved from `plugin.json → updateUrl`, defaulting to `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`. This is the intended version-check mechanism. Flagged for completeness as an outbound network call.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe. Destination is a public GitHub raw URL, response is parsed only for `.version` string, no data is sent, 5-second timeout prevents hanging. No action required.

### Clean Areas

- `hooks/check-update.js` — proper `'use strict'`, `uncaughtException → exit(0)`, no credential access, no env variable capture, output is `additionalContext` only
- `hooks/triage-error.js` — proper `'use strict'`, `uncaughtException → exit(0)`, only reads `tool_input.command` and `tool_response.exitCode/stderr/output`, no exfiltration
- `hooks/hooks.json` — two hooks only (SessionStart + PostToolUse/Bash), timeouts 10000ms and 5000ms (within 30s threshold), no unrestricted Bash access
- `tools/collate.cjs`, `tools/validate-store.cjs`, `tools/seed-store.cjs`, `tools/store.cjs`, `tools/manage-config.cjs`, `tools/estimate-usage.cjs`, `tools/generation-manifest.cjs` — all `'use strict'`, built-ins only (`fs`, `path`, `os`, `https`, `crypto`), no `require()` of non-built-in modules, `--dry-run` flags honoured
- `commands/regenerate.md` (modified in this task) — no prompt injection, no HTML comments, no hidden sections, no network calls, no credential access
- `meta/personas/`, `meta/workflows/`, `meta/skills/` — no prompt injection phrases, no persona hijacking, no safety bypass instructions
- `forge/.claude-plugin/plugin.json` — minimal, well-formed; no unexpected fields
- No binary files, compiled artifacts, or misleading extensions anywhere in the plugin
- No invisible Unicode characters found
- No base64-encoded blobs found
- No persistence mechanisms (crontab, systemctl, launchctl) found
- No credential-adjacent path reads (`~/.ssh/`, `~/.aws/`, `.env`, `*.key`) in any file

### Verdict

**SAFE TO USE**

102 files scanned across hooks, tools, commands, personas, and meta-workflows. No critical findings. One low-risk warning about `list-skills.js` placement in `hooks/` (not registered as a hook; exits 1 on error by design as a query utility). All JS tools use `'use strict'`, built-ins only, and proper error handling. Network activity is limited to a throttled version-check against `raw.githubusercontent.com`. The modified `commands/regenerate.md` (v0.7.9 change) introduces no new security concerns.
