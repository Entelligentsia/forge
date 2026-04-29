## Security Scan — forge:forge — 2026-04-06

**SHA**: ac736a4408ed1695484637caf9e6c1fd01e3f6ee (installed 0.5.2) | **Source scanned**: forge/ at 0.5.4
**Installed**: 2026-03-31T12:41:57.531Z | **Last updated**: 2026-04-06T15:23:44.232Z
**Scope**: user | **Install path**: /home/boni/.claude/plugins/cache/forge/forge/0.5.2

> Note: Source scanned is the working tree at 0.5.4 (current HEAD), which includes all
> changes from this session. The installed plugin cache is at 0.5.2 and will be updated
> on the next `/plugin` install.

### Summary

89 files scanned | 0 critical | 0 warnings | 3 info

### Findings

#### [INFO] hooks/check-update.js:23 and hooks/check-update.sh:14
- **Check**: A — Hook scripts, outbound network call
- **Issue**: Both hooks make an outbound HTTPS GET to `raw.githubusercontent.com` to check the remote plugin version once per 24 hours. The destination is the official Forge plugin manifest on GitHub — the same repository this plugin ships from. No data is sent; only the remote `plugin.json` is read.
- **Excerpt**: `const remoteUrl = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Safe. The call is the stated function of the hook (version checking), destination is the plugin's own repository, no user data is transmitted.

#### [INFO] hooks/check-update.js:21 and hooks/check-update.sh:13
- **Check**: A — Hook scripts, temp dir write
- **Issue**: Both hooks write a small JSON cache file (`{ lastCheck, remoteVersion, localVersion, migratedFrom }`) to `$CLAUDE_PLUGIN_DATA` or `/tmp/forge-plugin-data/`. No sensitive data is written — only version strings and a Unix timestamp.
- **Excerpt**: `const cacheFile = path.join(dataDir, 'update-check-cache.json');`
- **Recommendation**: Safe. Cache contains no credentials or user data. Write is necessary to throttle the remote check to once per day.

#### [INFO] hooks/check-update.js:34 and hooks/check-update.sh:25
- **Check**: B — Context file, stale command reference
- **Issue**: The `forgeContext` string injected at session start references `/plan-task` which no longer exists. The correct command is `/plan` after the 0.5.0 rename. This causes mildly incorrect guidance to be injected into every session on a Forge project.
- **Excerpt**: `'Use the project slash commands (/plan-task, /implement, /sprint-plan) to drive development. '`
- **Recommendation**: Update to `/plan` — tracked and fixed in this scan.

---

### Clean Areas

- `tools/manage-config.cjs` — reads/writes `.forge/config.json` only; no network, no credential access; input validated; atomic writes via tmp+rename
- `tools/validate-store.cjs` — reads `.forge/store/` and `.forge/schemas/` only; no network; no writes except in `--fix` mode (backfills missing fields)
- `tools/collate.cjs` — reads store JSON, writes markdown views; no network; no credential access
- `tools/seed-store.cjs` — reads `engineering/` directory, writes to `.forge/store/`; no network
- `tools/generation-manifest.cjs` — reads/writes `.forge/generation-manifest.json`; SHA-256 hashing via Node.js `crypto` built-in; no network
- `tools/estimate-usage.cjs` — reads/writes `.forge/store/events/`; heuristic computation only; no network
- `hooks/triage-error.js` — reads Bash tool event from stdin; writes `additionalContext` to stdout; no network, no file writes, no credential access
- `hooks/list-skills.js` — reads `~/.claude/plugins/installed_plugins.json` and `~/.claude/skills/`; no network, no writes
- `hooks/hooks.json` — two hooks: SessionStart (check-update, 10s timeout) and PostToolUse/Bash (triage-error, 5s timeout); no unrestricted Bash or Write tool grants; timeouts within acceptable bounds
- `commands/*.md` — 10 command files; no prompt injection patterns detected; no hidden instructions; frontmatter descriptions match body content; no base64 blobs; no zero-width characters
- `meta/**/*.md` — persona, workflow, template, tool-spec meta files; no injection patterns; describe agent behaviour without attempting to override system prompt
- `schemas/*.json` — four JSON Schema files; data only
- `migrations.json` — version migration chain; data only
- `sdlc-config.schema.json` — config schema; data only
- No binary, compiled, or bytecode files present
- Total size 624K — appropriate for a documentation-heavy plugin

---

### Verdict

**SAFE TO USE**

The plugin consists of Node.js tools (no npm dependencies, Node built-ins only), markdown instruction files, and two hooks that perform version checking and error triage. No credential access, no data exfiltration, no eval, no prompt injection. The single INFO-level code finding (stale `/plan-task` command reference in context strings) is cosmetic and has been corrected in this release.
