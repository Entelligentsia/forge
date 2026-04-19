## Security Scan — forge:forge — 2026-04-14

**SHA**: d7ebd8faefbaab523d9a76840699c8cb387bd806 (user scope) | **Installed**: 2026-04-13T04:23:17.016Z | **Last updated**: 2026-04-14T03:10:39.823Z
**Scope**: user | **Install path**: /home/boni/.claude/plugins/cache/forge/forge/0.7.2
**Source scanned**: /home/boni/src/forge/forge/ (version 0.7.10)

### Summary
102 files scanned | 0 critical | 1 warning | 2 info

### Findings

#### [WARNING] hooks/check-update.js:24
- **Check**: A — Hook Scripts
- **Issue**: `check-update.js` writes a throttle cache to `os.tmpdir() + '/forge-plugin-data/'` when `CLAUDE_PLUGIN_DATA` is unset. The `/tmp` path is a shared, world-writable directory on Linux and macOS. Another user process could pre-create the cache file and influence the throttle state or inject a fake `remoteVersion`. Risk is low in practice (the value is only used to build an advisory update-available message and is not acted on automatically), but shared-temp writes are flagged per policy.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: The existing mitigation (only using the value for an informational message, not for any install action) keeps risk low. No security action required. Accepted from prior scans — pre-existing, lower risk than alternatives given the advisory-only use.

#### [INFO] hooks/list-skills.js:21
- **Check**: A — Hook Scripts
- **Issue**: `list-skills.js` is in the `hooks/` directory and uses `process.on('uncaughtException', () => process.exit(1))`. Hook scripts MUST exit 0 on failure to avoid surfacing noise in Claude Code sessions. However, this file is **not registered in `hooks.json`** — it is a utility query helper invoked by commands directly. The `exit(1)` behaviour is semantically correct for its role (query exit code signals skill availability). Low risk given it is not a lifecycle hook.
- **Excerpt**: `process.on('uncaughtException', () => process.exit(1));`
- **Recommendation**: Move `list-skills.js` to `tools/` to clarify it is not a lifecycle hook, or add a comment in `hooks.json` noting it is intentionally excluded. No security action needed.

#### [INFO] commands/update.md:112
- **Check**: B — Skill/Command files
- **Issue**: `update.md` instructs use of `WebFetch` or `curl` to fetch from GitHub (`raw.githubusercontent.com`). The destination URL is read from the installed `plugin.json` (`updateUrl` / `migrationsUrl` fields), not hardcoded to an arbitrary domain. This is the intended update-check mechanism and is clearly scoped to the Entelligentsia/forge repository. Flagged for completeness only.
- **Excerpt**: `Use the WebFetch tool (preferred) or curl via Bash` / `URL: {UPDATE_URL}`
- **Recommendation**: Safe — URL source is under plugin author control and locked to the Forge distribution. No action needed.

### Clean Areas
- `tools/collate.cjs` — no npm dependencies; reads config from `.forge/config.json`; no network calls; DRY_RUN guard present on all writes; new task/sprint path logic uses only `path.basename()` and `path.relative()` (built-ins)
- `tools/seed-store.cjs` — no network calls; outer try/catch present; exit 1 on error
- `tools/store.cjs` — no network calls; pure fs/path built-ins
- `tools/validate-store.cjs` — no network calls; exit 1 on error
- `tools/manage-config.cjs` — no network calls; no credential reads
- `tools/generation-manifest.cjs` — uses crypto (built-in) for hashing; no network
- `tools/estimate-usage.cjs` — no network calls; local computation only
- `hooks/check-update.js` — outbound call to `raw.githubusercontent.com` only; URL derived from installed `plugin.json`; exits 0 on all exceptions
- `hooks/triage-error.js` — no network calls; reads only stdin event; exits 0 on all exceptions
- `commands/*.md` — no prompt injection phrases; no persona hijacking; no credential reads; no hidden instructions
- `meta/workflows/*.md` — no prompt injection; no exfiltration instructions
- `meta/personas/*.md` — no prompt injection; no persona hijacking beyond intended persona definition
- `schemas/*.json` — `additionalProperties` appropriately set; no embedded scripts
- No binary files, compiled artifacts, or suspicious extensions present
- No invisible unicode detected
- No `eval`, `base64 -d | bash`, or obfuscation patterns
- No credential-adjacent path reads (`~/.ssh`, `.env`, `*.pem`, etc.)
- No persistence mechanisms (`crontab`, `systemctl`, `nohup`)
- No `sudo` usage anywhere
- `plugin.json` declares no `allowed-tools` permissions — tool access is governed by Claude Code runtime defaults

### Verdict

**SAFE TO USE**

The v0.7.10 change to `collate.cjs` is minimal and low-risk: two conditional blocks that use `path.basename()` and `path.relative()` (Node.js built-ins) to derive directory names from stored path fields. No network access, no credential reads, no new dependencies. The one warning (tmpdir cache) is pre-existing and accepted from prior scans.
