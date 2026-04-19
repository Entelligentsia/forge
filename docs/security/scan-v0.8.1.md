## Security Scan — forge:forge — 2026-04-14

**SHA**: source scan (no gitCommitSha) | **Installed**: local source | **Last updated**: 2026-04-14
**Scope**: source directory | **Install path**: /home/boni/src/forge/forge/

### Summary
102 files scanned | 0 critical | 2 warnings | 3 info

### Findings

#### [WARNING] hooks/check-update.js:77
- **Check**: A — Hook Scripts (outbound network call)
- **Issue**: Makes an outbound HTTPS GET on every SessionStart (throttled to once per 24h via plugin-level cache). The URL is read from `plugin.json → updateUrl` with a hard-coded fallback to `raw.githubusercontent.com/Entelligentsia/forge/main/…`. The call is justified (version check), destination is the official Forge repo, timeout is 5 s, and only the `version` field of the response is used. No request body, no user data sent.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe — call is version-check only, destination is the Forge release manifest on GitHub, no user data is transmitted. Verify the `updateUrl` in your installed `plugin.json` if you installed from a fork.

#### [WARNING] commands/update.md:853 lines
- **Check**: B — Skill/Command files (long file)
- **Issue**: `update.md` is 853 lines — the longest command file, above the 500-line advisory threshold. Content was reviewed in full; no hidden instructions found after the final `---` or in HTML comments. Length is explained by the multi-step migration workflow (Steps 1–6 each documented in detail, plus Step 5's sub-procedures for pipeline audit).
- **Excerpt**: File ends cleanly with `## On error` section and standard `/forge:report-bug` guidance.
- **Recommendation**: Safe — length is justified by workflow complexity. No buried instructions detected.

#### [INFO] hooks/hooks.json — two event types registered
- **Check**: C — Permissions (multiple event hooks)
- **Issue**: Hooks registered on `SessionStart` (check-update.js) and `PostToolUse/Bash` (triage-error.js). Both serve clearly stated purposes documented in their script headers.
- **Excerpt**: `"SessionStart": [...check-update.js...]`, `"PostToolUse": [...triage-error.js...]`
- **Recommendation**: Both hooks are benign. SessionStart injects Forge context and checks for updates; PostToolUse reads Bash stderr on non-zero exits to offer bug filing. No action required.

#### [INFO] tools/validate-store.cjs — schema URIs
- **Check**: A — external URLs in tool files
- **Issue**: Embedded JSON schemas use `"$schema": "https://json-schema.org/draft/2020-12/schema"` as a URI. This is a non-fetched type identifier (JSON Schema `$schema` is declarative, not a live HTTP call).
- **Excerpt**: `"$schema": "https://json-schema.org/draft/2020-12/schema"`
- **Recommendation**: Safe — JSON Schema `$schema` URIs are never fetched at runtime; they are metadata identifiers only.

#### [INFO] commands/update.md — URL substring in base64 scan
- **Check**: B — base64-like blob check
- **Issue**: The URL `raw.githubusercontent.com/Entelligentsia/forge/main/forge/migrations` triggered the 40+ character alphanumeric pattern detector. It is a plain URL in a code block, not an encoded payload.
- **Excerpt**: `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/migrations.json`
- **Recommendation**: Safe — false positive from URL pattern match. No encoded content present.

### Clean Areas
- `hooks/triage-error.js` — reads stdin event, writes to stdout only, no network, no file writes, no credential reads
- `hooks/list-skills.js` — reads `~/.claude/plugins/installed_plugins.json` and `~/.claude/skills/` (both are Forge-managed paths), no network, no writes
- `tools/` (all 7 `.cjs` files) — local file I/O only, no network calls, no credential reads, no eval
- `meta/` (all personas, skills, workflows, templates, store-schema, tool-specs) — instructional markdown only, no prompt injection patterns detected
- `commands/` (all except update.md, reviewed above) — no hidden instructions, no exfiltration directives, no permission escalation
- `init/` (sdlc-init.md, smoke-test.md, all generation/*.md, all discovery/*.md) — no injection patterns
- `schemas/` — pure JSON Schema definitions
- `migrations.json` — version chain data only
- `vision/` — documentation only
- No binary files, compiled artifacts, or misleading file extensions detected
- No zero-width Unicode characters detected in any markdown file
- No credential path reads (`~/.ssh`, `~/.aws`, `.env`, `.pem`, `.key`) in any hook or tool
- No `eval`, `base64 | bash`, or command obfuscation patterns
- No persistence mechanisms (`crontab`, `systemctl enable`, `launchctl load`)
- No shell init file writes (`.bashrc`, `.zshrc`, `.profile`)
- No `sudo` or silent software installs

### Verdict

**SAFE TO USE**

102 files scanned across hooks, tools, commands, workflows, personas, schemas, and vision docs. No critical findings. Two warnings — both reviewed and confirmed benign (justified outbound version-check; long but clean command file). The plugin makes exactly one outbound network call (throttled, version-check only, to the official Forge GitHub manifest) and performs no credential reads, no persistence, no eval, and no prompt injection.
