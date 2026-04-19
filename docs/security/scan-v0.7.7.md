## Security Scan — forge:forge — 2026-04-14

**SHA**: not recorded (source path scan) | **Installed**: N/A (source scan) | **Last updated**: N/A
**Scope**: project | **Install path**: forge/ (source directory)

### Summary
102 files scanned | 0 critical | 1 warning (justified) | 0 info

### Findings

#### [WARNING] forge/hooks/check-update.js:76-84
- **Check**: A — Hook Scripts
- **Issue**: Outbound HTTPS call to `raw.githubusercontent.com` in `fetchRemoteVersion()`. The URL is dynamically read from the plugin's own `plugin.json` (`updateUrl` field), not hardcoded to an external party. This is the legitimate version-check endpoint for the plugin update mechanism.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => { ... }).on('error', () => cb('')).on('timeout', function() { this.destroy(); cb(''); });`
- **Recommendation**: Safe to ignore — this is the expected update-check behavior. The URL is read from the installed plugin manifest, not from an external source.

### Clean Areas
- forge/hooks/triage-error.js — no network calls, no credential access, no eval, no shell execution
- forge/hooks/list-skills.js — no network calls, reads only local installed_plugins.json and personal skills directory
- forge/tools/store.cjs — no network calls, no eval, local filesystem only
- forge/tools/validate-store.cjs — no network calls, no eval, local filesystem validation only
- forge/tools/collate.cjs — no network calls, no eval, local markdown generation only
- forge/tools/estimate-usage.cjs — no network calls, no eval, local computation only
- forge/tools/manage-config.cjs — no network calls, no eval, local config read/write only
- forge/tools/generation-manifest.cjs — no network calls, no eval, local hash computation only
- forge/tools/seed-store.cjs — no network calls, no eval, local filesystem scaffolding only
- forge/schemas/*.json — schema definition files, no executable content
- forge/commands/*.md — no prompt injection patterns detected
- forge/meta/**/*.md — no prompt injection patterns detected
- forge/hooks/hooks.json — timeouts within bounds (10000ms, 5000ms), no unrestricted Bash or Write permissions
- No binary files, no compiled artifacts, no `.pyc`/`.so`/`.dll`/`.exe` files found
- No `allowed-tools` fields in any markdown or JSON files
- No credential-adjacent path reads (`.ssh`, `.aws`, `.gnupg`, `.env`, `.pem`, `.key`)
- No `eval`, `base64 -d | bash`, `xxd -r | sh`, `python3 -c`, `perl -e` patterns
- No zero-width Unicode characters detected

### Verdict

**SAFE TO USE**

The plugin has one benign outbound HTTPS call for version checking (reading from its own manifest URL). All tools and hooks use only Node.js built-ins (`fs`, `path`, `os`, `https`, `crypto`). No credential access, no eval, no shell injection vectors, no prompt injection patterns in markdown content.