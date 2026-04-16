## Security Scan — forge:forge — 2026-04-16

**SHA**: canary/source install (not recorded) | **Installed**: 2026-04-09T18:02:54.923Z | **Last updated**: 2026-04-16
**Scope**: local (source path: /home/boni/src/forge/forge/) | **Install path**: /home/boni/src/forge/forge/

### Summary

127 files scanned | 0 critical | 2 warnings (carry-forward, accepted) | 3 info

---

### Findings

#### [WARNING] hooks/check-update.js:44,77
- **Check**: A — Hook Scripts / outbound network call
- **Issue**: `https.get()` fetches `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` on `SessionStart`. URL is read from installed `plugin.json` `updateUrl` field; hardcoded GitHub raw fallback for resilience. Destination is a known Entelligentsia release endpoint. Call is throttled to once per 24 hours via a local cache file. No user data is included in the request.
- **Excerpt**: `const FALLBACK_UPDATE_URL = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Safe — outbound is version-check only, to a documented official endpoint, rate-limited, data-free. No action required. Carry-forward from v0.10.0.

#### [WARNING] hooks/check-update.js:24,54
- **Check**: A — Hook Scripts / writes to temp location
- **Issue**: Plugin-level throttle cache written to `os.tmpdir()/forge-plugin-data/update-check-cache.json`. Content is `{ lastCheck, remoteVersion }` — no sensitive data. Shared across projects to avoid duplicate per-project cache files.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Safe — data written is non-sensitive version metadata. `CLAUDE_PLUGIN_DATA` env var allows path override. No action required. Carry-forward from v0.10.0.

#### [INFO] commands/update.md:130
- **Check**: B — Skill/Command files
- **Issue**: `update.md` instructs Claude to use `WebFetch` or `curl` to fetch the remote plugin manifest. URL is resolved from the installed `plugin.json` `updateUrl` field.
- **Excerpt**: `Use the WebFetch tool (preferred) or \`curl\` via Bash:`
- **Recommendation**: Safe — URL is plugin-controlled, points to documented release endpoint. No action required. Carry-forward from v0.10.0.

---

### New file in this release

#### [INFO] meta/workflows/meta-quiz-agent.md (new)
- **Check**: B — Skill/Command files
- **Issue**: New meta-workflow added. Reviewed for prompt injection, exfiltration instructions, and permission escalation.
- **Findings**: None. File instructs LLM to generate project-specific quiz questions from the KB. No network calls, no credential reads, no permission escalation, no hidden instructions, no invisible unicode.
- **Recommendation**: Clean. No action required.

---

### Clean Areas

- `hooks/triage-error.js` — reads stdin, writes `additionalContext` to stdout only; no network, no fs writes, no credential access
- `hooks/hooks.json` — two hooks (SessionStart/PostToolUse); timeouts 10000ms and 5000ms; no unrestricted Bash or Write permissions
- `commands/` (all 14 files) — no prompt injection patterns, no exfiltration instructions, no hidden content after document end
- `meta/workflows/` (all 17 files including meta-quiz-agent.md) — no injection patterns, no credential reads
- `meta/personas/` — no injection patterns, no persona hijacking
- `meta/skills/`, `meta/templates/`, `meta/tool-specs/` — documentation only, no anomalies
- `init/` (sdlc-init.md + discovery + generation) — no injection patterns; `node -e` inline commands are deterministic hash and JSON operations on project-local files only
- `tools/*.cjs` — Node built-ins only (no npm deps), no network calls, no credential reads, no eval; all writes go to project-local `.forge/` paths
- `schemas/` — JSON schema definitions only
- `vision/` — documentation only
- No binary files, no compiled artifacts, no misleading extensions, no invisible unicode, no base64 blobs
- Plugin size: 1.1 MB, 127 files — proportionate to functionality

---

### Verdict

**SAFE TO USE**

No critical findings. The two carry-forward warnings (outbound version check, /tmp cache write) are intentional, well-bounded, and data-free — accepted in all prior scans. The one new file (`meta-quiz-agent.md`) is clean. No changes to hook scripts or permissions in this release.
