## Security Scan — forge@forge (source) — 2026-04-16

**SHA**: not recorded (source scan, not installed) | **Installed**: N/A (source) | **Last updated**: 2026-04-16
**Scope**: source directory | **Install path**: `/home/boni/src/forge/forge/`

### Summary
112 files scanned | 0 critical | 1 warning | 4 info

### Findings

#### [INFO] forge/hooks/check-update.js:77
- **Check**: A — Hook Scripts
- **Issue**: Outbound HTTPS network call to `raw.githubusercontent.com` for version checking.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe to ignore — this is the documented version-check mechanism. URL is derived from `plugin.json` `updateUrl` field, not hardcoded (fallback is the main branch). Timeout is 5 seconds.

#### [INFO] forge/hooks/check-update.js:24
- **Check**: A — Hook Scripts
- **Issue**: Writes cache file to shared temp location (`os.tmpdir()`) for plugin-level throttle cache.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Safe to ignore — the `CLAUDE_PLUGIN_DATA` env var override is documented. Default temp dir usage is appropriate for non-sensitive throttle cache (only stores `lastCheck` timestamp and `remoteVersion` string).

#### [WARNING] forge/commands/calibrate.md:73
- **Check**: B — Skill/Command/Context Files
- **Issue**: The drift detection step (Step 3) and baseline update step (Step 8) include inline `node -e` commands that read `.forge/config.json` and compute a SHA-256 hash. While the commands only use `crypto` and `fs` built-ins and read known project files, inline `node -e` commands in Markdown instruction files can be a vector if the agent modifies the command string before execution. In this case the commands are deterministic and self-contained — risk is minimal.
- **Excerpt**: `node -e "const crypto=require('crypto'),fs=require('fs'); const cfg=JSON.parse(fs.readFileSync('.forge/config.json','utf8')); ..."`
- **Recommendation**: Accepted — the pattern is consistent with `sdlc-init.md` Phase 5 calibration baseline write and `health.md` KB freshness check. No user-supplied variables are interpolated into the command string.

#### [INFO] forge/commands/health.md:66
- **Check**: B — Skill/Command/Context Files
- **Issue**: The KB freshness check step includes an inline `node -e` command that reads `.forge/config.json` and computes a SHA-256 hash. Same pattern as calibrate.md.
- **Excerpt**: `node -e "const crypto=require('crypto'),fs=require('fs'); const cfg=JSON.parse(fs.readFileSync('.forge/config.json','utf8')); ..."`
- **Recommendation**: Accepted — consistent with established project pattern. No user-supplied variables are interpolated.

#### [INFO] forge/hooks/check-update.js:130
- **Check**: A — Hook Scripts
- **Issue**: The hook writes to `.forge/config.json` (updating `paths.forgeRoot`) when the plugin root changes. This is a documented feature for distribution switching.
- **Excerpt**: `cfg.paths.forgeRoot = pluginRoot; fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');`
- **Recommendation**: Safe to ignore — the write is limited to updating a single path field and is gated on the value actually having changed.

### Clean Areas
- `forge/hooks/triage-error.js` — no issues detected (proper error handling, no network calls, no credential access)
- `forge/tools/*.cjs` — no issues detected (all use only Node.js built-ins, no npm dependencies)
- `forge/schemas/*.json` — no issues detected (all have `additionalProperties: false`; new `calibrationHistory` property follows same pattern)
- `forge/commands/calibrate.md` — no prompt injection patterns, no credential exfiltration instructions, no hidden instructions after document end markers
- `forge/commands/*.md` — no prompt injection patterns, no credential exfiltration instructions
- `forge/meta/` — no prompt injection patterns, no hidden instructions after document end markers
- `forge/init/` — no issues detected
- `forge/vision/` — no issues detected (documentation only)
- `forge/sdlc-config.schema.json` — new `calibrationHistory` property follows `additionalProperties: false` convention; no security implications

### Verdict

**SAFE TO USE**

0 critical findings. 1 warning (accepted — inline node -e command follows established project pattern from init and health commands). All hooks have proper exit discipline (exit 0 on error). No npm dependencies, no credential access, no prompt injection patterns, no persistence mechanisms.