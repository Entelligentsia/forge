# Security Scan — forge:forge v0.6.2

**Date**: 2026-04-09
**SHA**: not recorded (source install)
**Scope**: source (`/home/boni/src/forge/forge/`)
**Scanner**: `/security-watchdog:scan-plugin`

---

## Summary

91 files scanned | 660K total | **0 critical** | **3 warnings** | **2 info**

---

## Findings

### [WARNING] hooks/check-update.sh:44,55 — outbound network call

- **Check**: A — Hook Scripts, outbound network call
- **Issue**: `curl` fetches `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` for version comparison. Flagged per policy for any outbound call in a hook.
- **Excerpt**: `REMOTE_VERSION=$(curl -sf --max-time 5 "$REMOTE_URL" 2>/dev/null | jq -r '.version // ""' 2>/dev/null || echo "")`
- **Recommendation**: Safe. Destination is the plugin's own official GitHub release manifest. Timeout is 5s; failure degrades gracefully to empty string. No fetched content is executed. Equivalent logic in `check-update.js` uses `https.get` to the same URL. Both hooks are reference implementations — `check-update.js` is the active registered hook.

### [WARNING] hooks/check-update.sh:12 — writes to /tmp

- **Check**: A — Hook Scripts, shared temp writes
- **Issue**: Cache file written to `$CLAUDE_PLUGIN_DATA/forge-plugin-data/update-check-cache.json`, falling back to `/tmp/forge-plugin-data/update-check-cache.json`.
- **Excerpt**: `DATA_DIR="${CLAUDE_PLUGIN_DATA:-/tmp/forge-plugin-data}"`
- **Recommendation**: Safe. Cache content is non-sensitive version metadata only (`lastCheck`, `remoteVersion`, `localVersion`, `migratedFrom`). User-configurable via env var. Same pattern used in `check-update.js` (active hook).

### [WARNING] commands/update.md — file length 702 lines

- **Check**: B — Skill/Command file, length > 500 lines
- **Issue**: `update.md` exceeds the 500-line review threshold. Long files risk burying instructions where reviewers miss them.
- **Recommendation**: No malicious content on full read. Length is justified: 6-step migration orchestration, granular sub-target aggregation logic, pipeline audit sub-steps 5a–5f, argument table, error handler. No hidden instructions after any `---` markers; all sections labelled. Safe to use.

### [INFO] hooks/hooks.json — PostToolUse on broad Bash matcher

- **Check**: C — Permissions, hook registered on broad tool matcher
- **Issue**: `triage-error.js` fires after every `Bash` tool call.
- **Recommendation**: Reviewed `triage-error.js` in full. Reads stdin event; checks command against a `FORGE_PATTERNS` whitelist; acts only on non-zero exit codes for matching commands. No network calls, no file writes, no env var reads. Outputs `additionalContext` only. Benign.

### [INFO] commands/update.md — instructs WebFetch to github.com

- **Check**: B — Skill file, outbound network instruction
- **Issue**: The command instructs Claude to fetch `raw.githubusercontent.com` for the remote manifest.
- **Recommendation**: Official Entelligentsia/forge repository. Fetched JSON used only for version string comparison. No code execution of fetched content. Justified by the command's stated purpose.

---

## Clean Areas

- `hooks/check-update.js` — legitimate version-check; `uncaughtException` exit-0 discipline correct; no credential reads; no eval
- `hooks/triage-error.js` — stdin event reader; no network; no file writes; whitelist-gated; no sensitive env reads
- `hooks/list-skills.js` — reads `installed_plugins.json` and `~/.claude/skills/`; no network; no eval
- `hooks/list-skills.sh` — same sources; `jq` parsing only; no eval or exec
- `tools/validate-store.cjs` — **FALLBACK object removed (v0.6.2)**; `validateRecord()` now accepts exactly two arguments; schemas embedded; no external reads; no network; no shell exec; 403 lines
- `tools/collate.cjs` — reads `.forge/store/`, writes `engineering/` markdown; no network; no shell exec
- `tools/manage-config.cjs` — reads/writes `.forge/config.json` only; pipeline name validated with `[a-z0-9_-]`; atomic rename pattern
- `tools/generation-manifest.cjs` — reads/writes `.forge/generation-manifest.json`; atomic rename
- `tools/seed-store.cjs` — reads `engineering/`, writes `.forge/store/`; no network
- `tools/estimate-usage.cjs` — local computation only; no network; no shell exec
- `commands/*.md` — all 8 command files reviewed; no prompt injection; no hidden instructions; no credential reads; no persona hijacking
- `meta/**/*.md` — meta-workflows, personas, templates, tool-specs, store-schema; no injection patterns; no hidden instructions; `sprint.schema.md` now includes `goal`, `features`, `feature_id` fields (synced in v0.6.2)
- `vision/**/*.md` — documentation only; no executable instructions
- `init/**/*.md` — generation phase orchestration; no prompt injection; no credential reads
- `migrations.json` — data only; `0.6.1→0.6.2` entry correct; manual step documents `.forge/schemas/` cleanup for upgrading users
- `sdlc-config.schema.json` — JSON Schema; no executable content
- `.claude-plugin/plugin.json` — minimal manifest; no permissions fields; no hooks declared; no allowed-tools
- No binary files
- No compiled/bytecode files
- No invisible Unicode (U+200B, U+FEFF, U+200C, U+200D, U+00AD)
- No base64-encoded blobs in any markdown
- No credential-adjacent path reads (`~/.ssh/`, `~/.aws/`, `~/.gnupg/`, `.env`, `*.key`)
- No `eval`, `exec`, `execSync`, `spawn`, `child_process` anywhere
- No `sudo`, `crontab`, `systemctl`, `launchctl`, or persistence mechanisms
- No npm dependencies required or imported
- No writes to shell init files
- No silent software installation

---

## Verdict

**SAFE TO USE**

Forge 0.6.2 contains no malicious patterns, prompt injection, data exfiltration, or permission abuse. The FALLBACK removal in `validate-store.cjs` is a clean dead-code deletion with no behavior change. The `run_sprint.md` re-spawn guard adds a retry path that reads from disk and re-invokes the task orchestrator — no new network surface or privilege escalation. All hooks remain within their established safe patterns.
