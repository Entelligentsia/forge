## Security Scan — forge@forge — 2026-04-14

**SHA**: not recorded (source-path scan) | **Installed**: N/A | **Last updated**: N/A
**Scope**: source | **Install path**: forge/ (source tree)

### Summary
95 files scanned | 0 critical | 0 warnings | 1 info

### Findings

#### [INFO] forge/tools/seed-store.cjs:21
- **Check**: B — Skill/Command/Context Files (unused utility function)
- **Issue**: `deriveSlug()` function is defined but not called within the file. It is a declared API for use by other tools (e.g., sprint-intake) that create directories. Not a security concern — purely informational.
- **Excerpt**: `function deriveSlug(title) { return title.toLowerCase()...`
- **Recommendation**: Safe to ignore. Function is intentionally kept as a defined utility per task acceptance criteria.

### Clean Areas
- forge/hooks/check-update.js — no issues: uses only Node.js built-ins (fs, path, os, https); HTTPS call only to `raw.githubusercontent.com` (update check); proper `process.on('uncaughtException')` hook discipline; no credential access
- forge/hooks/triage-error.js — no issues: reads stdin only; no network calls; no credential access; proper hook exit discipline
- forge/hooks/list-skills.js — no issues: reads only `installed_plugins.json` and `~/.claude/skills/`; no network calls; no credential access
- forge/hooks/hooks.json — no issues: all hooks use `node` commands with plugin-relative paths; timeouts are reasonable (5s, 10s)
- forge/tools/store.cjs — no issues: pure filesystem CRUD; no network calls; reads paths from `.forge/config.json`
- forge/tools/seed-store.cjs — no issues: reads local filesystem only; no network calls; `prefix` is escaped before regex construction; `--dry-run` flag respected; paths from config; top-level try/catch with `process.exit(1)`
- forge/tools/validate-store.cjs — no issues (reviewed in prior scans)
- forge/tools/collate.cjs — no issues (reviewed in prior scans)
- forge/tools/manage-config.cjs — no issues (reviewed in prior scans)
- forge/tools/estimate-usage.cjs — no issues (reviewed in prior scans)
- forge/schemas/*.schema.json — all schemas preserve `additionalProperties: false`
- forge/.claude-plugin/plugin.json — no `allowed-tools` fields; no permissions beyond standard plugin operations
- forge/commands/*.md — no prompt injection patterns; no "ignore previous" / "disregard" / "jailbreak" phrases; no zero-width Unicode
- forge/meta/**/*.md — no prompt injection patterns
- No binary files, no compiled artifacts, no `.pyc`/`.class`/`.so`/`.dll`/`.exe` files found

### Verdict

**SAFE TO USE**

No security issues found. The only modified file (`seed-store.cjs`) reads local filesystem directories and writes JSON files via the Store facade. No network calls, no credential access, no untrusted-input injection paths. The regex construction from `prefix` is properly escaped.