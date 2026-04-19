## Security Scan — forge:forge — 2026-04-16

**SHA**: 9521287 | **Installed**: 2026-04-16 | **Last updated**: 2026-04-16
**Scope**: local | **Install path**: /home/boni/src/forge/forge/

### Summary

113 files scanned | 0 critical | 1 warning | 3 info

### Scope

Version 0.9.10 introduced the following changes:

**Modified files:**
- `forge/init/sdlc-init.md` — Added completeness guard (verifies required config fields) and calibration baseline write (SHA-256 hash + sprint coverage) at end of Phase 5
- `forge/.claude-plugin/plugin.json` — Version bump 0.9.9 -> 0.9.10
- `forge/migrations.json` — Migration entry 0.9.9 -> 0.9.10

No new JS/CJS files were introduced. No new hooks, tools, or commands.

All findings are carry-forward from [scan-v0.9.9.md](scan-v0.9.9.md). No new findings introduced by the 0.9.10 changes.

---

### Findings

#### [INFO] forge/hooks/check-update.js
- **Check**: A — Hook Scripts (network call)
- **Issue**: Outbound HTTPS GET to `raw.githubusercontent.com` on every SessionStart where the update-check interval (24h) has elapsed.
- **Excerpt**: `https.get(updateUrl, ...)`
- **Recommendation**: Safe to ignore — this is the documented update-check mechanism. URL is read from `plugin.json` (not hardcoded to an arbitrary host). No credential-adjacent data is sent.

#### [INFO] forge/hooks/triage-error.js
- **Check**: A — Hook Scripts (environment variable read)
- **Issue**: Reads `CLAUDE_PLUGIN_ROOT` to locate the plugin directory. This is the standard plugin root variable injected by the Claude Code harness.
- **Recommendation**: Safe to ignore — standard plugin bootstrap pattern.

#### [INFO] forge/tools/list-skills.js
- **Check**: A — Hook Scripts (environment variable reads)
- **Issue**: Reads `CLAUDE_PLUGIN_DATA_ROOT` and `CLAUDE_SKILLS_DIR` to locate installed plugins and skills directories.
- **Recommendation**: Safe to ignore — these are standard Claude Code plugin infrastructure variables required for the tool's function.

#### [WARNING] forge/tools/banners.sh
- **Check**: A — Hook Scripts (chmod +x)
- **Issue**: Script contains `chmod +x` on `banners.cjs` to ensure it is executable. This is a self-referential operation on the plugin's own file, not on downloaded or external content.
- **Recommendation**: Low risk — only operates on the plugin's own shipped files. Could be replaced by documenting the executable bit in packaging, but not a security concern.

### Clean Areas

- `forge/init/sdlc-init.md` — No prompt injection patterns. No credential access. No network calls. New completeness guard and calibration baseline sections use only hardcoded field names from `sdlc-config.schema.json` and literal file paths. No user-supplied values are interpolated into any script.
- `forge/hooks/` — No credential exfiltration, no eval, no persistence, no outbound calls beyond the documented update-check. Both hooks exit cleanly.
- `forge/tools/*.cjs` — All use `'use strict'` and top-level try/catch. No npm dependencies. No network calls. Paths read from `.forge/config.json`.
- `forge/meta/` — All markdown files free of prompt injection patterns. No zero-width Unicode, no hidden instructions, no base64 blobs.
- `forge/schemas/` — Standard JSON Schema files, no executable content.
- `forge/.claude-plugin/plugin.json` — Standard manifest, no suspicious permissions.
- `forge/migrations.json` — Data file, no executable content.

### Verdict

**SAFE TO USE**

No new security findings in version 0.9.10. The only changes are Markdown additions to `sdlc-init.md` (instruction text using hardcoded field names and literal paths), a version string bump, and a migration data entry. All carry-forward findings remain low-risk and documented.