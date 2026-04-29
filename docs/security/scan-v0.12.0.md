## Security Scan — forge:forge — 2026-04-17

**SHA**: not recorded (scanned from source: `/home/boni/src/forge/forge/`) | **Installed**: 2026-04-09 | **Last updated**: 2026-04-17
**Scope**: local (project: /home/boni/src/forge) | **Install path**: forge/ (source scan)

### Summary
139 files scanned | 0 critical | 0 warnings | 3 info

### Findings

#### [INFO] forge/hooks/check-update.js:77
- **Check**: A — Network calls
- **Issue**: `https.get()` to the URL stored in `plugin.json`'s `updateUrl` field. Fallback hardcoded to `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe. The call is the plugin's version-check mechanism. The URL is read from the installed plugin's own manifest (distribution-aware), with a hardcoded `raw.githubusercontent.com` fallback. Only `version` field is read from response. 5-second timeout, no data sent.

#### [INFO] forge/hooks/check-update.js:24
- **Check**: A — Writes to shared temp location
- **Issue**: Plugin-level throttle cache written to `os.tmpdir()/forge-plugin-data/update-check-cache.json`.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Safe. Content is `{lastCheck: <unix_ts>, remoteVersion: "<semver>"}` — no sensitive data. Path is configurable via `CLAUDE_PLUGIN_DATA` env var.

#### [INFO] forge/hooks/check-update.js:125–131
- **Check**: A — Writes to project config file
- **Issue**: Hook mutates `.forge/config.json` to keep `paths.forgeRoot` in sync with `CLAUDE_PLUGIN_ROOT` at session start.
- **Excerpt**: `if (cfg.paths.forgeRoot !== pluginRoot) { cfg.paths.forgeRoot = pluginRoot; fs.writeFileSync(...) }`
- **Recommendation**: Safe and intentional. This is the distribution-switch sync mechanism documented in CLAUDE.md. The write is guarded by a diff check (only writes when forgeRoot has drifted) and limited to `paths.forgeRoot` — no other fields are touched.

### Clean Areas
- `forge/hooks/triage-error.js` — no network calls, no credential reads, reads only `tool_name`/`tool_input`/`tool_response` from stdin, exits 0 on all errors
- `forge/tools/*.cjs` — all use only `fs`, `path`, `os`, `crypto` built-ins; no network calls; no eval; `'use strict'` throughout; top-level try/catch; `--dry-run` flags honoured
- `forge/commands/*.md` — no prompt injection patterns, no persona hijacking, no safety bypass phrases; command descriptions match body instructions
- `forge/meta/**/*.md` — no prompt injection; no exfiltration instructions; no hidden instructions after document end; no invisible Unicode
- `forge/init/generation/*.md` — legitimate LLM orchestration rulebooks; no injection patterns
- `forge/schemas/*.json` — well-formed JSON Schema; `additionalProperties: false` present on all critical object schemas
- `forge/.claude-plugin/plugin.json` — no `allowed-tools`; no hooks registered in manifest (hooks declared in `hooks.json`); version matches source
- `forge/hooks/hooks.json` — SessionStart hook timeout 10000ms (reasonable); PostToolUse hook timeout 5000ms; no unrestricted `Bash` allowed-tools grants
- No binary files, compiled artifacts, or misleading extensions found
- No invisible Unicode characters found
- No base64-encoded blobs found in markdown files
- No credential-adjacent file reads (`.ssh/`, `.aws/`, `.env`, etc.)
- No eval patterns, no obfuscated execution
- No persistence mechanisms (crontab, systemctl, launchctl)
- No software installation commands

### Verdict

**SAFE TO USE**

139 source files scanned across all hooks, tools, commands, meta definitions, and schemas. No critical issues found. Three informational notes cover the intentional and bounded network call for version checking, the benign throttle cache in `/tmp`, and the `paths.forgeRoot` sync write — all three are documented plugin behaviours with appropriate guards. No prompt injection, credential access, or malicious patterns detected anywhere in the plugin source.
