## Security Scan — forge:forge — 2026-04-14

**SHA**: not recorded (source scan) | **Installed**: n/a | **Last updated**: n/a
**Scope**: source | **Install path**: /home/boni/src/forge/forge/

### Summary
102 files scanned | 0 critical | 2 warnings | 1 info

### Findings

#### [WARNING] forge/commands/update.md:112
- **Check**: B — Skill/Command prompt injection
- **Issue**: References `curl` via Bash as a fallback for fetching remote plugin manifest. The URL is templated from `plugin.json`'s `updateUrl` (always `raw.githubusercontent.com`), so the destination is constrained. Pre-existing finding — not introduced by this version.
- **Excerpt**: `Use the WebFetch tool (preferred) or curl via Bash:`
- **Recommendation**: Safe to ignore — the URL is sourced from the plugin's own `updateUrl` field which only references `raw.githubusercontent.com` domains.

#### [WARNING] forge/hooks/check-update.js:20-21
- **Check**: A — Hook scripts, network calls
- **Issue**: Makes HTTPS calls to `raw.githubusercontent.com` for version checking. Uses `https.get()` with a URL derived from `plugin.json`'s `updateUrl`. Writes to `/tmp` (via `os.tmpdir()`) for update-check cache. Pre-existing finding — not introduced by this version.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Safe to ignore — network calls are to the official GitHub release API only. Temp directory usage is for throttling cache (lastCheck + remoteVersion), no sensitive data stored.

#### [INFO] forge/commands/update.md:31-79
- **Check**: B — New code in this release
- **Issue**: New "Model-alias auto-suppression pre-check" section added. This is a Markdown instruction that tells the AI to read `.forge/config.json` and scan pipeline model fields against a hardcoded set of standard aliases (`sonnet`, `opus`, `haiku`). No network calls, no credential access, no external process spawning, no prompt injection patterns. The section reads a trusted user-owned config file and compares string values against a fixed set.
- **Excerpt**: `Standard Forge aliases: sonnet, opus, haiku`
- **Recommendation**: Clean — no security concerns.

### Clean Areas
- forge/hooks/check-update.js — exits 0 on all errors, only reads plugin.json and GitHub version endpoint
- forge/hooks/list-skills.js — reads installed_plugins.json only, no network calls
- forge/hooks/triage-error.js — reads error context only, no network calls
- forge/tools/*.cjs — all use Node.js built-ins only (fs, path, os, https, crypto), no npm dependencies
- forge/schemas/*.schema.json — no executable content
- forge/meta/ — meta-definitions for init generation, no executable content
- forge/commands/*.md — no prompt injection patterns detected in any command file
- forge/migrations.json — data file, no executable content

### Verdict

**SAFE TO USE**

No critical findings. Two pre-existing warnings (constrained curl fallback and GitHub-only HTTPS hook) carried forward from prior scans. The new code in this release (model-alias auto-suppression pre-check in update.md) introduces no security concerns — it only reads a trusted local config file and performs string comparison against a fixed set.