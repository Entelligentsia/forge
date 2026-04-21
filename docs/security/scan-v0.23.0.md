## Security Scan — forge:forge (source) — 2026-04-21

**SHA**: b9da64e011fa20a2e10df783862ddef55a571828 (latest installed) | **Installed**: 2026-04-20T18:39:37.606Z | **Last updated**: 2026-04-20T18:39:37.606Z
**Scope**: user (skillforge) + local (forge) | **Source path**: forge/ (1.6 MB, 169 files)

### Summary
169 files scanned | 0 critical | 2 warnings | 3 info

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
- **Issue**: Writes `paths.forgeRoot` to `.forge/config.json` on session start to keep the plugin path synchronized. This is a design feature to handle distribution switches.
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
- No binary/compiled files found anywhere in plugin directory
- No `allowed-tools` frontmatter with unrestricted access patterns
- No zero-width Unicode characters detected
- No base64-encoded blobs in markdown files
- No `eval`, `sudo`, `crontab`, `systemctl`, `launchctl`, `nohup`, or command obfuscation patterns

### Verdict

**SAFE TO USE**

Two warnings are both low-risk and inherent to the plugin's version-check function (HTTPS GET to GitHub raw for version, temp-dir cache fallback). No critical findings, no credential access, no exfiltration vectors, no prompt injection patterns, and no structural anomalies.