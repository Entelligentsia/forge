## Security Scan — forge:forge — 2026-04-14

**SHA**: source scan (not from installed plugin cache) | **Installed**: N/A | **Last updated**: 2026-04-14
**Scope**: source directory | **Install path**: /home/boni/src/forge/forge/

### Summary
102 files scanned | 728K total | 0 critical | 2 warnings | 3 info

### Findings

#### [WARNING] forge/hooks/check-update.js:77
- **Check**: A — Outbound network call
- **Issue**: `https.get(remoteUrl, ...)` makes an outbound request on every session start when the 24-hour throttle cache has expired. The URL is constructed from `plugin.json → updateUrl` with a known-safe fallback to `raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`. A malicious `plugin.json` substitution could redirect this to an attacker-controlled endpoint to leak the Forge version string.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Low risk in practice — the URL source (`plugin.json`) is part of the same plugin bundle and not user-controlled at runtime. Version string is the only data sent (in the User-Agent / request headers). No user data is included in the request body. Safe to use; monitor if plugin distribution channels are ever compromised.

#### [WARNING] forge/hooks/check-update.js:24
- **Check**: A — Write to shared temp location
- **Issue**: The plugin-level throttle cache is written to `os.tmpdir()/forge-plugin-data/update-check-cache.json` (typically `/tmp/`). Content written is `{ lastCheck, remoteVersion }` — no user data or credentials. On multi-user systems, `/tmp/` may be readable by other local users.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Info-level in practice — the data written (update check timestamp and remote version string) is not sensitive. Not a security risk. Acceptable for a session-start throttle cache.

#### [INFO] forge/commands/update.md:112
- **Check**: B — Outbound network call instruction in command file
- **Issue**: The `/forge:update` command instructs the model to fetch from `{UPDATE_URL}` (resolved at runtime from `plugin.json → updateUrl`). The destination is always `raw.githubusercontent.com` or the project's own distribution host. No user data is included in requests.
- **Excerpt**: `Use the WebFetch tool (preferred) or curl via Bash:`
- **Recommendation**: Expected and necessary for update functionality. The URL is constrained to the installed plugin manifest's declared value. No action needed.

#### [INFO] forge/hooks/hooks.json
- **Check**: C — Hook permissions review
- **Issue**: PostToolUse hook triggers on every `Bash` tool call. The `triage-error.js` handler reads `tool_input.command` and `tool_response.exitCode` from the event payload — neither reads nor captures credential-adjacent data. The hook exits 0 always (uncaughtException handler).
- **Excerpt**: `"matcher": "Bash"` with `"command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/triage-error.js\""`
- **Recommendation**: Justified for error triage UX. Timeout is 5000ms (within acceptable range). The matcher is scoped to Bash but no `allowed-tools` amplification occurs. No action needed.

#### [INFO] forge/meta/personas/meta-architect.md:41
- **Check**: B — False positive on "act as" substring scan
- **Issue**: The phrase "act as" appears as part of the word "assessment" in a bullet point ("deployment topology for impact assessment"). Not a prompt injection pattern.
- **Excerpt**: `- The project's deployment topology for impact assessment`
- **Recommendation**: Not a finding. Documented for transparency.

### Clean Areas
- `forge/tools/validate-store.cjs` — no npm deps; reads only `.forge/config.json` and `engineering/` filesystem; all new filesystem checks are read-only; no credential access; no outbound calls
- `forge/tools/seed-store.cjs` — no npm deps; local file I/O only; `DEBUG_SEED` env var used only for debug logging, not data capture
- `forge/tools/collate.cjs` — no npm deps; local file I/O only
- `forge/tools/store.cjs` — no npm deps; pure local JSON CRUD facade
- `forge/tools/manage-config.cjs` — no npm deps; reads/writes `.forge/config.json` only
- `forge/tools/estimate-usage.cjs` — no npm deps; pure in-memory calculation, no I/O beyond stdout
- `forge/tools/generation-manifest.cjs` — no npm deps; local file I/O only
- `forge/hooks/list-skills.js` — reads only `~/.claude/plugins/installed_plugins.json` and `~/.claude/skills/`; no network; no writes
- `forge/hooks/triage-error.js` — reads stdin event payload only; writes to stdout only; no network, no file writes, no credential access
- `forge/commands/` — all Markdown; no prompt injection patterns; no exfiltration instructions; no credential reading
- `forge/meta/workflows/` — all Markdown; no prompt injection; no hidden instructions
- `forge/meta/personas/` — all Markdown; persona definitions use first-person SDLC role framing; no persona hijacking
- `forge/schemas/` — pure JSON Schema definitions; no executable content
- `forge/.claude-plugin/plugin.json` — standard plugin manifest; no suspicious fields
- No binary files, compiled artifacts, or misleading extensions found
- No invisible Unicode characters found
- No base64-encoded blobs found
- No eval() usage anywhere
- No sudo, crontab, systemctl, launchctl, or persistence mechanisms
- No shell init file writes
- No TOKEN/SECRET/API_KEY environment variable captures

### Verdict

**SAFE TO USE**

The forge:forge plugin (v0.7.11) introduces a targeted, read-only filesystem walk in `validate-store.cjs` that reads directory names only — no credential access, no outbound calls, no new dependencies. The two warnings (outbound update check URL and /tmp cache write) are pre-existing, low-risk patterns consistent with all prior scan reports. No new attack surface was introduced by the v0.7.11 changes.
