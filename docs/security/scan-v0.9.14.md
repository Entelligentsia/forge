## Security Scan — forge:forge — 2026-04-16

**SHA**: not recorded (source-path scan) | **Installed**: N/A | **Last updated**: N/A
**Scope**: source-path | **Install path**: /home/boni/src/forge/forge/

### Summary
113 files scanned | 0 critical | 1 warning (accepted) | 2 info

### Findings

#### [WARNING] forge/hooks/check-update.js:77
- **Check**: A — Hook Scripts
- **Issue**: Outbound HTTPS network call to `raw.githubusercontent.com` for version checking. While the destination is a legitimate GitHub raw content URL (used for checking plugin updates), any outbound network call from a hook warrants flagging.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Accepted — this is the plugin's documented update-check mechanism. The URL is derived from `plugin.json` `updateUrl` field, not hardcoded per-distribution. Timeout is 5s. No data is sent; only a GET request to fetch the remote `plugin.json` version field.

#### [INFO] forge/hooks/check-update.js:24
- **Check**: A — Hook Scripts
- **Issue**: Writes cache files to `os.tmpdir()` (system temp directory) for version-check throttling. Shared across projects.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Safe to ignore — cache contains only `lastCheck` timestamp and `remoteVersion` string. No sensitive data. Temp usage is standard for cross-session throttling.

#### [INFO] forge/commands/update.md:925 lines
- **Check**: B — Skill/Command/Context Files
- **Issue**: Longest Markdown file in the plugin (925 lines). While not inherently suspicious, large instruction files could bury critical instructions deep in the text.
- **Recommendation**: Safe to ignore — the file is the `/forge:update` command, which legitimately requires extensive step-by-step instructions for the update/migration process. Content has been reviewed and is consistent with its stated purpose.

### Clean Areas
- forge/hooks/triage-error.js — no issues detected
- forge/hooks/hooks.json — no issues detected
- forge/tools/banners.sh — no issues detected
- forge/tools/banners.cjs — no issues detected (ASCII art library, no network, no credential access)
- forge/tools/store.cjs — no issues detected (store facade, uses only fs/path, reads config for paths)
- forge/tools/store-cli.cjs — no issues detected (store custodian, schema validation, proper error handling)
- forge/tools/validate-store.cjs — no issues detected (schema validation, no network, no credential access)
- forge/tools/collate.cjs — no issues detected (markdown generation from store, reads config)
- forge/tools/seed-store.cjs — no issues detected (store seeding from filesystem)
- forge/tools/estimate-usage.cjs — no issues detected (token estimation heuristics, reads config)
- forge/tools/manage-config.cjs — no issues detected (config read/write with atomic rename)
- forge/tools/generation-manifest.cjs — no issues detected (content hash tracking)
- forge/tools/build-manifest.cjs — no issues detected (structure manifest builder)
- forge/tools/check-structure.cjs — no issues detected (file presence checker)
- forge/tools/list-skills.js — no issues detected (skill query helper, reads plugin data)
- forge/commands/*.md — no prompt injection patterns detected
- forge/meta/**/*.md — no prompt injection patterns detected
- forge/init/**/*.md — no prompt injection patterns detected
- forge/schemas/*.schema.json — no issues detected (JSON Schema files, `additionalProperties: false` preserved)
- forge/.claude-plugin/plugin.json — no unrestricted permissions

### Hook Discipline
- check-update.js: `'use strict';` present, `process.on('uncaughtException', () => process.exit(0))` present -- PASS
- triage-error.js: `'use strict';` present, `process.on('uncaughtException', () => process.exit(0))` present -- PASS

### Tool Discipline
- All 12 CJS tools have `'use strict';` and top-level try/catch with `process.exit(1)` on error -- PASS
- All tools use only Node.js built-ins (`fs`, `path`, `os`, `https`, `crypto`, `readline`) -- PASS
- `--dry-run` flag honoured by all write-capable tools -- PASS
- Paths read from `.forge/config.json` rather than hardcoded -- PASS

### No-npm Rule
- Zero non-built-in `require()` calls found across all hook and tool files -- PASS

### Verdict

**SAFE TO USE**

113 files scanned with zero critical findings. One accepted warning (version-check HTTPS call to GitHub, justified by plugin function) and two informational notes. All hooks observe correct exit discipline, all tools use only built-in modules, no prompt injection patterns detected, and no credential-access or exfiltration risk present.