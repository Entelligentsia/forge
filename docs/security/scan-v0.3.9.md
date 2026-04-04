## Security Scan — forge:forge — 2026-04-04

**SHA**: 17ea44d6f5020a85dfda2046ca1785eaaa11ce50 (installed cache at 0.3.7; scanning source at 0.3.9) | **Installed**: 2026-03-31T05:33:42.298Z | **Last updated**: 2026-04-03T08:47:35.121Z
**Scope**: user | **Install path**: /home/boni/.claude/plugins/cache/forge/forge/0.3.7

> Note: 0.3.9 has not yet been published. This scan covers the source tree at `/home/boni/src/forge/forge/` prior to publication. All files unchanged from the clean 0.3.8 scan are noted as carried forward; only the delta (modified `hooks/check-update.js` and new `commands/migrate.md`) is re-analysed in full.

### Summary
84 files scanned | 0 critical | 3 warnings | 2 info

### Findings

#### [WARNING] hooks/check-update.js:44, hooks/check-update.sh:44
- **Check**: A — outbound network call
- **Issue**: Both hooks make an outbound HTTPS GET to `raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` for version detection. Carried forward from 0.3.8 scan — behaviour unchanged.
- **Excerpt**: `const remoteUrl = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Explicitly permitted by scan policy — version-check endpoint on `raw.githubusercontent.com`. Only `.version` from the response is used. Safe.

#### [WARNING] hooks/check-update.js:21, hooks/check-update.sh:12
- **Check**: A — writes to `/tmp`
- **Issue**: Cache file written to `$CLAUDE_PLUGIN_DATA` (default: `/tmp/forge-plugin-data/update-check-cache.json`). Content is version strings and epoch timestamp only. Carried forward from 0.3.8 scan — behaviour unchanged.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Justified. Non-sensitive content. Safe.

#### [WARNING] hooks/check-update.sh — unregistered duplicate
- **Check**: D — dead code with network capability
- **Issue**: `check-update.sh` is not registered in `hooks.json` and will never execute automatically. Carried forward from 0.3.8 scan.
- **Excerpt**: `hooks.json` → `"command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/check-update.js\""` (`.sh` not referenced)
- **Recommendation**: No runtime risk. Consider removing in a future release.

#### [INFO] hooks/check-update.js:90-95 — new post-install message (0.3.9 delta)
- **Check**: A — new message emitted to additionalContext
- **Issue**: New code constructs a message string using `local` (read from the plugin's own `plugin.json`) and `cache.localVersion` (read from the local cache file written by this same hook). Both are version strings. The `emit()` function escapes backslashes and double-quotes before writing to stdout JSON. A tampered cache file could inject text into the context string, but the cache path is under `CLAUDE_PLUGIN_DATA` (user-controlled, not network-writable), and JSON string escaping limits practical impact.
- **Excerpt**: `postInstallMsg = \`Forge was updated to ${local} (was ${cache.localVersion}). Run /forge:update to apply changes to this project.\`;`
- **Recommendation**: Low risk. Values are version strings from files the user controls. The escaping in `emit()` prevents JSON breakout. Safe.

#### [INFO] commands/update-tools.md:46, init/generation/generate-tools.md:37
- **Check**: A — `chmod +x` instruction in Markdown
- **Issue**: Natural-language directive to Claude inside a command file, not an executable script. Carried forward from 0.3.8 scan.
- **Recommendation**: Expected behaviour. Safe.

### Delta Analysis — 0.3.9 changes

**`hooks/check-update.js` (modified):**
- 8 lines added (lines 89–97)
- Change reads `cache.localVersion` and `local` (both version strings), checks for `.forge/config.json` existence, and emits a plain-text prompt to run `/forge:update`
- No new network calls, no credential access, no new file writes, no eval, no shell execution
- The `emit()` output path is unchanged — same escaping, same stdout JSON structure

**`commands/migrate.md` (new):**
- Interactive command guide — freeform Markdown instructions to Claude
- Scoped to projects with `.forge/config.json` (forge:init required)
- Instructs Claude to scan store, interview user, preview, and apply with confirmation
- No prompt injection patterns detected
- No exfiltration instructions, no credential reads, no permission escalation
- No invisible Unicode, no Base64 blobs, no hidden sections

### Clean Areas
- `tools/collate.cjs` — unchanged; no issues
- `tools/validate-store.cjs` — unchanged; no issues
- `tools/seed-store.cjs` — unchanged; no issues
- `tools/manage-config.cjs` — unchanged; no issues
- `hooks/triage-error.js` — unchanged; no issues
- `hooks/list-skills.js` + `hooks/list-skills.sh` — unchanged; no issues
- `commands/*.md` (all) — no injection patterns
- `schemas/*.schema.json` — plain JSON Schema; no executable content
- `meta/`, `init/`, `vision/` — documentation only; no injection patterns
- No binary or compiled artifacts
- No invisible Unicode detected in new or changed files
- No eval, obfuscation, persistence mechanisms, or credential access anywhere in the tree

### Verdict

**SAFE TO USE**

The 0.3.9 delta is minimal and clean: the only behavioural change is a post-install nudge in `check-update.js` that emits a plain-text `/forge:update` reminder, and a new `migrate.md` command with no executable content. All three carried-forward warnings remain justified and unchanged from the 0.3.8 scan.
