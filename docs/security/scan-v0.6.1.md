# Security Scan — forge:forge v0.6.1

**Date**: 2026-04-09
**SHA**: not recorded (source install)
**Scope**: source (`/home/boni/src/forge/forge/`)
**Scanner**: `/security-watchdog:scan-plugin`

---

## Summary

91 files scanned | 664K total | **0 critical** | **3 warnings** | **2 info**

---

## Findings

### [WARNING] hooks/check-update.sh:44,55 — outbound network call

- **Check**: A — Hook Scripts, outbound network call
- **Issue**: `curl` is used to fetch the remote `plugin.json` from `raw.githubusercontent.com` for version checking. The JavaScript counterpart (`check-update.js`) uses `https.get` to the same endpoint. The `curl` call is safe in destination and purpose, but is flagged per protocol for any outbound call in a hook.
- **Excerpt**: `REMOTE_VERSION=$(curl -sf --max-time 5 "$REMOTE_URL" 2>/dev/null | jq -r '.version // ""' 2>/dev/null || echo "")`
- **Recommendation**: Safe to use. Destination is `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` — the canonical official release endpoint. `--max-time 5` prevents hung connections. Output is only used for version string comparison; no execution of fetched content. The JS hook (`check-update.js`) is the active hook registered in `hooks.json`; the `.sh` version is a reference implementation — both resolve to the same URL.

### [WARNING] commands/update.md — file length > 500 lines

- **Check**: B — Skill/Command file, length > 500 lines
- **Issue**: `update.md` exceeds the 500-line review threshold (702 lines). Long files can bury instructions deep where casual reviewers miss them.
- **Recommendation**: No malicious content found on full read. File length is justified by the command's multi-step migration orchestration logic (6 numbered steps, pipeline audit sub-steps 5a–5f, argument table, error handler, new granular sub-target aggregation logic). No hidden instructions found after any `---` markers; all sections are labelled. No prompt injection patterns detected. Safe to use.

### [WARNING] hooks/check-update.sh — writes to /tmp

- **Check**: A — Hook Scripts, shared temp writes
- **Issue**: The shell hook writes to `/tmp/forge-plugin-data/` (configurable via `CLAUDE_PLUGIN_DATA`). Writing to `/tmp` is flagged as a standard warning.
- **Recommendation**: Safe. The file written (`update-check-cache.json`) contains only `lastCheck`, `remoteVersion`, `localVersion`, `migratedFrom` — no sensitive data. The path is user-configurable via env var. The same pattern is used by `check-update.js` (the active hook). No symlink or race attack surface beyond what any user-level temp write has.

### [INFO] hooks/hooks.json — PostToolUse registered on broad Bash matcher

- **Check**: C — Permissions, hook registered on broad tool matcher
- **Issue**: The `triage-error.js` hook fires after every `Bash` tool call. This is a wide registration scope.
- **Recommendation**: Reviewed `triage-error.js` in full. It reads stdin (the Bash tool event), checks if the command matches a whitelist of Forge-related patterns, and only acts on non-zero exit codes. No network calls, no file writes beyond stdout. The hook outputs `additionalContext` only when a Forge command fails. Pattern is benign.

### [INFO] commands/update.md — instructs WebFetch to github.com

- **Check**: B — Skill file, outbound network instruction
- **Issue**: The command instructs Claude to use WebFetch (or curl) to fetch `raw.githubusercontent.com` for the remote manifest.
- **Recommendation**: Destination is the official Entelligentsia/forge repository. The fetched content (JSON) is used only for version string comparison and migration notes display. No code execution of fetched content. Justified by the command's stated purpose.

---

## Clean Areas

- `hooks/check-update.js` — legitimate version-check only; `process.uncaughtException` exit-0 discipline correct; no credential reads; no eval
- `hooks/triage-error.js` — reads only Bash tool event from stdin; no network calls; no file writes; no sensitive env vars
- `hooks/list-skills.js` — reads only `installed_plugins.json` and `~/.claude/skills/`; no network calls; no eval
- `hooks/list-skills.sh` — reads same sources; `jq` for parsing only; no eval or exec
- `commands/*.md` — all 8 command files reviewed; no prompt injection patterns; no hidden instructions; no credential reads; no persona hijacking
- `tools/validate-store.cjs` — **schemas now embedded in-file** (v0.6.1 change); no reads from `.forge/schemas/`; reads `.forge/store/` and validates; no writes beyond `--fix` mode; reduced external dependency surface
- `tools/collate.cjs` — reads `.forge/store/`, writes `engineering/` markdown; no network, no shell exec
- `tools/manage-config.cjs` — reads/writes `.forge/config.json` only; validates pipeline name with `[a-z0-9_-]`; uses atomic rename pattern
- `tools/generation-manifest.cjs` — reads/writes `.forge/generation-manifest.json`; uses atomic rename pattern
- `tools/seed-store.cjs` — reads `engineering/`, writes `.forge/store/`; no network
- `tools/estimate-usage.cjs` — local computation only; no network, no shell exec
- `meta/**/*.md` — meta-workflow and template definitions; no injection patterns; no hidden instructions
- `vision/**/*.md` — documentation only; no executable instructions
- `init/**/*.md` — generation phase orchestration; no prompt injection; no credential reads
- `migrations.json` — data only; `"tools"` stripped from all legacy entries; `0.6.0→0.6.1` entry correct and non-breaking
- `sdlc-config.schema.json` — JSON Schema; no executable content
- `.claude-plugin/plugin.json` — minimal manifest; no permissions fields, no hooks declared, no allowed-tools
- No binary files found
- No compiled/bytecode files found
- No invisible Unicode (U+200B, U+FEFF, U+200C, U+200D, U+00AD) found
- No base64-encoded blobs found in any markdown
- No credential-adjacent path reads (`~/.ssh/`, `~/.aws/`, `~/.gnupg/`, `.env`, `*.key`)
- No `eval`, `exec`, `execSync`, `spawn`, `child_process` usage anywhere
- No `sudo`, `crontab`, `systemctl`, `launchctl`, or persistence mechanisms
- No npm dependencies required or imported
- No writes to shell init files
- No silent software installation

---

## Verdict

**SAFE TO USE**

Forge 0.6.1 contains no malicious patterns, prompt injection, data exfiltration, or permission abuse. The single outbound network call (version check to `raw.githubusercontent.com`) is transparent, destination-verified, content-safe, and optional. The embedded-schema change in `validate-store.cjs` (S03-T01) reduces attack surface by removing an external schema read path. The granular migration sub-target format in `update.md` (S03-T02) adds specificity with no new network surface. All hooks exit cleanly on error and never surface noise to the user. The plugin uses only Node.js built-ins and ships no binary artifacts.
