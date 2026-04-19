# Security Scan — forge:forge — 2026-04-16

**SHA**: not recorded (source scan) | **Installed**: N/A | **Last updated**: N/A
**Scope**: source-path `forge/` | **Install path**: `/home/boni/src/forge/forge/`

### Summary
114 files scanned | 0 critical | 1 warning (accepted, carry-forward) | 2 info

### Findings

#### [WARNING] forge/hooks/check-update.js:76
- **Check**: A — Hook Scripts
- **Issue**: Network call via `https.get()` to fetch remote version from `updateUrl` (raw.githubusercontent.com). This is the version-check endpoint, which is the plugin's declared update mechanism. No data is exfiltrated — the response is parsed for version comparison only.
- **Excerpt**: `function fetchRemoteVersion(cb) { ... https.get(remoteUrl, (res) => { ... }); }`
- **Recommendation**: Accepted (carry-forward). The URL is read from `plugin.json`'s `updateUrl` field, not hardcoded. The hook only reads the version string from the response — no credential or data exfiltration.

#### [INFO] forge/tools/store-cli.cjs:1-770
- **Check**: A — Hook Scripts
- **Issue**: `store-cli.cjs` writes to `.forge/store/events/` (progress log, event sidecars, entity records). All write paths are within the project's `.forge/` directory. No path traversal — paths are constructed from validated entity IDs and sprint/bug IDs.
- **Recommendation**: No action needed.

#### [INFO] forge/tools/banners.cjs:1-273
- **Check**: A — Hook Scripts
- **Issue**: `banners.cjs` reads and renders from a static in-memory `BANNERS` registry. No file I/O beyond `console.log`. No security surface.
- **Recommendation**: No action needed.

### Clean Areas
- `forge/commands/` — 13 command files, no security issues
- `forge/meta/` — 37 meta-definition files (workflows, personas, skills, templates), no prompt injection
- `forge/schemas/` — 5 JSON schema files, no security issues
- `forge/init/` — 11 generation/discovery instructions, no security issues
- `forge/.claude-plugin/plugin.json` — No `allowed-tools`, no unrestricted Bash/Write permissions

### Verdict

**SAFE TO USE**

No critical findings. The only warning is the carry-forward version-check network call in `check-update.js`, which is the plugin's declared update mechanism and reads only version metadata from `raw.githubusercontent.com`. The new `progress` and `progress-clear` commands in `store-cli.cjs` write to `.forge/store/events/` with validated inputs and no path traversal surface.