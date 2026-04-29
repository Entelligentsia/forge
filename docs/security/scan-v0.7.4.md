## Security Scan — forge:forge — 2026-04-14

**SHA**: not recorded (source scan) | **Installed**: n/a | **Last updated**: n/a
**Scope**: source | **Install path**: /home/boni/src/forge/forge/

### Summary
102 files scanned | 0 critical | 2 warnings | 1 info

### Findings

#### [WARNING] forge/commands/update.md:60
- **Check**: B — Skill/Command prompt injection
- **Issue**: References `curl` via Bash as a fallback for fetching remote plugin manifest. The URL is templated from `plugin.json`'s `updateUrl` (always `raw.githubusercontent.com`), so the destination is constrained.
- **Excerpt**: `Use the WebFetch tool (preferred) or curl via Bash:`
- **Recommendation**: Safe to ignore — the URL is sourced from the plugin's own `updateUrl` field which only references `raw.githubusercontent.com` domains.

#### [WARNING] forge/hooks/check-update.js:20-21
- **Check**: A — Hook scripts, network calls
- **Issue**: Makes HTTPS calls to `raw.githubusercontent.com` for version checking. Uses `https.get()` with a URL derived from `plugin.json`'s `updateUrl`. Writes to `/tmp` (via `os.tmpdir()`) for update-check cache.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Safe to ignore — network calls are to the official GitHub release API only. Temp directory usage is for throttling cache (lastCheck + remoteVersion), no sensitive data stored.

#### [INFO] forge/tools/store.cjs:166-193
- **Check**: A — New code in this release
- **Issue**: `_findEventFileByContentId` reads and parses all event JSON files in a directory to find ghost files. `renameEvent` uses `fs.renameSync` to relocate files. `writeEvent` calls both before writing. No network, no credential access, no external process spawning. All operations are on local store files within `.forge/store/events/`.
- **Excerpt**: `const ghostFilename = this._findEventFileByContentId(sprintId, data.eventId);`
- **Recommendation**: Clean — no security concerns.

### Clean Areas
- forge/hooks/check-update.js — exits 0 on all errors, only reads plugin.json and GitHub version endpoint
- forge/hooks/triage-error.js — exits 0, no network, no file writes beyond stdout
- forge/hooks/list-skills.js — exits 0, reads plugin directories only
- forge/tools/validate-store.cjs — top-level try/catch, reads store files only, no network, `--dry-run` flag respected
- forge/tools/collate.cjs — reads store, writes to engineering/, no network
- forge/tools/seed-store.cjs — reads store, scaffolds directories, no network
- forge/tools/manage-config.cjs — reads/writes .forge/config.json, no network
- forge/tools/estimate-usage.cjs — reads events, computes estimates, no network
- forge/tools/generation-manifest.cjs — reads generated files, no network
- forge/commands/*.md — no prompt injection patterns, no permission escalation, no credential exfiltration instructions
- forge/meta/**/*.md — no prompt injection, no persona hijacking, no safety bypass
- forge/schemas/*.json — static JSON Schema definitions, `additionalProperties: false` preserved
- forge/migrations.json — migration history, no executable content
- forge/.claude-plugin/plugin.json — metadata only

### Verdict

**SAFE TO USE**

No critical findings. The two warnings relate to pre-existing patterns (GitHub version-check HTTPS call, temp directory cache) that are justified by plugin function and constrained to official endpoints. The new code in this release (ghost file detection and rename) introduces no security concerns.