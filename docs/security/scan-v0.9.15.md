## Security Scan — forge:forge — 2026-04-16

**SHA**: not recorded (source-path scan) | **Installed**: N/A | **Last updated**: N/A
**Scope**: source-path | **Install path**: /home/boni/src/forge/forge/

### Summary
114 files scanned | 0 critical | 1 warning (accepted, carry-forward) | 2 info

### Delta from v0.9.14

Changed files reviewed:

| File | Change | Assessment |
|------|--------|------------|
| `forge/tools/store-cli.cjs` | Added `__dirname/../schemas/` as 3rd schema resolution fallback | Safe — `__dirname` resolves to `$FORGE_ROOT/tools/`, so `../schemas/` is `$FORGE_ROOT/schemas/`. No path traversal risk. |
| `forge/tools/validate-store.cjs` | Same schema fallback addition | Safe — identical pattern to store-cli.cjs |
| `forge/commands/update.md` | Added Step 3.1 to re-derive `FORGE_ROOT` after plugin update | Safe — re-reads `CLAUDE_PLUGIN_ROOT` env var, no network calls |
| `forge/init/generation/generate-tools.md` | Added Step 2 to copy schemas during init | Safe — `cp` from `$FORGE_ROOT/schemas/` to `.forge/schemas/` |
| `forge/meta/workflows/meta-orchestrate.md` | Removed hardcoded model names; added cluster detection from env vars; dispatch based on cluster type | Safe — reads standard env vars, no network calls, no credential access |
| `forge/migrations.json` | Added 0.9.14→0.9.15 migration entry | Safe — data only |
| `forge/.claude-plugin/plugin.json` | Version bump to 0.9.15 | Safe — data only |
| `forge/schemas/structure-manifest.json` | Hash update | Safe — auto-generated |

### Findings

#### [WARNING] forge/hooks/check-update.js:77 (carry-forward)
- **Check**: A — Hook Scripts
- **Issue**: Outbound HTTPS network call to `raw.githubusercontent.com` for version checking.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Accepted — documented update-check mechanism. No change from v0.9.14.

#### [INFO] forge/hooks/check-update.js:24 (carry-forward)
- **Check**: A — Hook Scripts
- **Issue**: Writes cache files to `os.tmpdir()` for version-check throttling.
- **Recommendation**: Safe to ignore — no sensitive data.

#### [INFO] forge/commands/update.md:941 lines (carry-forward, grew from 925)
- **Check**: B — Skill/Command/Context Files
- **Issue**: Longest Markdown file in the plugin. Grew by 16 lines due to FORGE_ROOT re-derivation step.
- **Recommendation**: Safe to ignore — legitimate update/migration process instructions.

### Clean Areas
- forge/tools/store-cli.cjs — schema fallback addition is safe, no exfiltration or credential access
- forge/tools/validate-store.cjs — same pattern, safe
- forge/init/generation/generate-tools.md — standard file copy instructions, safe
- forge/meta/workflows/meta-orchestrate.md — env var reads for model resolution, no network calls, safe
- All other files — unchanged from v0.9.14 scan

### Verdict

**SAFE TO USE**

No new security concerns. All changes are bug fixes: adding schema resolution fallback paths (using `__dirname` for safe path resolution), re-deriving plugin root after updates, copying schemas during init, and replacing hardcoded model names with environment variable detection.