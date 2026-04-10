## Security Scan — forge:forge (source v0.6.11) — 2026-04-10

**SHA**: `3731a15` (main HEAD at scan time) | **Installed**: n/a (pre-release source scan) | **Last updated**: 2026-04-10
**Scope**: source | **Install path**: `/home/boni/src/forge/forge/`

> Note: Only one file changed in 0.6.11 relative to 0.6.10 (`commands/update.md`). All other files carry
> forward the clean findings from [scan-v0.6.10.md](scan-v0.6.10.md). This report covers the delta only,
> plus a full summary for completeness.

### Summary
91 files scanned | 0 critical | 3 warnings | 0 info

### Findings

#### [WARNING] hooks/hooks.json — Check C
- **Check**: C — Hooks registered on multiple event types simultaneously
- **Issue**: `SessionStart` and `PostToolUse` hooks registered simultaneously.
- **Excerpt**: `"SessionStart": [...], "PostToolUse": [{"matcher": "Bash", ...}]`
- **Recommendation**: Safe — unchanged from 0.6.10. Both hooks are purpose-scoped, within timeout limits, and touch no credentials or untrusted input.

#### [WARNING] hooks/check-update.js:77 — Check A
- **Check**: A — Outbound network call
- **Issue**: `https.get(remoteUrl, ...)` to URL read from `plugin.json → updateUrl`.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => { ... })`
- **Recommendation**: Safe — unchanged from 0.6.10. Reads from plugin's own manifest; response parsed for version string only; 5s timeout enforced.

#### [WARNING] commands/update.md — Check B
- **Check**: B — File is 762 lines (> 500 threshold)
- **Issue**: 11 lines longer than 0.6.10 due to expanded URL resolution section.
- **Excerpt**: `UPDATE_URL = plugin.json → updateUrl, fallback: https://raw.githubusercontent.com/Entelligentsia/forge/main/...`
- **Recommendation**: Safe — full content reviewed. Added lines replace a hardcoded per-distribution URL table with a "read from plugin.json" instruction. Fallback URLs are to `raw.githubusercontent.com/Entelligentsia/forge` only. No hidden instructions, no injection phrases, clean terminal section.

### Delta from 0.6.10

#### commands/update.md — Step 1 URL resolution (IMPROVED)
- **Change**: Removed hardcoded `https://raw.githubusercontent.com/Entelligentsia/skillforge/main/forge/forge/.claude-plugin/plugin.json` for skillforge distribution. Both distributions now read `updateUrl` and `migrationsUrl` from the installed `plugin.json`, with `raw.githubusercontent.com/Entelligentsia/forge` fallbacks.
- **Security impact**: Positive — attack surface reduced. No new external URLs introduced.

### Clean Areas
- All 90 other files — unchanged from 0.6.10 scan. See [scan-v0.6.10.md](scan-v0.6.10.md) for full findings.
- Zero-width Unicode — none found
- Base64 blobs — none found
- Binary/compiled artifacts — none
- Plugin size — 684KB

### Verdict

**SAFE TO USE**

Single-change release removing a hardcoded distribution URL from `update.md`. The change reduces attack surface by eliminating a stale external URL reference. All three warnings carry over unchanged from 0.6.10 and are all justified design decisions.
