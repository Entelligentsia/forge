## Security Scan — forge — 2026-04-12

**SHA**: 2c0859d | **Installed**: 2026-04-12 | **Last updated**: 2026-04-12
**Scope**: forge | **Install path**: /home/boni/src/forge/forge

### Summary
94 files scanned | 0 critical | 3 warnings | 0 info

### Findings

#### WARNING forge/.claude-plugin/plugin.json:12
- **Check**: C
- **Issue**: Outbound updateUrl configured to raw.githubusercontent.com
- **Excerpt**: "updateUrl": "https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json"
- **Recommendation**: Safe to ignore; this is the official distribution mechanism for Forge updates.

#### WARNING forge/.claude-plugin/plugin.json:13
- **Check**: C
- **Issue**: Outbound migrationsUrl configured to raw.githubusercontent.com
- **Excerpt**: "migrationsUrl": "https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/migrations.json"
- **Recommendation**: Safe to ignore; this is the official distribution mechanism for Forge migrations.

#### WARNING forge/hooks/check-update.js:42
- **Check**: A
- **Issue**: Network call to GitHub API for update checking
- **Excerpt**: await fetch(updateUrl)
- **Recommendation**: Safe to ignore; essential for the plugin's update-check functionality.

### Clean Areas
- forge/tools/ — no issues detected
- forge/commands/ — no issues detected
- forge/hooks/ — no issues detected (except justified update checks)
- forge/meta/ — no issues detected

### Verdict

**SAFE TO USE**

The plugin follows standard distribution patterns. All network calls are justified for update checks and point to official repositories.


