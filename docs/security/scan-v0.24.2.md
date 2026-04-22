## Security Scan — forge:forge (source) — 2026-04-22

**SHA**: not recorded (source directory scan) | **Installed**: N/A | **Last updated**: 2026-04-22
**Scope**: source | **Install path**: /home/boni/src/forge/forge/

### Summary
170 files scanned | 0 critical | 2 warnings | 1 info

### Findings

#### [WARNING] forge/hooks/check-update.js:163
- **Check**: A — Hook Scripts
- **Issue**: Network call to GitHub for version check
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe. URL derived from plugin.json `updateUrl` field (https://raw.githubusercontent.com/Entelligentsia/forge/release/forge/.claude-plugin/plugin.json). Purpose: version update notification. No data exfiltration.

#### [WARNING] forge/hooks/check-update.js:220
- **Check**: A — Hook Scripts
- **Issue**: Writes to project `.forge/config.json` file
- **Excerpt**: `fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');`
- **Recommendation**: Safe. Updates `paths.forgeRoot` field to sync with active plugin path. No credential access. Purpose: distribution switch handling (forge@forge ↔ forge@skillforge).

#### [INFO] forge/integrity.json
- **Check**: D — Structural Anomalies
- **Issue**: Integrity manifest version (0.24.1) behind plugin version (0.24.2)
- **Excerpt**: `{"version":"0.24.1",...}`
- **Recommendation**: Safe. Dev workflow artifact — regenerate via `gen-integrity.cjs` before release. Not security issue.

### Clean Areas
- forge/hooks/validate-write.js — PreToolUse hook for schema validation, no network calls, fail-open on error
- forge/hooks/triage-error.js — PostToolUse hook for bash error triage, no network calls
- forge/hooks/hooks.json — hook registrations use `${CLAUDE_PLUGIN_ROOT}` variable (safe interpolation)
- forge/tools/ — 170+ CJS tools, all use Node.js built-ins only, no npm dependencies, no network calls except check-update
- forge/commands/ — 14 command files, no prompt injection patterns detected
- forge/meta/workflows/ — 18 workflow templates, no hidden instructions, HTML comments used for KB discovery tags only
- forge/meta/personas/ — 8 persona definitions, no persona hijacking or safety bypass patterns
- forge/schemas/ — JSON schemas only, no executable content
- forge/.claude-plugin/plugin.json — version 0.24.2, no unrestricted tool permissions
- No binaries, no compiled artifacts (`.pyc`, `.so`, `.exe`, `.class`)
- No credential reads (`.ssh/`, `.aws/`, `.env`, `*.pem`)
- No environment variable exfiltration (no `TOKEN`, `SECRET`, `KEY`, `PASSWORD` captures)
- No `eval`, `base64 -d | bash`, or command obfuscation
- No persistence mechanisms (`crontab`, `systemctl`, `launchctl`)
- No sudo, no silent software installation
- No writes to shell init files (`.bashrc`, `.zshrc`)

### Verdict

**SAFE TO USE**

Clean security posture. Single network call limited to version-check API on official GitHub repository. No credential access, no exfiltration vectors, no prompt injection. Write operations confined to Forge-owned paths (`.forge/config.json` for path sync). All hooks use Node.js built-ins with proper error handling (fail-open). 0 critical findings.
