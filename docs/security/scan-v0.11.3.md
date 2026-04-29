## Security Scan — forge@forge — 2026-04-16

**SHA**: `3aae08d58786525be13a68ca1de14d5412e187e3` (user-scope cache, v0.11.2 base; source scanned at v0.11.3 pending push) | **Installed**: 2026-04-13T15:24:09.164Z | **Last updated**: 2026-04-16T15:07:51.697Z
**Scope**: user + local (forge project) | **Install path**: `/home/boni/.claude/plugins/cache/forge/forge/0.11.0` (source scanned: `/home/boni/src/forge/forge/`)

### Summary
134 files scanned | 0 critical | 1 warning | 1 info

### Findings

#### [WARNING] hooks/check-update.js:24
- **Check**: A — Hook script writes to shared temp location
- **Issue**: Cache directory defaults to `os.tmpdir()/forge-plugin-data` when `CLAUDE_PLUGIN_DATA` env var is absent. Writes non-sensitive throttle state (last-check timestamp, remote version string) to `/tmp`.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Low risk — data is non-sensitive. Accepted carry-forward from v0.9.14.

#### [INFO] hooks/check-update.js:77
- **Check**: A — Outbound network call
- **Issue**: `https.get` to URL derived from installed `plugin.json`'s `updateUrl` field. Fallback: `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => {`
- **Recommendation**: Justified — documented version-check mechanism, rate-limited to once per 24 hours, targets `raw.githubusercontent.com` version-check endpoint, no user data transmitted.

### Clean Areas
- `init/generation/generate-persona.md` — new file; no injection phrases, no permission escalation, no credential access
- `init/generation/generate-skill.md` — new file; clean
- `init/generation/generate-template.md` — new file; clean
- `init/generation/generate-kb-doc.md` — new file; `{placeholder}` reference is a self-check instruction (not an injection vector)
- `init/sdlc-init.md` — revised phases 3–9; no injection phrases, no permission escalation
- `commands/regenerate.md` — revised categories; no injection phrases
- All hooks, tools, schemas, meta/ — unchanged from v0.11.2, all clean
- No binary or compiled files; no invisible Unicode (U+200B/FEFF/200C/200D/00AD); 1.1 MB total

### Verdict

**SAFE TO USE**

No new findings introduced by v0.11.3. Four new per-subagent rulebook files and two revised orchestration files contain only workflow generation instructions with no injection patterns, credential access, or permission escalation.
