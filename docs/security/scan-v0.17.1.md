# Security Scan — forge:forge — 2026-04-19

**SHA**: not recorded (local source scan) | **Installed**: N/A | **Last updated**: 2026-04-19
**Scope**: local source | **Install path**: /home/boni/src/forge/forge/

## Summary

158 files scanned | 0 critical | 1 warning | 2 info

## Findings

#### [WARNING] forge/hooks/check-update.js:77
- **Check**: A — Hook Scripts (outbound network call)
- **Issue**: `https.get()` call to `remoteUrl`, which is read from `plugin.json`'s `updateUrl` field at runtime. This is the version-check mechanism — it fetches only the remote `plugin.json` to compare version strings. No body content, credentials, or local data is transmitted. Destination is `raw.githubusercontent.com/Entelligentsia/forge/…/plugin.json` (or equivalent release branch URL). Call has a 5-second timeout and fails silently on error. Justified by plugin function.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe to use. The network call is scoped to the declared `updateUrl` in `plugin.json`, is version-check only, and has no data exfiltration path. No action required.

#### [INFO] forge/hooks/hooks.json — PostToolUse on Bash
- **Check**: C — Permissions (hook registered on PostToolUse/Bash)
- **Issue**: `triage-error.js` fires after every Bash tool call. It reads stdin (the tool event JSON), checks if the command matches Forge-related patterns, and — only on non-zero exit — injects a context suggestion to file a bug. No credentials, no network calls, no write access outside the response channel.
- **Excerpt**: `"matcher": "Bash"` + `"command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/triage-error.js\""`
- **Recommendation**: Functioning as designed. Timeout is 5 seconds (within normal bounds). No action required.

#### [INFO] forge/commands/health.md:173 — SHA-256 hex literal
- **Check**: B — Base64-looking blob check
- **Issue**: A 64-character hex string (`3ec3c970dd3d7c3001f8f373bcc40556803eadd2fc2afafb14f1c232cba4cc3f`) appears in `health.md`. This is the expected SHA-256 hash of `verify-integrity.cjs`, used for tamper detection of the integrity verifier itself. It is plaintext hex, not Base64, and encodes no executable content.
- **Excerpt**: `EXPECTED="3ec3c970dd3d7c3001f8f373bcc40556803eadd2fc2afafb14f1c232cba4cc3f"`
- **Recommendation**: Intentional security measure. No action required.

## Clean Areas

- `forge/tools/build-context-pack.cjs` — new tool in this release; pure filesystem I/O, no network, no credential reads, atomic writes only
- `forge/meta/workflows/` — no prompt injection, no hidden instructions, no persona hijacking
- `forge/commands/` — all commands are operational SDLC instructions with no exfiltration patterns
- `forge/schemas/` — plain JSON schemas, no executable content
- `forge/hooks/triage-error.js` — reads stdin, pattern-matches, writes stdout; no network, no filesystem writes
- `forge/tools/*.cjs` — all tool scripts use only Node.js built-ins; no network calls, no credential access, no eval, no shell injection
- `forge/init/`, `forge/meta/personas/`, `forge/meta/skills/` — documentation and generation templates; no injection patterns detected
- `forge/vision/` — narrative documentation; no executable or injection content
- No binary files, compiled artifacts, or unexpected file types found
- No zero-width or hidden Unicode characters found
- No shell init file modifications, persistence mechanisms, or package installation commands found

## Verdict

**SAFE TO USE**

158 files scanned across hooks, commands, workflows, tools, schemas, and documentation. One expected network call (version check to `raw.githubusercontent.com`, scoped to the declared `updateUrl`). The new `build-context-pack.cjs` tool introduced in this release is pure filesystem I/O with no network access or credential reads. No prompt injection, exfiltration, or privilege escalation patterns detected.
