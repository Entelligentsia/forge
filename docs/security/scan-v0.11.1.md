## Security Scan — forge@forge — 2026-04-16

**SHA**: `3aae08d58786525be13a68ca1de14d5412e187e3` (user-scope cache, v0.11.0 base; source scanned at v0.11.1 pending push) | **Installed**: 2026-04-13T15:24:09.164Z | **Last updated**: 2026-04-16T15:07:51.697Z
**Scope**: user + local (forge project) | **Install path**: `/home/boni/.claude/plugins/cache/forge/forge/0.11.0` (source scanned: `/home/boni/src/forge/forge/`)

### Summary
120 files scanned | 0 critical | 1 warning | 1 info

### Findings

#### [WARNING] hooks/check-update.js:24
- **Check**: A — Hook script writes to shared temp location
- **Issue**: Cache directory defaults to `os.tmpdir()/forge-plugin-data` when `CLAUDE_PLUGIN_DATA` env var is absent. This writes throttle state (last-check timestamp, remote version string) to `/tmp`.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Low risk — data written is non-sensitive (version strings only, no credentials or user data). No other process is likely to read or tamper with this specific path. Safe to use as-is; could be hardened by using `~/.cache/forge/` instead of `/tmp`. Carry-forward from v0.9.14.

#### [INFO] hooks/check-update.js:77
- **Check**: A — Outbound network call
- **Issue**: `https.get` to URL derived from the installed `plugin.json`'s `updateUrl` field. Fallback URL is `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Justified — this is the documented version-check mechanism. Destination is a version-check endpoint on `raw.githubusercontent.com`. Throttled to once per 24 hours. No user data transmitted. The URL comes from the installed plugin's own manifest, not from user input or external sources.

### Clean Areas
- `hooks/triage-error.js` — no network calls, no file writes, reads stdin only
- `hooks/hooks.json` — both hook timeouts within limits (10 s SessionStart, 5 s PostToolUse); no untrusted variable interpolation in command strings
- `tools/banners.sh` — pure Node.js wrapper, no network, no credentials
- `tools/list-skills.js` — reads `installed_plugins.json` and `~/.claude/skills/` to enumerate skills; no network, no writes
- `commands/` (all 13 files) — no prompt injection, no persona hijacking, no permission escalation; `WebFetch`/`curl` reference in `update.md` scoped to declared `{UPDATE_URL}` from `plugin.json`
- `meta/` (all persona, workflow, skill, template, store-schema files) — no injection phrases, no hidden HTML comments, no invisible Unicode, no base64 blobs
- `init/` (discovery, generation, sdlc-init, smoke-test, workflow-gen-plan.json) — clean
- `schemas/` — JSON schemas only, no executable content
- `tools/*.cjs` — all pure Node.js built-ins only, no network calls, no credential reads
- No binary or compiled files anywhere in source tree
- No zero-width or invisible Unicode characters (U+200B, U+FEFF, U+200C, U+200D, U+00AD) detected across all 120 files
- Total size 1.1 MB — well within 5 MB threshold

### Verdict

**SAFE TO USE**

No critical issues found. The single warning (temp-dir cache write) involves only non-sensitive version metadata and has carried forward without remediation since v0.9.14; risk is minimal and accepted. The outbound network call is the documented, rate-limited update-check mechanism targeting a known GitHub raw content endpoint.
