## Security Scan — forge@forge — 2026-04-05

**SHA**: 17ea44d6f5020a85dfda2046ca1785eaaa11ce50 (source pre-release) | **Installed**: 2026-03-31T05:33:42.298Z | **Last updated**: 2026-04-05T09:17:25.343Z
**Scope**: user | **Source path**: /home/boni/src/forge/forge/

### Summary
87 files scanned | 0 critical | 4 warnings | 5 info

### Findings

#### [WARNING] forge/hooks/check-update.js:23
- **Check**: A — Hook Scripts
- **Issue**: Outbound HTTPS call to raw.githubusercontent.com
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, ...)` → `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`
- **Recommendation**: Safe — justified version-check endpoint, rate-limited to once per 24h via cache

#### [WARNING] forge/hooks/check-update.js:21-22
- **Check**: A — Hook Scripts
- **Issue**: Writes to plugin data directory (CLAUDE_PLUGIN_DATA or /tmp/forge-plugin-data/)
- **Excerpt**: `fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(cacheFile, ...)`
- **Recommendation**: Safe — designated plugin data dir with /tmp fallback for update-check cache

#### [WARNING] forge/hooks/check-update.sh:44,55
- **Check**: A — Hook Scripts
- **Issue**: Outbound network call via curl to raw.githubusercontent.com
- **Excerpt**: `curl -sf --max-time 5 "$REMOTE_URL"` → same version-check endpoint
- **Recommendation**: Safe — shell duplicate of check-update.js, same justification

#### [WARNING] forge/hooks/check-update.sh:12,19,47,58
- **Check**: A — Hook Scripts
- **Issue**: Writes to /tmp (fallback data dir)
- **Excerpt**: `DATA_DIR="${CLAUDE_PLUGIN_DATA:-/tmp/forge-plugin-data}"; mkdir -p "$DATA_DIR"`
- **Recommendation**: Safe — plugin data cache with CLAUDE_PLUGIN_DATA override

#### [INFO] forge/hooks/list-skills.js:27-29
- **Check**: A — Hook Scripts
- **Issue**: Reads env vars CLAUDE_PLUGIN_DATA_ROOT and CLAUDE_SKILLS_DIR
- **Recommendation**: Plugin infrastructure variables, justified for hook purpose

#### [INFO] forge/hooks/list-skills.sh:21
- **Check**: A — Hook Scripts
- **Issue**: Reads env vars CLAUDE_PLUGIN_DATA_ROOT and CLAUDE_SKILLS_DIR
- **Recommendation**: Same as JS variant — justified

#### [INFO] forge/hooks/check-update.js:20-21
- **Check**: A — Hook Scripts
- **Issue**: Reads env vars CLAUDE_PLUGIN_ROOT and CLAUDE_PLUGIN_DATA
- **Recommendation**: Plugin infrastructure variables, justified

#### [INFO] forge/commands/update.md:28,69
- **Check**: B — Skill/Command Files
- **Issue**: References WebFetch/curl for fetching remote plugin.json and migrations.json
- **Excerpt**: `Use the WebFetch tool (preferred) or curl via Bash:` → `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/...`
- **Recommendation**: Safe — update command fetching own release metadata from GitHub

#### [INFO] forge/vision/09-ORCHESTRATION.md
- **Check**: B — Skill/Command Files
- **Issue**: File exceeds 500 lines (510 lines)
- **Recommendation**: Safe — vision document, not an instruction file; no hidden instructions found on inspection

### Clean Areas
- forge/commands/ (9 files) — no prompt injection, no allowed-tools in frontmatter, no credential access
- forge/meta/ (28 files) — no prompt injection, no hidden instructions, no exfiltration patterns
- forge/init/ (9 files) — no prompt injection, no credential access, no suspicious patterns
- forge/vision/ (9 files) — no prompt injection; HTML comments are benign generation markers only
- forge/tools/ (5 .cjs files) — all verified as Node.js text; no binary content, no network calls, no credential access
- forge/schemas/ (4 .json files) — valid JSON schema files, no executable content
- forge/hooks/hooks.json — declarative config, two hooks with safe timeouts (<30s)
- forge/hooks/triage-error.js — reads stdin only, no network/file/credential access
- forge/.claude-plugin/plugin.json — no allowed-tools grants
- forge/sdlc-config.schema.json — valid JSON schema
- forge/migrations.json — valid JSON data

### Verdict

**SAFE TO USE**

All 87 files are verified text. Zero critical findings. The 4 warnings are justified outbound calls to raw.githubusercontent.com for version checking (rate-limited, timeout-bounded) and writes to the designated plugin data cache directory. No prompt injection, no credential access, no permission escalation, no obfuscation, no binary artifacts. The new `pipeline backfill-models` subcommand in manage-config.cjs is a pure local config transformation with no network or credential access.
