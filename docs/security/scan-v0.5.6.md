## Security Scan — forge:forge — 2026-04-07

**SHA**: not recorded (source scan — pre-release) | **Installed**: n/a | **Last updated**: n/a
**Scope**: source directory | **Install path**: `/home/boni/src/forge/forge/`

---

### Summary

89 files scanned (636K) | 0 critical | 2 warnings | 3 info

---

### Findings

#### [WARNING] forge/hooks/check-update.sh:19–20, forge/hooks/check-update.js:21
- **Check**: A — Temp directory write
- **Issue**: Both `check-update.sh` and `check-update.js` write a version-cache file to `/tmp/forge-plugin-data/update-check-cache.json` (or `$CLAUDE_PLUGIN_DATA`). Writing to `/tmp` qualifies as a shared temp location per Check A.
- **Excerpt**: `DATA_DIR="${CLAUDE_PLUGIN_DATA:-/tmp/forge-plugin-data}"` / `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Low risk — the cache file contains only `{lastCheck, remoteVersion, localVersion, migratedFrom}` (no credentials or user data). The directory is namespaced (`forge-plugin-data/`) and the env var override allows deployment to a non-shared path. No action required; acceptable for this use case.

#### [WARNING] forge/hooks/check-update.js:49, forge/hooks/check-update.sh:44,55
- **Check**: A — Outbound network call
- **Issue**: Both hook scripts make an outbound HTTPS GET to `raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` to check for plugin updates. This fires on every `SessionStart` when the 24-hour cache has expired.
- **Excerpt**: `const remoteUrl = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Expected and justified — version-check endpoint on `raw.githubusercontent.com`, a known official release API. Request is read-only (GET), sends no user data, has a 5-second timeout, and degrades gracefully on failure. The JS implementation uses Node.js built-in `https` (no external deps). The shell implementation uses `curl -sf --max-time 5`. Both are safe.

#### [INFO] forge/hooks/hooks.json:9
- **Check**: C — Hook timeout
- **Issue**: `SessionStart` hook timeout is set to 10,000ms (10s), above the 5s advisory threshold. This is because the hook may need to complete a network round-trip to `raw.githubusercontent.com`.
- **Excerpt**: `"timeout": 10000`
- **Recommendation**: Justified by the network fetch in `check-update.js`. The fetch itself has a 5s timeout; the 10s hook timeout provides margin for DNS resolution and slow connections. Acceptable.

#### [INFO] forge/hooks/list-skills.js:27–30, forge/hooks/list-skills.sh:21
- **Check**: A — File system read of user config
- **Issue**: `list-skills.js` and `list-skills.sh` read `~/.claude/plugins/installed_plugins.json` and enumerate `~/.claude/skills/` to report which skills are available. These are Claude Code configuration paths.
- **Excerpt**: `path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json')`
- **Recommendation**: Justified — this is the correct source for skill availability. No data is written or transmitted. Both files support env var overrides (`CLAUDE_PLUGIN_DATA_ROOT`, `CLAUDE_SKILLS_DIR`). Clean.

#### [INFO] forge/hooks/hooks.json:13–25
- **Check**: C — Hook registered on `PostToolUse` with `Bash` matcher
- **Issue**: `triage-error.js` fires after every `Bash` tool call to detect Forge-related errors and suggest bug filing.
- **Excerpt**: `"matcher": "Bash"` + `"command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/triage-error.js\""`
- **Recommendation**: The hook only reads `tool_input.command` and `tool_response.exitCode/stderr/output` from the event payload — no writes, no network calls. It emits an `additionalContext` message if the command is Forge-related and failed. The Forge-pattern matching is allowlist-based (`/manage-config/`, `/\.forge\//`, etc.) — it ignores unrelated Bash calls. Clean and well-scoped.

---

### Clean Areas

- `forge/meta/workflows/` — all 14 workflow files: no prompt injection, no hidden instructions, no persona hijacking, no exfiltration instructions. `meta-fix-bug.md` (newly rewritten) correctly instructs the orchestrator to read verdicts from artifacts, not infer them — no rationalization attack surface.
- `forge/meta/personas/` — role definitions only; no safety bypasses or escalation instructions.
- `forge/tools/collate.cjs`, `validate-store.cjs`, `seed-store.cjs`, `manage-config.cjs`, `generation-manifest.cjs`, `estimate-usage.cjs` — all Node.js built-ins only, no network calls, no credential reads, no eval.
- `forge/commands/` — 9 command files; no prompt injection patterns, no invisible Unicode, no base64 blobs. `update.md` references `curl` as an alternative for `WebFetch` only to fetch the official plugin manifest.
- `forge/hooks/triage-error.js` — reads Bash event stdin, emits advisory context only. No writes, no network.
- `forge/schemas/` — JSON Schema files only.
- `forge/.claude-plugin/plugin.json` — metadata only; no hooks or tool grants.
- `forge/migrations.json` — migration chain; no executable content.
- `forge/init/`, `forge/vision/` — documentation and generation instructions only.
- No binary files, compiled artifacts, misleading extensions, or invisible Unicode anywhere in the source tree.
- No prompt injection patterns (`ignore previous instructions`, `you are now`, `jailbreak`, etc.) in any file.
- No reads of `~/.ssh/`, `~/.aws/`, `.env`, or any credential-adjacent path.
- No `eval`, `base64 -d | bash`, silent software installation, persistence mechanisms, or shell init file writes.

---

### Verdict

**SAFE TO USE**

Forge v0.5.6 source contains no malicious or suspicious code. The two warnings are expected behaviours (version-check network call on SessionStart, temp-dir cache write) that are well-bounded, justified by plugin function, and degrade gracefully on failure. No credential access, no data exfiltration, no prompt injection.
