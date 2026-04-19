## Security Scan — forge:forge — 2026-04-13

**SHA**: not recorded | **Installed**: not recorded | **Last updated**: not recorded
**Scope**: internal | **Install path**: /home/boni/src/forge/forge/

### Summary
128 files scanned | 0 critical | 3 warnings | 0 info

### Findings

#### WARNING forge/hooks/check-update.js:12
- **Check**: A — Hook Scripts
- **Issue**: Outbound network call to GitHub raw content for update checks.
- **Excerpt**: `const updateUrl = pluginJson.updateUrl;`
- **Recommendation**: Safe to ignore; this is the primary mechanism for Forge's distribution-aware update system.

#### WARNING forge/hooks/check-update.js:15
- **Check**: A — Hook Scripts
- **Issue**: Outbound network call to GitHub raw content for migrations check.
- **Excerpt**: `const migrationsUrl = pluginJson.migrationsUrl;`
- **Recommendation**: Safe to ignore; required for retrieving the migration chain.

#### WARNING forge/tools/validate-store.cjs:45
- **Check**: C — Permissions
- **Issue**: Tool performs extensive filesystem writes when `--fix` is passed.
- **Excerpt**: `await fs.writeFile(path, JSON.stringify(data, null, 2));`
- **Recommendation**: Safe to ignore; this is the intended behavior of the store repair utility.

### Clean Areas
- forge/meta/ — no issues detected
- forge/commands/ — no issues detected
- forge/schemas/ — no issues detected
- forge/vision/ — no issues detected

### Verdict

**SAFE TO USE**

The plugin follows a strict containment model. All network activity is limited to official update channels, and filesystem operations are scoped to the project's `.forge/` and `engineering/` directories.
