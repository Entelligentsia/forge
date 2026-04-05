## Security Scan — forge:forge — 2026-04-05

**SHA**: (source scan — uncommitted 0.3.15) | **Installed**: 2026-03-31T05:33:42.298Z | **Last updated**: 2026-04-05T01:57:03.024Z
**Scope**: user | **Scan path**: /home/boni/src/forge/forge/ (source, not cache)

### Summary
85 files scanned | 0 critical | 2 warnings | 1 info

### Findings

#### [WARNING] hooks/check-update.js:49 and hooks/check-update.sh:44
- **Check**: A — Hook Scripts (network calls)
- **Issue**: Outbound HTTPS GET to `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` for version checking. Occurs once per 24 hours (cached). Response parsed for `.version` field only.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {` / `curl -sf --max-time 5 "$REMOTE_URL"`
- **Recommendation**: Safe — fetches only the plugin manifest from the project's own GitHub repo. Timeout is 5s. No credentials or user data sent. No response data beyond version string is used. Cache at `$CLAUDE_PLUGIN_DATA/update-check-cache.json` prevents repeated calls.

#### [WARNING] hooks/check-update.js:21,92 and hooks/check-update.sh:12,47
- **Check**: A — Hook Scripts (shared temp locations)
- **Issue**: Falls back to `/tmp/forge-plugin-data/` when `CLAUDE_PLUGIN_DATA` is unset. Cache file written there.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Acceptable — contains only version check cache (lastCheck timestamp, version strings). No credentials or sensitive data. World-readable `/tmp` exposure is limited to version numbers.

#### [INFO] meta/workflows/meta-orchestrate.md (0.3.15 changes)
- **Check**: B — Skill/Command files
- **Issue**: New Model Resolution section added. Introduces `ROLE_MODEL_DEFAULTS` lookup table and `model=phase_model` parameter in `spawn_subagent()`. No prompt injection patterns, no credential access, no external calls.
- **Excerpt**: `phase_model = phase.model or ROLE_MODEL_DEFAULTS[phase.role]`
- **Recommendation**: Safe — pure algorithmic logic for model selection. No security implications.

### Clean Areas
- `hooks/triage-error.js` — reads stdin (PostToolUse event), pattern-matches Forge commands, emits additionalContext. No network, no file reads beyond stdin. No issues detected.
- `hooks/list-skills.js` — reads `installed_plugins.json` and `~/.claude/skills/`. No network calls. No issues detected.
- `hooks/list-skills.sh` — same as JS version. Uses `jq` and `find`. No issues detected.
- `hooks/hooks.json` — two hooks registered (SessionStart, PostToolUse/Bash). Timeouts 10s and 5s respectively. No issues detected.
- `commands/*.md` (9 files) — no prompt injection, no hidden instructions, no credential access, no `allowed-tools` frontmatter. No issues detected.
- `init/**/*.md` (13 files) — discovery and generation prompts. No prompt injection, no credential access. No issues detected.
- `meta/**/*.md` (28 files) — personas, workflows, templates, tool specs, store schemas, skill recommendations. No prompt injection patterns detected. `meta-architect.md` matched "act as" in benign context (persona definition for agent role, not hijacking).
- `tools/*.cjs` (4 files) — pure Node.js CJS, no npm dependencies, no network calls, no credential access. Operate only on `.forge/store/` and `engineering/` paths.
- `schemas/*.json` (4 files) — JSON Schema definitions. No executable content.
- `sdlc-config.schema.json` — JSON Schema. No executable content.
- `vision/*.md` (9 files) — documentation only. No issues detected.
- `.claude-plugin/plugin.json` — metadata only. No issues detected.
- `migrations.json` — migration chain data. No executable content. No issues detected.
- `init/generation/generate-orchestration.md` (0.3.15 changes) — updated subagent spawn example to include `model:` parameter. No injection patterns.

### Verdict

**SAFE TO USE**

All 85 files scanned. The only network activity is a once-daily version check against the project's own GitHub raw URL, properly cached and timeout-bounded. No credentials accessed, no exfiltration vectors, no prompt injection, no obfuscated code. The 0.3.15 changes (model resolution in meta-orchestrate and generate-orchestration) are purely algorithmic additions with no security implications.
