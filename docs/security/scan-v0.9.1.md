## Security Scan — forge:forge — 2026-04-15

**SHA**: b292241 | **Scope**: local + user | **Install path**: `/home/boni/src/forge/forge/`
**Source scanned**: `/home/boni/src/forge/forge/` (in-tree source, not cache)

### Summary
106 files scanned | 0 critical | 2 warnings | 14 info

### Findings

#### WARNING forge/hooks/check-update.js:44,77-84
- **Check**: A — Hook Scripts
- **Issue**: SessionStart hook makes HTTPS GET to `raw.githubusercontent.com/Entelligentsia/forge` for update checks. Sends no data; 5-second timeout; only reads version number. Hardcoded fallback URL.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Acceptable for update mechanism. Low risk — compromised repo could only manipulate version notification, not execute code.

#### WARNING forge/commands/remove.md:101-128
- **Check**: B — Skill/Command/Context Files
- **Issue**: `/forge:remove` command contains `rm -rf .forge/` and `rm -rf engineering/` instructions. Multi-step confirmation guards exist (inventory, choice, explicit "delete engineering" typing, final confirm).
- **Excerpt**: `rm -rf .forge/`
- **Recommendation**: Acceptable with existing guards. Paths are hardcoded and specific; no path traversal possible.

#### INFO forge/hooks/check-update.js:23-24, forge/hooks/list-skills.js:27-32
- **Check**: A — Environment Variable Reads
- **Issue**: Reads standard Claude Code plugin env vars (`CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, `CLAUDE_PLUGIN_DATA_ROOT`, `CLAUDE_SKILLS_DIR`). No credential or secret env vars accessed.
- **Recommendation**: No action needed. Expected plugin behavior.

#### INFO forge/hooks/check-update.js:54,130,153-156,177-179
- **Check**: A — File Write Operations
- **Issue**: Writes to `.forge/config.json` and `.forge/update-check-cache.json` — all project-local.
- **Recommendation**: No action needed.

#### INFO forge/hooks/check-update.js:16, forge/hooks/triage-error.js:33, forge/hooks/list-skills.js:21
- **Check**: A — Error Suppression
- **Issue**: `process.on('uncaughtException', () => process.exit(0))` — intentional design to prevent hook failures from blocking user sessions.
- **Recommendation**: No action needed. Documented best practice.

#### INFO forge/hooks/triage-error.js
- **Check**: A — PostToolUse Context Injection
- **Issue**: Injects error-triage context after failed Forge commands. Purely informational; no data exfiltrated.
- **Recommendation**: No action needed.

#### INFO forge/commands/*.md — Backtick Syntax
- **Check**: B — Command Dynamic Values
- **Issue**: Multiple commands use `` !`echo "${CLAUDE_PLUGIN_ROOT}"` `` for dynamic value injection. Standard Claude Code plugin mechanism.
- **Recommendation**: No action needed.

#### INFO forge/commands/report-bug.md:175-176
- **Check**: B — GitHub Issue Filing
- **Issue**: Uses `gh issue create` to file bugs to Entelligentsia/forge. User confirmation required.
- **Recommendation**: No action needed.

#### INFO forge/.claude-plugin/plugin.json
- **Check**: C — Permissions
- **Issue**: No `allowedTools`, `permissions`, or elevated access fields. Plugin relies solely on declared hooks.
- **Recommendation**: No action needed.

#### INFO forge/hooks/hooks.json
- **Check**: C — Hook Configuration
- **Issue**: SessionStart (10s timeout) and PostToolUse/Bash (5s timeout). Both within reasonable limits.
- **Recommendation**: No action needed.

#### INFO All files — No Binary/Compiled Code
- **Check**: D — Structural
- **Issue**: All files are text-based (JS, JSON, Markdown). No binaries, `.pyc`, `.so`, `.dll`, `.exe` found.
- **Recommendation**: No action needed.

#### INFO All tools — No npm Dependencies
- **Check**: D — Structural
- **Issue**: All `.cjs` tools use only Node.js built-ins (`fs`, `path`, `os`, `crypto`, `https`).
- **Recommendation**: No action needed.

#### INFO forge/tools/store.cjs:266-270 — Path Traversal Guard
- **Check**: D — Structural
- **Issue**: `purgeEvents` includes explicit path traversal guard preventing directory escape.
- **Recommendation**: No action needed. Good security practice.

### Clean Areas
- No prompt injection, persona hijacking, or hidden instructions in any markdown file
- No `eval()`, `Function()`, `child_process`, or dynamic code execution
- No credential/secret reading or exfiltration
- No base64 blobs, obfuscation, or encoded content
- No unrestricted Bash/Write access in plugin.json
- No binary files or compiled code

### Verdict

**SAFE TO USE**

0 critical issues. 2 warnings are expected behaviors (update check network call with documented fallback, destructive remove command with multi-step confirmation). All hook scripts follow error-suppression best practices. No data exfiltration, credential access, or privilege escalation vectors found.