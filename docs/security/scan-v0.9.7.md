## Security Scan — forge:forge — 2026-04-16

**SHA**: 39582ada643f5a3b9829c6a04cf91e5c682fef4b (local) / 3aae08d58786525be13a68ca1de14d5412e187e3 (user) | **Installed**: 2026-04-09T18:02:54.923Z | **Last updated**: 2026-04-15T18:07:21.776Z
**Scope**: local + user | **Install path**: `/home/boni/.claude/plugins/cache/forge/forge/0.9.6`
**Source path scanned**: `/home/boni/src/forge/forge/` (canary/source install — scanned source, not cache)

### Summary

106 files scanned (820 KB) | 0 critical | 0 warnings | 3 info

---

### Findings

#### [INFO] hooks/check-update.js:77
- **Check**: A — outbound network call
- **Issue**: Single HTTPS GET to a version-check endpoint. The URL is resolved at runtime from `plugin.json → updateUrl`, with a hardcoded fallback to `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`. Call is non-blocking, timeout-bounded (5 s), and error-silent.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Justified by plugin function (update detection). Destination is the official release manifest on GitHub. The runtime URL source (`plugin.json`) is the plugin's own manifest — acceptable chain of trust. No action needed.

#### [INFO] hooks/check-update.js:124–132
- **Check**: A — writes to project config file
- **Issue**: On every session start, the hook updates `paths.forgeRoot` in `.forge/config.json` if it has drifted from the current `CLAUDE_PLUGIN_ROOT`. Bounded to projects that already have `.forge/config.json`; write is idempotent when the value matches.
- **Excerpt**: `cfg.paths.forgeRoot = pluginRoot;` / `fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');`
- **Recommendation**: Documented, intentional behaviour — ensures generated workflows reference the correct plugin path after distribution switches or reinstalls. No action needed.

#### [INFO] commands/update.md
- **Check**: B — file length exceeds 500 lines (902 lines)
- **Issue**: Longest file in the plugin. Content is entirely migration procedure documentation (6-step update flow with sub-checks). No hidden instructions were found after full read; all sections are labelled and purposeful.
- **Excerpt**: `## Step 5 — Pipeline and configuration audit` (line 482 of 902)
- **Recommendation**: No action needed. Length is a function of the complexity of the update/migration algorithm, not an obfuscation vector.

---

### Clean Areas

- `hooks/hooks.json` — standard event registration; no unrestricted Bash, no credential-adjacent paths, no excessive timeouts
- `hooks/triage-error.js` — reads stdin only, no outbound calls, no file writes, output properly JSON-encoded
- `commands/` (all 11 files) — no prompt injection, no persona hijacking, no permission escalation instructions, frontmatter descriptions match body intent
- `meta/workflows/` (16 files) — no injection patterns; all persona instructions are legitimate SDLC role definitions
- `meta/personas/` (9 files) — clean role descriptions, no hidden directives
- `meta/skills/` (7 files) — clean skill definitions
- `tools/` (9 files — `.js` / `.cjs`) — no eval, no credential reads, no network calls, no shell init writes, no silent installers
- `schemas/` (6 JSON files) — pure data, no executable content
- `init/` (10 files) — no injection; all generation instructions are bounded to project-scoped paths
- `vision/` (9 files) — documentation only, no executable instructions
- Invisible Unicode scan — none found across all 106 files
- Base64 blob scan — none found across all `.md` files
- Credential-path scan — no reads of `~/.ssh`, `~/.aws`, `~/.gnupg`, `.env`, `*.pem`, `*.key`
- Persistence mechanism scan — no `crontab`, `systemctl enable`, `launchctl load`, `nohup`, `disown`
- Shell init file scan — no writes to `.bashrc`, `.zshrc`, `.profile`, or variants
- Silent installer scan — no `apt-get`, `brew install`, `npm install -g`, `pip install`

---

### Verdict

**SAFE TO USE**

106 files scanned across hooks, commands, workflows, personas, skills, tools, and schemas. No critical or warning-level findings. The single outbound network call is a justified, timeout-bounded version check against the official GitHub release manifest. Hook scripts are minimal and contain no exfiltration, persistence, or credential-harvesting patterns. All markdown instruction files are clean of prompt-injection language, invisible unicode, and base64 payloads.
