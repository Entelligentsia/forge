## Security Scan — forge:forge (source) — 2026-04-21

**SHA**: b4e8875 (latest installed) | **Installed**: 2026-04-21 | **Last updated**: 2026-04-21
**Scope**: user (skillforge) + local (forge) | **Source path**: forge/ (1.6 MB, 171 files)

### Summary
171 files scanned | 0 critical | 3 warnings | 3 info

### Findings

#### [WARNING] forge/hooks/check-update.js:77
- **Check**: A — Hook Scripts
- **Issue**: Outbound HTTPS call to `raw.githubusercontent.com` for version checking. The URL is derived from `plugin.json`'s `updateUrl` field with a hardcoded fallback to `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`. This is a legitimate version-check endpoint, but the URL is configurable via the installed `plugin.json` and could theoretically be redirected if a malicious `plugin.json` were planted.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe to ignore — URL sources are the plugin's own manifest and a known GitHub raw endpoint. No data is sent; only a GET to fetch a version number.

#### [WARNING] forge/hooks/check-update.js:24
- **Check**: A — Hook Scripts
- **Issue**: Cache file written to OS temp directory (`os.tmpdir()`) when `CLAUDE_PLUGIN_DATA` is not set. This is a shared temp location accessible to other user processes.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Low risk — only version-check metadata (timestamps, remote version string) is stored. No credentials or sensitive data. The `CLAUDE_PLUGIN_DATA` env var typically resolves this to `~/.claude/plugins/data/` in production.

#### [WARNING] forge/hooks/check-update.js:58-72 (NEW — multi-plugin scanning)
- **Check**: A — Hook Scripts
- **Issue**: New `scanPluginInstallations()` function scans multiple plugin directories and reads `plugin.json` from each. Also reads `~/.claude/settings.json` and `./.claude/settings.local.json` to determine plugin enabled/disabled status.
- **Excerpt**: 
  ```
  const candidates = [
    path.join(homeDir, '.claude', 'plugins', 'cache', 'forge', 'forge'),
    path.join(homeDir, '.claude', 'plugins', 'marketplaces', 'forge', 'forge'),
    path.join(cwd, '.claude', 'plugins', 'cache', 'forge', 'forge'),
    path.join(cwd, '.claude', 'plugins', 'marketplaces', 'forge', 'forge'),
  ];
  ```
- **Recommendation**: Safe — read-only filesystem scan of known plugin locations. No credential access, no exfiltration, no network calls. Settings files parsed only for `disablePlugin` and `plugins.forge` boolean flags.

#### [INFO] forge/hooks/validate-write.js:173
- **Check**: A — Hook Scripts
- **Issue**: `FORGE_SKIP_WRITE_VALIDATION` environment variable bypasses schema enforcement. While documented as an emergency escape hatch, any process that can set environment variables can disable write validation.
- **Excerpt**: `if (process.env.FORGE_SKIP_WRITE_VALIDATION === '1') {`
- **Recommendation**: By design — the bypass appends an audit line to the affected sprint's progress.log, providing traceability. Acceptable for an emergency override.

#### [INFO] forge/tools/list-skills.js:29
- **Check**: A — Hook Scripts
- **Issue**: Reads `~/.claude/plugins/installed_plugins.json` to enumerate available skills. This is a read-only operation on Claude Code's own plugin metadata.
- **Excerpt**: `path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');`
- **Recommendation**: Safe — this file is Claude Code's own plugin registry, not a credential store.

#### [INFO] forge/hooks/check-update.js:125-131
- **Check**: A — Hook Scripts
- **Issue**: Writes `paths.forgeRoot` to `.forge/config.json` on session start to keep the plugin path synchronization. This is a design feature to handle distribution switches.
- **Excerpt**: `cfg.paths.forgeRoot = pluginRoot; fs.writeFileSync(configPath, ...)`
- **Recommendation**: Safe — intentional sync of the plugin install path for subagent tool invocation.

### Clean Areas
- forge/commands/ — no credential access, no network calls, no prompt injection patterns
- forge/agents/ — no prompt injection, no persona hijacking, no safety bypass phrases
- forge/meta/ — clean YAML frontmatter, no hidden instructions, no zero-width Unicode
- forge/tools/*.cjs — no network calls, no eval, no credential reads, no shell execution
- forge/tools/lib/ — pure validation logic, no I/O side effects
- forge/schemas/ — static JSON schema files, no executable content
- forge/hooks/hooks.json — timeouts within limits (5–10s), no `bash -c` interpolation
- forge/tools/__tests__/check-update.test.cjs — new test file, pure test code, no security concerns
- No binary/compiled files found anywhere in plugin directory
- No `allowed-tools` frontmatter with unrestricted access patterns
- No zero-width Unicode characters detected
- No base64-encoded blobs in markdown files
- No `eval`, `sudo`, `crontab`, `systemctl`, `launchctl`, `nohup`, or command obfuscation patterns

### Verdict

**SAFE TO USE**

Three warnings: two are unchanged from prior scans (HTTPS version check, temp-dir cache), one is new for the multi-plugin scanning feature. All three are low-risk and inherent to the plugin's version-check and plugin-discovery functions. No critical findings, no credential access, no exfiltration vectors, no prompt injection patterns, and no structural anomalies. New code is read-only filesystem scanning with no network calls or sensitive data access.
