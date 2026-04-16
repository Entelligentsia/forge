## Security Scan — forge@forge — 2026-04-16

**SHA**: `3aae08d58786525be13a68ca1de14d5412e187e3` (user-scope cache, v0.11.1 base; source scanned at v0.11.2 pending push) | **Installed**: 2026-04-13T15:24:09.164Z | **Last updated**: 2026-04-16T15:07:51.697Z
**Scope**: user + local (forge project) | **Install path**: `/home/boni/.claude/plugins/cache/forge/forge/0.11.0` (source scanned: `/home/boni/src/forge/forge/`)

### Summary
130 files scanned | 0 critical | 1 warning | 1 info

### Findings

#### [WARNING] hooks/check-update.js:24
- **Check**: A — Hook script writes to shared temp location
- **Issue**: Cache directory defaults to `os.tmpdir()/forge-plugin-data` when `CLAUDE_PLUGIN_DATA` env var is absent. Writes non-sensitive throttle state (last-check timestamp, remote version string) to `/tmp`.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Low risk — data written is non-sensitive, no other process targets this path. Accepted carry-forward from v0.9.14.

#### [INFO] hooks/check-update.js:77
- **Check**: A — Outbound network call
- **Issue**: `https.get` to URL derived from the installed `plugin.json`'s `updateUrl` field. Fallback URL is `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Justified — documented version-check mechanism, rate-limited to once per 24 hours, targets `raw.githubusercontent.com` version-check endpoint, no user data transmitted.

### Clean Areas
- `init/generation/generate-workflows.md` — v0.11.2 change reverting incorrect frontmatter-strip rule; no injection phrases, no persona hijacking, no permission escalation
- `schemas/structure-manifest.json` — pure JSON data, no executable content
- `hooks/triage-error.js` — no network calls, no file writes, reads stdin only
- `hooks/hooks.json` — hook timeouts within limits (10 s, 5 s); no untrusted variable interpolation
- `tools/banners.sh` — pure Node.js wrapper, no network, no credentials
- `tools/list-skills.js` — reads plugin registry and skills directory; no network, no writes
- `commands/` (all 13 files) — no prompt injection, no permission escalation
- `meta/` (all persona, workflow, skill, template, store-schema files) — clean
- `init/` (discovery, generation, sdlc-init, smoke-test, workflow-gen-plan.json) — clean
- `schemas/` — JSON only, no executable content
- `tools/*.cjs` — Node.js built-ins only, no network, no credential reads
- No binary or compiled files; no invisible Unicode (U+200B/FEFF/200C/200D/00AD); 1.1 MB total

### Verdict

**SAFE TO USE**

No new findings introduced by v0.11.2. The single warning (temp-dir cache write) involves only non-sensitive version metadata and is an accepted carry-forward from v0.9.14.
