## Security Scan — forge@forge — 2026-04-14

**SHA**: not recorded (source scan) | **Installed**: N/A (source-path scan) | **Last updated**: N/A
**Scope**: user | **Install path**: /home/boni/src/forge/forge/

### Summary
102 files scanned | 0 critical | 0 warnings | 2 info

### Findings

#### INFO forge/hooks/check-update.js:77
- **Check**: A — Hook Scripts
- **Issue**: Makes an HTTPS network call to `raw.githubusercontent.com` to check for version updates
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe to ignore — this is the plugin's documented update-check mechanism. The URL is read from the plugin's own `plugin.json` manifest, not hardcoded (fallback URL is also GitHub raw). Timeout enforced at 5s.

#### INFO forge/hooks/check-update.js:24
- **Check**: A — Hook Scripts
- **Issue**: Writes to `/tmp/forge-plugin-data/` (os.tmpdir()) for update-check cache
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Safe to ignore — this is a standard pattern for plugin-level caching. The cache only stores version timestamps and distribution metadata, no user data or credentials.

### Clean Areas
- forge/hooks/triage-error.js — no issues (proper exit-0 discipline, no network calls, no credential access)
- forge/hooks/list-skills.js — no issues (read-only file scanning, proper exit-1 on failure)
- forge/meta/workflows/meta-orchestrate.md — no prompt injection, no credential access, no exfiltration vectors
- forge/meta/personas/ — no injection patterns detected across all 9 persona files
- forge/meta/skills/ — no injection patterns detected across all 6 skill files
- forge/commands/ — no injection patterns, no `allowed-tools: ["Bash"]` without restriction
- forge/tools/*.cjs — all use `'use strict';`, top-level try/catch, no npm dependencies
- forge/schemas/*.json — all preserve `additionalProperties: false`
- forge/.claude-plugin/plugin.json — no unrestricted `allowed-tools` declarations
- forge/hooks/hooks.json — hook timeouts are 5-10s (well under 30s threshold), commands use `node` with `${CLAUDE_PLUGIN_ROOT}` interpolation (safe — environment variable controlled by Claude Code runtime)
- No binary/compiled files found in plugin directory
- No zero-width Unicode characters detected
- No base64 blobs embedded in Markdown files
- No credential-adjacent path reads (~/.ssh, ~/.aws, .env, etc.)

### Changed Files (v0.7.2 -> v0.7.3)

| File | Change Type | Security Impact |
|---|---|---|
| forge/meta/workflows/meta-orchestrate.md | Added ROLE_TO_NOUN table, updated persona/skill file lookups to noun-based, updated announcement line | None — static lookup table with hardcoded values, no user-controlled input paths |
| forge/.claude-plugin/plugin.json | Version bump 0.7.2 -> 0.7.3 | None |
| forge/migrations.json | Added migration entry | None |

### Verdict

**SAFE TO USE**

No critical or warning-level findings. The only changes in this version are to a Markdown meta-workflow template (noun-based filename lookups and announcement format). The change introduces no new network calls, no credential access, no shell execution, and no user-controlled input paths. All existing hook and tool scripts are unchanged.