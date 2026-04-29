## Security Scan — forge:forge — 2026-04-20

**SHA**: not recorded (source-path scan — local dev tree, no installed_plugins.json entry) | **Installed**: n/a | **Last updated**: n/a
**Scope**: local source | **Install path**: /home/boni/src/forge/forge/

### Summary
167 files scanned | 0 critical | 3 warnings | 4 info

### Findings

#### [WARNING] hooks/check-update.js:44,77
- **Check**: A — outbound network call
- **Issue**: The hook makes an HTTPS GET to `raw.githubusercontent.com` on every `SessionStart` event when the 24-hour throttle has expired. The URL is read from `plugin.json → updateUrl` (user-controlled file) with a hardcoded fallback to the official repo. The request fetches a remote `plugin.json` to compare version strings.
- **Excerpt**: `const FALLBACK_UPDATE_URL = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';` / `https.get(remoteUrl, { timeout: 5000 }, ...)`
- **Recommendation**: Justified by the plugin's stated update-check function. The destination is the official Entelligentsia/forge GitHub repo. The response is only ever parsed for a `.version` string — no code is executed. The 24-hour throttle prevents excessive calls. Accepted; no action required.

#### [WARNING] hooks/validate-write.js:173–175
- **Check**: A — bypass via environment variable
- **Issue**: Setting `FORGE_SKIP_WRITE_VALIDATION=1` disables the write-boundary hook entirely for that turn. Any process that can set environment variables in the Claude Code session can silently bypass schema enforcement.
- **Excerpt**: `if (process.env.FORGE_SKIP_WRITE_VALIDATION === '1') { writeBypassAudit(...); process.exit(0); }`
- **Recommendation**: Intentional emergency escape hatch, documented in CHANGELOG and CLAUDE.md. Bypass events are audited to the sprint's progress.log. The accepted risk is correct and proportionate — a broken validator must not block legitimate work. Accepted.

#### [WARNING] commands/update.md:183
- **Check**: B — reference to /tmp path in documentation
- **Issue**: The update command documents a legacy fallback that reads from `/tmp/forge-plugin-data/update-check-cache.json`. This is informational — the command reads from this location only when the project-scoped cache is absent (one-time migration), not a persistent write.
- **Excerpt**: `` > or `/tmp/forge-plugin-data/update-check-cache.json`), read 'migratedFrom' from ``
- **Recommendation**: This is a documented migration path, not a persistence mechanism. The read is conditional on a missing project-level cache file. No security impact. Informational only.

#### [INFO] hooks/hooks.json — PostToolUse hook on Bash
- **Check**: C — hook registered on Bash
- **Issue**: The `triage-error.js` hook fires after every Bash command. It reads stdin (the tool event JSON), checks if the command matches Forge patterns, and if so writes a context message prompting the user to file a bug. It does not block, modify, or exfiltrate anything.
- **Recommendation**: Behaviour is consistent with the hook's stated purpose. The Forge-pattern filter prevents the hook from firing on unrelated Bash calls. No action required.

#### [INFO] hooks/check-update.js — writes to .forge/config.json
- **Check**: A — file write in hook
- **Issue**: The hook writes `paths.forgeRoot` back to `.forge/config.json` if it has drifted from the active plugin root. This is a sync operation for when the plugin distribution changes.
- **Recommendation**: Write is conditional, targeted to a single field, and explicitly documented in comments. Non-critical path for distribution management. No action required.

#### [INFO] hooks/validate-write.js — reads arbitrary file paths passed via tool input
- **Check**: A — file reads driven by tool input
- **Issue**: `computePostEditContents()` reads the existing file at `toolInput.file_path` to simulate Edit/MultiEdit pre-write validation. The path comes from Claude Code's own tool input — not from user-supplied text.
- **Recommendation**: The path originates from Claude Code's tool dispatch, not from untrusted external input. The read is used solely to compute post-edit contents for validation. No action required.

#### [INFO] commands/health.md — hardcoded SHA-256 hash
- **Check**: B — long hex string in markdown
- **Issue**: Line 173 contains a 64-character hex string (`EXPECTED="3ec3c970..."`) used as a tamper-evident check for `verify-integrity.cjs`. This is a legitimate integrity anchor.
- **Recommendation**: This is the designed integrity mechanism documented in CLAUDE.md. The hex string is a SHA-256 hash, not a base64 blob. No security concern.

### Clean Areas

- `forge/meta/` (personas, skills, workflows, templates, store-schema, tool-specs) — no prompt injection, no exfiltration instructions, no hidden sections, no persona-hijacking language, no safety bypasses
- `forge/commands/` (all 18 command files) — descriptions match bodies, no mismatched `allowed-tools`, no manipulation of `settings.json`
- `forge/tools/` (all 21 CJS tools) — no network calls, no eval, no credential reads, no shell init writes, no persistence mechanisms
- `forge/schemas/` — pure JSON Schema, no executable content
- `forge/init/` — workflow generation instructions, no injection vectors
- `forge/agents/tomoshibi.md` — strict guardrails table; explicitly forbids writing to store, running init/migrate/remove; no bypass language
- `forge/skills/refresh-kb-links/SKILL.md` — read-mostly, writes only managed sections to agent instruction files with explicit user confirmation
- `forge/vision/` — conceptual documentation only, no instructions
- `forge/sdlc-config.schema.json` — pure schema definition
- `forge/integrity.json` — hash manifest with 21 entries matching current version 0.20.0
- No binary files, compiled artifacts, or executables found
- No zero-width Unicode characters detected across all 167 files
- No base64-encoded blobs in markdown files
- No prompt injection patterns detected
- No credential or secret reads
- No shell init file writes
- No software installation commands
- No persistence mechanisms (cron, systemctl, launchctl)

### Verdict

**SAFE TO USE**

The plugin makes exactly one outbound network call (version-check to the official GitHub repo, throttled to once per 24 hours) and implements three hooks with well-scoped, clearly-documented behaviour. No critical findings. The three warnings are all accepted and carry no security risk — one is a justified version-check call to a known endpoint, one is a documented emergency bypass with audit logging, and one is a read-only reference to a /tmp path in migration documentation.
