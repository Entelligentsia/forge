## Security Scan — forge@forge — 2026-04-05

**SHA**: 17ea44d6f5020a85dfda2046ca1785eaaa11ce50 | **Installed**: 2026-03-31T05:33:42.298Z | **Last updated**: 2026-04-05T03:35:44.385Z
**Scope**: user | **Install path**: /home/boni/.claude/plugins/cache/forge/forge/0.3.15
**Source scanned**: /home/boni/src/forge/forge/ (v0.4.0, pre-publish)

### Summary
72 files scanned | 0 critical | 0 warnings | 4 info

### Findings

#### [INFO] forge/hooks/check-update.js:23
- **Check**: A — Hook Scripts (network calls)
- **Issue**: Outbound HTTPS GET to `raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` for version checking. Hardcoded URL, 5-second timeout, response parsed as JSON for `.version` field only. No user data sent.
- **Excerpt**: `const remoteUrl = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Safe — this is a standard version-check pattern against the plugin's own repository. URL is hardcoded, response is constrained to a single JSON field.

#### [INFO] forge/hooks/check-update.sh:14,44,55
- **Check**: A — Hook Scripts (network calls)
- **Issue**: Bash equivalent of above — `curl -sf --max-time 5` to the same hardcoded `raw.githubusercontent.com` URL. Silent fail, 5-second max.
- **Excerpt**: `REMOTE_VERSION=$(curl -sf --max-time 5 "$REMOTE_URL" 2>/dev/null | jq -r '.version // ""' 2>/dev/null || echo "")`
- **Recommendation**: Safe — same justified version-check pattern as the JS hook.

#### [INFO] forge/hooks/check-update.js:21
- **Check**: A — Hook Scripts (temp writes)
- **Issue**: Writes update-check cache to `CLAUDE_PLUGIN_DATA` (or `os.tmpdir()/forge-plugin-data`). Contains only `lastCheck`, `remoteVersion`, `localVersion`, and `migratedFrom` fields.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Safe — plugin data directory is the expected location. Cache content is non-sensitive (version strings and timestamps).

#### [INFO] forge/commands/update-tools.md:46, forge/init/generation/generate-tools.md:37
- **Check**: B — Skill/Command files (chmod instruction)
- **Issue**: Markdown instructions tell the agent to `chmod +x` generated tool files. This applies only to plugin-generated CJS tools in the project's own `engineering/tools/` directory.
- **Excerpt**: `Make each file executable (\`chmod +x\`).`
- **Recommendation**: Safe — applies to project-local generated scripts, not downloaded or external files.

### Clean Areas
- `forge/hooks/triage-error.js` — no network calls, reads stdin only, writes context back. Clean.
- `forge/hooks/list-skills.js` — reads `installed_plugins.json` and `~/.claude/skills/`. No network calls. Clean.
- `forge/hooks/list-skills.sh` — bash equivalent. Clean.
- `forge/hooks/hooks.json` — two hooks registered (SessionStart, PostToolUse:Bash). Timeouts 10s/5s. No `allowed-tools` grants. Clean.
- `forge/.claude-plugin/plugin.json` — no `allowed-tools` field. Standard metadata only. Clean.
- `forge/tools/manage-config.cjs` — local filesystem ops only, validates input, atomic writes. Clean.
- `forge/tools/seed-store.cjs` — local filesystem ops only, dry-run support. Clean.
- `forge/tools/validate-store.cjs` — read-only by default, write only in `--fix` mode. Clean.
- `forge/tools/collate.cjs` — local filesystem ops, deterministic markdown generation. Clean.
- `forge/tools/estimate-usage.cjs` — local filesystem ops, atomic writes, dry-run support. Clean.
- `forge/schemas/*.json` — pure JSON Schema definitions. Clean.
- `forge/sdlc-config.schema.json` — pure JSON Schema. Clean.
- `forge/migrations.json` — pure data. Clean.
- `forge/commands/*.md` — no prompt injection patterns, no hidden instructions, no zero-width Unicode. Clean.
- `forge/meta/**/*.md` — no prompt injection patterns, no `allowed-tools` grants. HTML comments are all `<!-- GENERATED -->` markers. Clean.
- `forge/init/**/*.md` — no prompt injection patterns. Clean.
- `forge/vision/**/*.md` — documentation only, no executable instructions. Clean.

### Checks Performed
- **Check A (Hook Scripts)**: All 6 hook files read. No credential access, no eval, no shell init writes, no persistence mechanisms, no obfuscation. Two justified network calls (version check).
- **Check B (Prompt Injection)**: All 48 markdown files scanned. No injection phrases, no persona hijacking, no safety bypasses, no exfiltration instructions, no zero-width Unicode, no base64 blobs, no hidden post-document instructions.
- **Check C (Permissions)**: `plugin.json` has no `allowed-tools`. `hooks.json` registers 2 hooks with reasonable timeouts. No unrestricted Bash/Write/Agent grants anywhere.
- **Check D (Structural)**: 72 files, 572K total. All files are text (ASCII/UTF-8/JSON). No binaries, compiled artifacts, or misleading extensions detected.

### Verdict

**SAFE TO USE**

The plugin contains no critical or warning-level findings. All network calls are justified version-check requests to the plugin's own GitHub repository with hardcoded URLs and timeouts. All tools operate on local project files only. No prompt injection patterns, credential access, or permission escalation detected. The v0.4.0 changes (token tracking sprint) are purely additive — new optional schema fields, a new estimation tool, and extended markdown generation.
