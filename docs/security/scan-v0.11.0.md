## Security Scan — forge:forge — 2026-04-16

**SHA**: canary/source install (not recorded) | **Installed**: 2026-04-09T18:02:54.923Z | **Last updated**: 2026-04-16
**Scope**: local (source path: /home/boni/src/forge/forge/) | **Install path**: /home/boni/src/forge/forge/

### Summary

130 files scanned | 0 critical | 2 warnings (carry-forward, accepted) | 4 info

---

### Findings

#### [WARNING] hooks/check-update.js:44,77
- **Check**: A — Hook Scripts / outbound network call
- **Issue**: `https.get()` fetches `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` on `SessionStart`. URL is read from installed `plugin.json` `updateUrl` field; hardcoded GitHub raw fallback for resilience. Destination is a known Entelligentsia release endpoint. Call is throttled to once per 24 hours via a local cache file. No user data is included in the request.
- **Excerpt**: `const FALLBACK_UPDATE_URL = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';`
- **Recommendation**: Safe — outbound is version-check only, to a documented official endpoint, rate-limited, data-free. No action required. Carry-forward from v0.10.0.

#### [WARNING] hooks/check-update.js:24,54
- **Check**: A — Hook Scripts / writes to temp location
- **Issue**: Plugin-level throttle cache written to `os.tmpdir()/forge-plugin-data/update-check-cache.json`. Content is `{ lastCheck, remoteVersion }` — no sensitive data. Shared across projects to avoid duplicate per-project cache files.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Safe — data written is non-sensitive version metadata. `CLAUDE_PLUGIN_DATA` env var allows path override. No action required. Carry-forward from v0.10.0.

---

### New files in this release

#### [INFO] tools/build-init-context.cjs (new)
- **Check**: A — Hook Scripts / tool script
- **Issue**: New deterministic tool. Reviewed for network calls, credential reads, unsafe writes, eval, and obfuscation.
- **Findings**: No network calls. Requires only `fs` and `path` (Node built-ins). Writes only to `--out` and `--json-out` paths supplied by the caller (the init orchestrator), which resolves to `.forge/init-context.md` and `.forge/init-context.json` — project-local paths. No sensitive data is read or written. No eval. No /tmp writes. No credential-adjacent path access.
- **Recommendation**: Clean. No action required.

#### [INFO] tools/__tests__/build-init-context.test.cjs (new)
- **Check**: D — Structural / test file
- **Issue**: Test file. Uses `os.tmpdir()` for fixture directories, cleaned up in `afterEach`.
- **Findings**: No network, no credential access, no persistent side effects.
- **Recommendation**: Clean. No action required.

#### [INFO] init/workflow-gen-plan.json (new)
- **Check**: B — Context / data file
- **Issue**: Static JSON data file — 16 entries of `{id, meta, persona}` strings. Reviewed for injection payloads embedded in string values.
- **Findings**: All values are plain identifiers (filenames, role names). No executable content, no URLs, no instructions. JSON data clean.
- **Recommendation**: Clean. No action required.

#### [INFO] init/generation/generate-workflows.md (rewritten)
- **Check**: B — Skill / per-subagent rulebook
- **Issue**: Previously multi-file orchestration instructions; rewritten as single-subagent rulebook. Reviewed for prompt injection, exfiltration instructions, permission escalation, and hidden content.
- **Findings**: No injection patterns. No credential reads. No external network instructions. No `allowed-tools` manipulation. The manifest-record command (`node ... generation-manifest.cjs record ...`) is project-local only. File ends cleanly with the status-line instruction; no content after the final section.
- **Recommendation**: Clean. No action required.

---

### Clean Areas
- `hooks/triage-error.js` — unchanged; reads stdin, writes `additionalContext` to stdout only
- `hooks/hooks.json` — unchanged; two hooks, timeouts 10000ms / 5000ms, no unrestricted permissions
- `commands/` (all 14 files) — no injection patterns, no exfiltration instructions
- `init/sdlc-init.md` — Phase 7 rewritten; reviewed for injection and exfiltration; clean. The `plugin install` references in Phase 2 are standard marketplace install commands, not permission escalation.
- `commands/init.md` — one-line description change only; no security impact
- `meta/workflows/` (all 17 files incl. meta-quiz-agent.md) — no injection patterns
- `meta/personas/`, `meta/skills/`, `meta/templates/`, `meta/tool-specs/` — unchanged
- `tools/*.cjs` (all other tools) — unchanged; Node built-ins only
- `schemas/`, `vision/` — documentation/data only
- No binary files, no compiled artifacts, no misleading extensions, no invisible unicode, no base64 blobs
- Plugin size: 1.1 MB, 130 files — proportionate to functionality

---

### Verdict

**SAFE TO USE**

No critical findings. The two carry-forward warnings (outbound version check, /tmp cache write) are intentional, bounded, and data-free — accepted in all prior scans. All three new files (`build-init-context.cjs`, `workflow-gen-plan.json`, `build-init-context.test.cjs`) are clean. The rewritten `generate-workflows.md` contains no injection or exfiltration patterns.
