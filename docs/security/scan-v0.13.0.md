## Security Scan — forge:forge — 2026-04-18

**SHA**: dae5edb77d94a3b53a98a26b6bb8c9f5d5cb4cd0 (user-scope install) | **Installed**: 2026-04-18T08:11:20.012Z | **Last updated**: 2026-04-18T08:16:36.970Z
**Scope**: local + user | **Install path**: /home/boni/.claude/plugins/cache/forge/forge/0.12.6
**Source scanned**: /home/boni/src/forge/forge/ (v0.13.0 source — authoritative)

### Summary
147 files scanned | 0 critical | 0 warnings | 3 info

### Findings

#### [INFO] hooks/check-update.js:44,77
- **Check**: A — Hook Scripts (outbound network call)
- **Issue**: `https.get()` call on `SessionStart`. The URL is read from `plugin.json`'s `updateUrl` field at runtime, with a hardcoded fallback to `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`. The call is protected by a 5-second timeout and the hook exits 0 on all failures (no data exfiltration risk). The call is justified — it is the version-check that powers the `/forge:update` notification.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Safe. Destination is `raw.githubusercontent.com` (official release API). No user data is sent.

#### [INFO] commands/health.md:138
- **Check**: B — long string that resembles base64
- **Issue**: A 64-character hex string (`EXPECTED="3ec3c970..."`) embedded in the command. This is the SHA-256 hash of `verify-integrity.cjs` used for tamper-evident integrity checking — not a blob or encoded payload.
- **Excerpt**: `EXPECTED="3ec3c970dd3d7c3001f8f373bcc40556803eadd2fc2afafb14f1c232cba4cc3f"`
- **Recommendation**: Safe. Expected design pattern; regenerated at each version bump via `gen-integrity.cjs`.

#### [INFO] meta/personas/meta-architect.md:45
- **Check**: B — pattern match on "act as"
- **Issue**: Line contains "The project's deployment topology for impact assessment" — keyword match on "act" inside "impact". Not a persona hijacking instruction.
- **Excerpt**: `- The project's deployment topology for impact assessment`
- **Recommendation**: False positive. No action required.

### Clean Areas
- `hooks/triage-error.js` — no network calls, no credential reads, reads stdin only
- `hooks/hooks.json` — two hooks (SessionStart, PostToolUse/Bash); timeouts 10000ms and 5000ms; no unrestricted shell or write access
- `commands/` — all 15 command files: no injection patterns, no hidden unicode, no exfiltration instructions; `description:` and `effort:` frontmatter only
- `agents/` — both agent files: no injection patterns, no credential reads
- `tools/*.cjs` — all CJS scripts: no eval, no shell init writes, no sudo, no persistence mechanisms; all writes scoped to `.forge/` project directory
- `meta/` — 60+ workflow, persona, skill, template, and schema files: no injection patterns, no hidden unicode, no base64 blobs
- `init/` — all generation rulebook files: no injection patterns
- `schemas/` — JSON schemas only; no executable content
- `integrity.json` — version 0.13.0, 20 files hashed; consistent with source

### Verdict

**SAFE TO USE**

v0.13.0 introduces namespaced command generation and description frontmatter — purely structural changes to markdown generation rulebooks and command files. No new network calls, no new permissions, no new executable code. All three findings are informational; the outbound network call in the SessionStart hook is a standard version-check to a known GitHub raw endpoint with no user data transmitted.
