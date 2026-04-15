## Security Scan — forge:forge — 2026-04-15

**SHA**: not recorded (canary/source install) | **Installed**: 2026-04-15 | **Last updated**: 2026-04-15
**Scope**: local | **Install path**: /home/boni/src/forge/forge/

### Summary

111 files scanned | 0 critical | 1 warning | 3 info

### Scope

Version 0.9.8 introduced the following new and modified files:

**New files:**
- `forge/tools/build-manifest.cjs` — derives `structure-manifest.json` from static mapping tables
- `forge/tools/check-structure.cjs` — verifies generated file presence against `structure-manifest.json`
- `forge/schemas/structure-manifest.json` — declares 57 expected generated files across 6 namespaces

**Modified files:**
- `forge/tools/generation-manifest.cjs` — added `clear-namespace <prefix>` subcommand with prefix-shape guard
- `forge/commands/regenerate.md` — added `clear-namespace` calls before full-rebuild loops
- `forge/commands/health.md` — added Step 7 structure check via `check-structure.cjs`
- `forge/commands/update.md` — added post-migration structure check block

*Note: scan was conducted against the current source (v0.9.9) which also includes the banner library additions from 0.9.8→0.9.9; those files (banners.cjs, banners.sh) are covered in [scan-v0.9.9.md](scan-v0.9.9.md) and were also reviewed in this session.*

---

### Findings

#### [INFO] forge/hooks/check-update.js
- **Check**: A — Hook Scripts (network call)
- **Issue**: Outbound HTTPS GET to `raw.githubusercontent.com` on every SessionStart where the update-check interval (24h) has elapsed.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, ...)`
- **Recommendation**: Safe. Destination is the official `Entelligentsia/forge` GitHub repo. URL is read from the installed `plugin.json updateUrl` field (not hardcoded). 5-second timeout with graceful fallback on failure. Core function of the update-check hook.

#### [INFO] forge/hooks/check-update.js
- **Check**: A — Hook Scripts (writes to config file)
- **Issue**: Writes `paths.forgeRoot` into `.forge/config.json` to sync the plugin root path on distribution switch.
- **Excerpt**: `fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');`
- **Recommendation**: Safe. Write is scoped to the project's own `.forge/config.json`. No sensitive data is written; only the current `CLAUDE_PLUGIN_ROOT` value is synced. Non-fatal on failure.

#### [WARNING] forge/hooks/hooks.json
- **Check**: C — Permissions (PostToolUse on Bash)
- **Issue**: Hook registered on `PostToolUse` with matcher `Bash` — fires after every Bash tool invocation.
- **Excerpt**: `"matcher": "Bash", "hooks": [{"type": "command", "command": "node .../triage-error.js", "timeout": 5000}]`
- **Recommendation**: Justified. `triage-error.js` reads stdin for tool results, emits `additionalContext` for Forge-related Bash errors only (error-triage UX feature). Code is clean: no network calls, no credential reads, no writes to sensitive paths. Timeout is 5000ms (within 30s limit).

#### [INFO] forge/commands/report-bug.md
- **Check**: B — Commands (reads local config, network via `gh`)
- **Issue**: Reads `.forge/config.json` and files GitHub issues via `gh issue create --repo Entelligentsia/forge`.
- **Excerpt**: `forge_config: !cat ".forge/config.json" 2>/dev/null | head -30`
- **Recommendation**: Safe. The command is interactive and requires explicit user confirmation before filing. It reads only the local project config (no credentials). Network call is via the pre-authenticated `gh` CLI — user must have explicitly authenticated with GitHub. Issue is filed to the public Entelligentsia/forge repo.

---

### Clean Areas

- `forge/tools/build-manifest.cjs` — no network, no credential reads; reads forge/meta/ and writes to forge/schemas/ only
- `forge/tools/check-structure.cjs` — no network, no credential reads; reads structure-manifest.json and checks file existence
- `forge/tools/generation-manifest.cjs` — no network; reads/writes local .forge/generation-manifest.json; clear-namespace prefix guard validated
- `forge/tools/manage-config.cjs` — no network; local .forge/config.json R/W only
- `forge/tools/estimate-usage.cjs` — no network; local store reads/writes only
- `forge/tools/collate.cjs` — no network; local store and filesystem only
- `forge/tools/store-cli.cjs` — no network; local store reads/writes only
- `forge/tools/validate-store.cjs` — no network; local store reads only
- `forge/tools/seed-store.cjs` — no network; local store seeding only
- `forge/tools/store.cjs` — no network; local store facade only
- `forge/tools/list-skills.js` — reads `~/.claude/plugins/installed_plugins.json` and `~/.claude/skills/`; no network; exits 0 on any uncaught exception (graceful degradation)
- `forge/hooks/triage-error.js` — no network, no credential reads, no writes to sensitive paths; read-only stdin processing
- `forge/commands/regenerate.md` — no network calls; operates on local .forge/ artifacts
- `forge/commands/health.md` — no network; runs local validation tools
- `forge/commands/init.md` — no network; reads local project files
- `forge/commands/update.md` — outbound fetch to raw.githubusercontent.com only (documented in check-update.js INFO above); user-interactive
- `forge/commands/add-pipeline.md` — no network; reads local config
- `forge/commands/migrate.md` — no network; local store migration
- `forge/commands/remove.md` — no network; local file deletion with explicit confirmation
- `forge/commands/store-repair.md` — no network; local store repair
- `forge/commands/update-tools.md` — no network; copies local schemas
- `forge/schemas/structure-manifest.json` — static data file; no executable content
- No binary files, compiled artifacts, or misleading extensions detected
- No prompt injection patterns detected in any markdown file
- No zero-width Unicode characters detected in reviewed files
- No base64 blobs in markdown
- All frontmatter descriptions match actual file purpose

---

### Verdict

**SAFE TO USE**

111 files scanned across hooks, tools, commands, and schemas. No critical findings. One warning (PostToolUse/Bash hook) is accepted — the handler (`triage-error.js`) is read-only and clean. All network calls are to `raw.githubusercontent.com` for version checking (explicitly declared) or via the user-authenticated `gh` CLI. No credential access, no eval, no exfiltration paths, no persistence mechanisms beyond local config and cache files.
