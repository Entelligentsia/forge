## Security Scan — forge:forge — 2026-04-04

**SHA**: 17ea44d6f5020a85dfda2046ca1785eaaa11ce50 (installed cache; scanning source at 0.3.8) | **Installed**: 2026-03-31T05:33:42.298Z | **Last updated**: 2026-04-03T08:47:35.121Z
**Scope**: user | **Install path**: /home/boni/.claude/plugins/cache/forge/forge/0.3.7

> Note: fixes in this release (0.3.8) were scanned from source at `/home/boni/src/forge/forge/` prior to publication.

### Summary
83 files scanned | 0 critical | 3 warnings | 2 info | 532K total size

### Findings

#### [WARNING] hooks/check-update.sh:44, hooks/check-update.js:49
- **Check**: A — outbound network call
- **Issue**: Both `check-update.sh` and `check-update.js` make an outbound HTTPS GET to `raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`. This is the canonical version-check endpoint for the plugin's own update detection.
- **Excerpt**: `REMOTE_URL="https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json"` / `const remoteUrl = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Explicitly permitted by scan policy — version-check endpoints on `raw.githubusercontent.com` are acceptable. Response is parsed for `.version` only; no credentials or user data are sent. Only the version string from the response is written to a local cache file. Safe to use.

#### [WARNING] hooks/check-update.sh:12, hooks/check-update.js:21
- **Check**: A — writes to `/tmp`
- **Issue**: Both hooks write a cache file to `$CLAUDE_PLUGIN_DATA` (default: `/tmp/forge-plugin-data/update-check-cache.json`). The written content is a JSON object containing only `lastCheck` (epoch), `remoteVersion`, `localVersion`, and `migratedFrom` — no credentials or user data.
- **Excerpt**: `DATA_DIR="${CLAUDE_PLUGIN_DATA:-/tmp/forge-plugin-data}"` / `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Justified — caching the version-check result to `/tmp` avoids a network call on every session. Content is non-sensitive. Safe.

#### [WARNING] hooks/check-update.sh (`.sh` file present alongside `.js` equivalent)
- **Check**: D — redundant hook implementation
- **Issue**: Both `check-update.sh` and `check-update.js` implement the same logic. `hooks.json` registers only the `.js` version. The `.sh` file is not referenced but is present and executable.
- **Excerpt**: `hooks.json` → `"command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/check-update.js\""` (`.sh` not registered)
- **Recommendation**: Low risk — the `.sh` file is not hooked and will never execute automatically. Consider removing it in a future release to reduce surface area. No action required for users.

#### [INFO] hooks/hooks.json — PostToolUse matcher is broad
- **Check**: C — hook scope
- **Issue**: The PostToolUse hook matches `"Bash"` (all Bash calls), not a narrower pattern. The hook body (`triage-error.js`) correctly filters to Forge-related commands and only emits on non-zero exits — the broad matcher doesn't confer broader capabilities. No credentials are accessed and no network calls are made.
- **Excerpt**: `"matcher": "Bash"` → `node "${CLAUDE_PLUGIN_ROOT}/hooks/triage-error.js"`
- **Recommendation**: Functionally safe. The implementation correctly guards on `isForgeRelated(command)` before any action. No user action needed.

#### [INFO] commands/update-tools.md:46, init/generation/generate-tools.md:37
- **Check**: A — `chmod +x` instruction
- **Issue**: Both files contain the instruction `Make each file executable (chmod +x)`. These are natural-language directives to Claude inside Markdown command files — not executable shell scripts. The chmod applies to generated `.cjs` tool files and is appropriate for making them runnable.
- **Excerpt**: `Make each file executable (\`chmod +x\`).`
- **Recommendation**: Expected behaviour for tool installation. Not a hook script. Safe.

### Clean Areas
- `tools/collate.cjs` — no network calls, no credential access, no eval, deterministic file generation only
- `tools/validate-store.cjs` — reads local JSON files, no network or shell calls
- `tools/seed-store.cjs` — reads local files, no network or shell calls
- `tools/manage-config.cjs` — reads/writes `.forge/config.json` only, no network or shell calls
- `hooks/triage-error.js` — reads stdin, emits structured context output only; no network, no file writes, no credential access
- `hooks/list-skills.sh` + `hooks/list-skills.js` — reads `~/.claude/plugins/installed_plugins.json` and `~/.claude/skills/` only; no network, no credential access
- `commands/*.md` — all command files reviewed; no prompt injection, no persona hijacking, no exfiltration instructions, no hidden instructions
- `schemas/*.schema.json` — plain JSON Schema definitions; no executable content
- `meta/`, `init/`, `vision/` — documentation and generation templates; no injection patterns detected
- No binary or compiled artifacts present
- No invisible Unicode (zero-width characters, BOM) detected
- No `eval`, `base64 -d | bash`, or obfuscation patterns
- No credential-adjacent path reads (`~/.ssh`, `~/.aws`, `.env`, etc.)
- No persistence mechanisms (`crontab`, `systemctl`, `launchctl`)
- No silent package installation

### Verdict

**SAFE TO USE**

All 83 files are clean. The three warnings are accounted for and justified: the outbound network call is a standard version-check to the plugin's own GitHub endpoint; the `/tmp` write is a non-sensitive cache; and the unregistered `.sh` file poses no runtime risk. No prompt injection, credential access, exfiltration, or persistence mechanisms were found.
