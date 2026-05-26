# Security Scan — forge v1.0.0 — 2026-05-26

**SHA**: d410308 | **Version**: 1.0.0
**Scope**: local source | **Install path**: `forge/forge/`

## Summary

379 files scanned | 0 critical | 3 warnings | 2 info

## Findings

### [WARNING] hooks/check-update.cjs:64-72
- **Check**: A — Network calls
- **Issue**: `https.get()` fetches remote `plugin.json` to check for version updates. Destination is `raw.githubusercontent.com/Entelligentsia/forge/{branch}/forge/.claude-plugin/plugin.json` — read from the installed `plugin.json`'s `updateUrl` field, not hardcoded.
- **Excerpt**: `https.get(remoteUrl, { timeout: 2000 }, (res) => { ... cb(JSON.parse(body).version || ''); })`
- **Recommendation**: Safe — standard version-check pattern, 2s timeout, only reads version string from response. Destination is the plugin's own repo on GitHub. No credentials sent.

### [WARNING] skills/store-custodian/SKILL.md, skills/store-query-nlp/SKILL.md, commands/search.md, commands/status.md
- **Check**: C — Permissions
- **Issue**: Five skills/commands declare `allowed-tools: [Bash]` without command pattern restriction. These skills are invoked by the LLM during Forge workflows to run `node store-cli.cjs` commands.
- **Excerpt**: `allowed-tools:\n  - Bash`
- **Recommendation**: Acceptable for this plugin's use case — Forge is an SDLC tool that must invoke its own CJS tools via Bash. The Bash access is constrained by the skill's markdown instructions to specific `store-cli.cjs` invocations. No credential access, no network calls from these skills.

### [WARNING] hooks/post-init.cjs:87, hooks/post-sprint.cjs:87
- **Check**: A — Child process spawning
- **Issue**: `spawnSync('node', [cli, 'emit', ...])` spawns child processes from PostToolUse hooks. The `cli` path is derived from `forgeRoot` (read from `.forge/config.json`) + `/tools/store-cli.cjs`.
- **Excerpt**: `spawnSync('node', [cli, 'emit', 'enhancement', JSON.stringify(event)], { timeout: 3000 })`
- **Recommendation**: Safe — spawns only `node` with the plugin's own `store-cli.cjs` tool. 3s timeout. No user-controlled input interpolated into the command array (uses array form, not string interpolation).

### [INFO] hooks/hooks.json
- **Check**: C — Hook registrations
- **Issue**: Plugin registers hooks on 4 event types: `SessionStart` (1 hook), `PreToolUse` (1 hook on Write/Edit/MultiEdit), `PostToolUse` (4 hooks on Bash), `PermissionRequest` (1 hook on Bash/Write/Edit/MultiEdit/WebFetch). All timeouts ≤ 10s.
- **Recommendation**: Normal for an SDLC plugin. Hook count is moderate. No excessive timeouts.

### [INFO] Plugin size: 3.6MB, 379 files
- **Check**: D — Structural anomalies
- **Issue**: Size is proportionate for a plugin with 204 markdown workflows, 137 CJS tools/tests, 32 JSON schemas, 5 JS utilities, and 1 shell script.
- **Recommendation**: No anomalies. No binaries, no compiled artifacts, no misleading extensions detected.

## Clean Areas

- `meta/` (70 files) — no prompt injection, no hidden instructions, no suspicious HTML comments
- `commands/` (22 files) — clean markdown instructions, no exfiltration patterns
- `agents/` (2 files) — no persona hijacking or safety bypass patterns
- `tools/` (30 CJS files) — no network calls, no credential reads, no eval/exec
- `init/` (77 base-pack files) — no injection patterns, no obfuscated content
- `schemas/` (32 JSON files) — valid JSON schema definitions only
- Zero-width Unicode scan: clean across all 204 markdown files
- Base64 blob scan: no embedded encoded payloads

## Verdict

**SAFE TO USE**

No critical findings. Three warnings are all justified by the plugin's core function (SDLC tooling that invokes its own CJS scripts via Bash). The single network call is a standard version-check to the plugin's own GitHub repo with a 2s timeout. No credential access, no exfiltration vectors, no prompt injection detected across 379 files.
