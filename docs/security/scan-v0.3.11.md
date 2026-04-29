# Security Scan — forge (./forge) — 2026-04-04

**SHA**: 17ea44d6f5020a85dfda2046ca1785eaaa11ce50 (installed cache at 0.3.10) | **Installed**: 2026-03-31T05:33:42.298Z | **Last updated**: 2026-04-04T12:04:47.048Z
**Scope**: user | **Install path**: `/home/boni/.claude/plugins/cache/forge/forge/0.3.10`

> **Note:** Source scanned is `forge/` at v0.3.11 (current working tree) — the version being prepared for publication. The installed cache is 0.3.10; the source contains the BUG-001 fix (subagent context isolation) not yet pushed. All findings apply to the 0.3.11 source.

### Summary

78 files scanned (source) | **0 critical** | **3 warnings** | **2 info** | 548 KB total

---

### Findings

#### [WARNING] `forge/hooks/check-update.js`:23 and `forge/hooks/check-update.sh`:14
- **Check**: A — Hook Scripts / outbound network call
- **Issue**: Both hooks make an outbound HTTPS GET to `raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` on SessionStart, once every 24 hours (cache-gated).
- **Excerpt**: `const remoteUrl = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Call is justified — this is the standard version-check pattern using the official raw.githubusercontent.com endpoint, explicitly permitted by the scan criteria. No user data is transmitted; only a version string is fetched. Destination URL is hardcoded (no injection path). **Safe — no action required.**

#### [WARNING] `forge/hooks/check-update.js`:21 and `forge/hooks/check-update.sh`:15
- **Check**: A — Hook Scripts / writing to shared temp location
- **Issue**: Update-check cache is written to `/tmp/forge-plugin-data/update-check-cache.json` (or `$CLAUDE_PLUGIN_DATA`). Cache contains `localVersion`, `remoteVersion`, `lastCheck`, `migratedFrom` — no credentials.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Justified by plugin function. The cache file contains only version strings and a timestamp. The path is controlled by an env var with a safe default. **Safe — no action required.**

#### [WARNING] `forge/commands/update-tools.md`:Step 3
- **Check**: A — `chmod +x` on files
- **Issue**: The update-tools command instructs Claude to run `chmod +x` on the four pre-built CJS tool files after copying them from the plugin.
- **Excerpt**: `Make each file executable (chmod +x).`
- **Recommendation**: Justified — the tools are Node.js scripts with a `#!/usr/bin/env node` shebang that require execute permission to run as CLI commands. The files being chmod'd are the plugin's own pre-built tools, not downloaded from an external source. **Safe — no action required.**

#### [INFO] `forge/hooks/hooks.json` — two event types registered
- **Check**: C — Hooks registered on multiple event types
- **Issue**: Hooks on both `SessionStart` (check-update.js) and `PostToolUse:Bash` (triage-error.js). Both have timeouts within acceptable range (10s and 5s respectively).
- **Recommendation**: Both hooks are functionally motivated — one for update awareness, one for error triage. PostToolUse is scoped to Bash tool only via the matcher. **Safe — no action required.**

#### [INFO] `forge/commands/*.md` — no `allowed-tools` restrictions in frontmatter
- **Check**: C — Permissions
- **Issue**: Command files carry no `allowed-tools` frontmatter. All commands execute with full Claude tool access (Read, Write, Edit, Bash, Glob, Grep, Agent, etc.).
- **Recommendation**: This is by architectural design — Forge is an SDLC orchestrator that must read codebases, write engineering artifacts, spawn subagents, and run validation commands. Restricting tools would break its core function. The full tool set is appropriate for this use case. **No action required, but users should be aware that installed commands run with full Claude tool access.**

---

### Clean Areas

- `forge/hooks/check-update.js` — no credential reads, no `eval`, no shell init writes, no persistence mechanisms, no obfuscation. Uncaught exception handler exits 0 (correct pattern for hooks).
- `forge/hooks/check-update.sh` — identical assessment. `curl` call scoped to official version-check URL with 5s timeout.
- `forge/hooks/triage-error.js` — reads stdin only, writes to stdout only. No network calls, no file I/O beyond the hook event payload. Pattern is correct.
- `forge/hooks/list-skills.js` / `list-skills.sh` — reads `~/.claude/plugins/installed_plugins.json` and `~/.claude/skills/` only. No writes, no network calls.
- `forge/tools/*.cjs` — all four tools (collate, validate-store, seed-store, manage-config) read and write only within the project directory (`.forge/`, `engineering/`). No network calls, no npm dependencies, no `eval`, no credential reads. `manage-config` uses atomic write (`rename` pattern) — correct.
- `forge/commands/*.md` — no prompt injection phrases, no persona hijacking language, no credential exfiltration instructions. Frontmatter `description` fields accurately describe body content. Shell expansion (`!`) backticks used only for safe, read-only operations: `echo $ENV_VAR`, `cat <local file>`, `ls`, `node --version`, `uname`, `gh auth status`, directory existence checks.
- `forge/meta/**/*.md` — no hidden instructions, no content after trailing `---`, no invisible unicode (zero results on unicode scan). HTML comments found are documentation markers only (`<!-- GENERATED -->`, `<!-- AUTO-GENERATED -->`), not hidden instructions.
- No binary files, compiled artifacts, or files with misleading extensions.
- No invisible unicode (U+200B, U+FEFF, U+200C, U+200D, U+00AD) found anywhere.
- No base64-like blobs found.
- Plugin size: 548 KB — appropriate for an SDLC meta-generator of this scope.

---

### Verdict

**SAFE TO USE**

All 78 source files scanned. No critical findings. The three warnings are all justified by plugin function and match the explicitly permitted patterns in the scan criteria (version-check URL on raw.githubusercontent.com, temp cache file, chmod on own scripts). The plugin makes no unexpected network calls, reads no credentials, uses no obfuscation, and contains no prompt injection content.
