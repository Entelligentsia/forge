# Security Scan — forge:forge — v0.5.5 — 2026-04-07

**SHA**: f8515c7 (base; v0.5.5 unreleased at scan time) | **Scanned**: 2026-04-07
**Scope**: user | **Source path**: `forge/` (repo source, not installed cache)

## Summary

89 files scanned | **0 critical** | **3 warnings** | **4 info**

## Findings

### [WARNING] hooks/check-update.sh:12 + hooks/check-update.js:21
- **Check**: A — temp file write
- **Issue**: Cache file written to `/tmp/forge-plugin-data/` (shell) or `os.tmpdir()/forge-plugin-data/` (JS). Shared temp location flagged per Check A.
- **Resolution**: Safe. Directory is namespaced, contains only `{"lastCheck":…,"remoteVersion":…}`, and respects `CLAUDE_PLUGIN_DATA` env override.

### [WARNING] hooks/check-update.sh:44,55 + hooks/check-update.js:49
- **Check**: A — outbound network call
- **Issue**: HTTPS GET to `raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` once per 24 hours.
- **Resolution**: Justified. Version-check only — no data sent, no credential exposure, 5-second timeout. Expected plugin behaviour.

### [WARNING] commands/update.md
- **Check**: B — file length (608 lines, threshold 500)
- **Resolution**: Reviewed in full. All content is legitimate `/forge:update` workflow instructions. No hidden content.

## Clean Areas

- All hook scripts: no credential access, no eval, no software installation, no persistence mechanisms
- All tools (`*.cjs`): operate on project-local files only; no network calls
- All command/meta markdown: no prompt injection, no persona hijacking, no hidden Unicode, no base64 blobs; descriptions match body content accurately
- `plugin.json`: metadata only; no permissions or `allowed-tools` fields
- JSON schemas: schema definitions only, no executable content
- No binary or compiled files
- Plugin size: 628 KB (well under 5 MB threshold)

## Verdict

**SAFE TO USE** — 0 critical findings. The three warnings are the intentional version-check mechanism and a long-but-clean command file. No exfiltration paths, no privilege escalation, no prompt injection detected.
