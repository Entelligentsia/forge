## Security Scan — forge:forge — 2026-04-10

**SHA**: not recorded (source directory scan) | **Installed**: N/A | **Last updated**: 2026-04-10
**Scope**: source | **Install path**: /home/boni/src/forge/forge/

### Summary
88 files scanned | 0 critical | 3 warnings | 2 info

### Findings

#### [WARNING] hooks/check-update.js:44
- **Check**: A — outbound network call
- **Issue**: Makes HTTPS request to `raw.githubusercontent.com` to fetch remote `plugin.json` for version comparison. URL is read from the installed plugin's own `plugin.json` (`updateUrl` field) with a hardcoded fallback to the Entelligentsia/forge repo.
- **Excerpt**: `const FALLBACK_UPDATE_URL = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Justified. This is the stated purpose of the hook (once-per-day update check). The URL is limited to `raw.githubusercontent.com`. A 5,000ms HTTPS timeout guard prevents hanging. No body content is sent. Safe to accept.

#### [WARNING] hooks/check-update.js:24-30
- **Check**: A — writes to shared temp location and project cache
- **Issue**: Writes throttle cache to `os.tmpdir()/forge-plugin-data/` and migration state cache to `.forge/update-check-cache.json`. Reads and updates `.forge/config.json` (`paths.forgeRoot` field).
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Justified. Cache files store only version strings and timestamps — no credentials or sensitive data. Config write is scoped to the `paths.forgeRoot` field for path synchronisation, a core feature of the plugin. No concern.

#### [WARNING] hooks/list-skills.js:27-30
- **Check**: A — reads sensitive path
- **Issue**: Reads `~/.claude/plugins/installed_plugins.json` to enumerate which plugins are available. This file contains the list of all installed Claude Code plugins.
- **Excerpt**: `path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json')`
- **Recommendation**: Justified. The purpose is skill discovery — the hook checks whether companion skills (e.g. `security-watchdog`) are available before referencing them in commands. Data is consumed locally, never exfiltrated. The environment variable `CLAUDE_PLUGIN_DATA_ROOT` allows override.

#### [INFO] hooks/hooks.json:9 — hook timeout
- **Check**: C — hook timeout elevated
- **Issue**: `check-update.js` hook is registered with a 10,000ms timeout, above the 5,000ms recommended ceiling.
- **Excerpt**: `"timeout": 10000`
- **Recommendation**: The HTTPS fetch inside has its own 5,000ms timeout guard, so the 10s outer limit is a safety net. The extra 5s accommodates slow DNS/TLS on first run. Acceptable; would ideally be 7,000ms.

#### [INFO] hooks/check-update.js:36
- **Check**: A — distribution detection via path pattern
- **Issue**: Detects `forge@skillforge` distribution by checking if `CLAUDE_PLUGIN_ROOT` contains `/cache/skillforge/forge/`. This path assumption could mis-classify an installation if Claude Code changes its cache layout.
- **Excerpt**: `return root.includes('/cache/skillforge/forge/') ? 'forge@skillforge' : 'forge@forge';`
- **Recommendation**: Low risk. Used only for labelling in user-facing messages (distribution switch notifications). Mis-classification produces a cosmetic false positive message, not a security issue. Acceptable.

### Clean Areas
- `commands/` — no prompt injection, no credential access, no exfiltration instructions
- `meta/workflows/` — all workflow instruction files are legitimate SDLC orchestration prompts; no persona hijacking or safety bypass patterns
- `meta/personas/` — "act as" grep hit in `meta-architect.md` was a false positive ("deployment topology for impact assessment"); no persona hijack language present
- `tools/` — all five `.cjs` tools are self-contained Node.js utilities operating only on `.forge/` project files; no network calls, no credential access, no `eval`
- `schemas/` — pure JSON Schema definitions, no executable content
- `hooks/triage-error.js` — reads stdin only, writes to stdout, no network or filesystem access outside of output
- No binary or compiled files present
- No invisible Unicode (zero-width characters, BOM) found in any file
- No base64-encoded blobs embedded in markdown
- No `eval`, `sudo`, silent installs, or persistence mechanisms in any hook script
- All file extensions match content types

### Verdict

**SAFE TO USE**

88 files scanned with no critical findings. The three warnings are all justified by the plugin's stated purpose (daily version check, project path synchronisation, skill discovery). The 0.6.8 change specifically simplifies the update URL logic by removing the hardcoded `SKILLFORGE_UPDATE_URL` — this reduces the attack surface relative to the prior version.
