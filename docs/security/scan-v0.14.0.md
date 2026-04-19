# Security Scan — forge:forge — 2026-04-18

**SHA**: not recorded (canary/source install) | **Installed**: canary | **Last updated**: 2026-04-18
**Scope**: source | **Install path**: /home/boni/src/forge/forge/

## Security Scan — forge:forge — 2026-04-18

**SHA**: not recorded (canary/source install) | **Installed**: canary | **Last updated**: 2026-04-18
**Scope**: source | **Install path**: /home/boni/src/forge/forge/

### Summary
147 files scanned | 0 critical | 1 warning | 2 info

### Findings

#### [WARNING] hooks/check-update.js:77
- **Check**: A — Hook Scripts (outbound network call)
- **Issue**: `https.get()` is called at `SessionStart` to check for a newer plugin version. The URL is read from `plugin.json → updateUrl` with a hardcoded fallback to `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`. The call is limited to the `raw.githubusercontent.com` release API, has a 5000ms timeout, reads only the `version` field from the JSON response, and never transmits project data or environment variables. This is consistent with the plugin's documented update-check behaviour.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe to use. The URL is constrained to official release APIs; no payload from the local environment is transmitted. No action required.

#### [INFO] hooks/check-update.js — writes to local cache files
- **Check**: A — Hook Scripts (writes to shared paths)
- **Issue**: The hook writes to `${CLAUDE_PLUGIN_DATA}/update-check-cache.json` (plugin-level throttle cache) and `.forge/update-check-cache.json` (project-level migration state). Both are within controlled plugin/project directories, not shared system temp paths. No sensitive data is written — only version strings and timestamps.
- **Excerpt**: `fs.writeFileSync(pluginCacheFile, JSON.stringify({ lastCheck: now, remoteVersion }));`
- **Recommendation**: Expected behaviour. No action required.

#### [INFO] hooks/triage-error.js — reads Bash tool output from stdin
- **Check**: A — Hook Scripts (environment reads)
- **Issue**: The hook reads `tool_response.stderr` and `tool_response.output` from the PostToolUse event JSON via stdin. It uses the first 3 lines as a snippet in an `additionalContext` injection. The snippet is not forwarded to any external destination — it is written to stdout as a Claude Code hook result. No environment variables, credentials, or secrets are captured.
- **Excerpt**: `const errorSnippet = (stderr || output).split('\n').slice(0, 3).join(' ').trim();`
- **Recommendation**: Expected behaviour. The error snippet stays within Claude Code's own context pipeline. No action required.

### Clean Areas
- `agents/tomoshibi.md` — no prompt injection, no hidden instructions, guardrails table present
- `skills/refresh-kb-links/SKILL.md` — no prompt injection, no hidden instructions, description matches body
- `commands/` (all 13 files) — no injection patterns, no credential reads, no permission escalation
- `init/` (all files) — no injection patterns; Agent fan-out calls are construction of project-local files only
- `meta/` (all files) — meta-workflow/persona/skill sources; no network calls, no injection
- `tools/` (all .cjs files) — Node.js stdlib only; no npm dependencies; no credential reads; no eval on untrusted input
- `hooks/hooks.json` — two hooks: SessionStart (check-update.js, 10s timeout) and PostToolUse/Bash (triage-error.js, 5s timeout); no unrestricted Bash access
- `schemas/` — JSON Schema files only; no executable content
- No binary or compiled artifacts found
- No invisible Unicode (zero-width spaces, BOM) detected in any file
- No base64-encoded blobs detected in any markdown file
- Plugin size: 1.3 MB for 147 files — proportionate to a full SDLC framework

### Verdict

**SAFE TO USE**

No critical findings. The single warning (outbound HTTPS at SessionStart) is the plugin's documented version-check mechanism, constrained to `raw.githubusercontent.com` with no local data transmitted. The two new v0.14.0 components (`agents/tomoshibi.md`, `skills/refresh-kb-links/SKILL.md`) contain only well-scoped operational instructions with explicit guardrails and no injection vectors.
