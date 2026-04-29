## Security Scan — forge:forge (source v0.6.10) — 2026-04-10

**SHA**: `d7ebd8faefbaab523d9a76840699c8cb387bd806` (installed cache at 0.6.9) | **Installed**: 2026-04-07T06:51:33.504Z | **Last updated**: 2026-04-10T05:49:42.934Z
**Scope**: local (walkinto.in) | **Source scanned**: `/home/boni/src/forge/forge/` (v0.6.10, pre-release)

> Note: `forge:forge --source-path /home/boni/src/forge/forge/` has no literal entry in `installed_plugins.json`. Scan performed against the source directory per CLAUDE.md instructions. Installed cache at `forge@forge` (v0.6.9) matches this source minus the 0.6.10 changes made in this session.

### Summary
91 files scanned | 0 critical | 3 warnings | 3 info

### Findings

#### [WARNING] hooks/hooks.json — Check C
- **Check**: C — Hooks registered on multiple event types simultaneously
- **Issue**: Two hooks registered across two event types: `SessionStart` (check-update.js) and `PostToolUse` matcher=Bash (triage-error.js).
- **Excerpt**: `"SessionStart": [...], "PostToolUse": [{"matcher": "Bash", ...}]`
- **Recommendation**: Safe — both hooks are purpose-matched and scoped. SessionStart injects Forge context and checks for updates once per day. PostToolUse fires only on Bash tool calls matching a Forge-related command pattern, surfacing an error-triage prompt. Neither touches credentials or executes untrusted code. No action required.

#### [WARNING] hooks/check-update.js:77 — Check A
- **Check**: A — Outbound network call
- **Issue**: `https.get(remoteUrl, ...)` fetches a URL sourced from `plugin.json → updateUrl` at runtime, with a hardcoded fallback to `raw.githubusercontent.com/Entelligentsia/forge/main/...`.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => { ... })`
- **Recommendation**: Safe — fallback URL is a known version-check endpoint on `raw.githubusercontent.com`. Runtime URL is read from the plugin's own `plugin.json`. Response is parsed for a `version` string only; no code is executed from the response. 5-second timeout enforced. No action required.

#### [WARNING] commands/update.md — Check B
- **Check**: B — Very long file (751 lines)
- **Issue**: `update.md` exceeds the 500-line WARNING threshold.
- **Excerpt**: *(full read performed)*
- **Recommendation**: Safe — full read performed. All sections are labelled, terminal section is a clean "On error" block with no hidden instructions. Length is justified by multi-step orchestration logic (6 steps, sub-steps 5a–5f, pipeline audit, migration chain walking, distribution detection). No action required.

#### [INFO] tools/manage-config.cjs:18 — Functional bug (fixed in 0.6.10)
- **Check**: Functional (not security)
- **Issue**: `VALID_ROLES` and `ROLE_MODEL_DEFAULTS` were missing `'validate'`. Fixed in this release.
- **Excerpt**: `const VALID_ROLES = ['plan', 'review-plan', 'implement', 'review-code', 'approve', 'commit'];`
- **Recommendation**: Fixed — `'validate'` added to both `VALID_ROLES` and `ROLE_MODEL_DEFAULTS`.

#### [INFO] commands/update.md:530 — Functional bug (fixed in 0.6.10)
- **Check**: Functional (not security)
- **Issue**: Built-in command list in Step 5d was missing `validate`, causing the pipeline audit to treat it as a custom command.
- **Recommendation**: Fixed — `validate` added to the built-in command list.

#### [INFO] commands/add-pipeline.md — Functional bug (fixed in 0.6.10)
- **Check**: Functional (not security)
- **Issue**: Standard phase table in Mode 1 / Step 2 was missing the `validate` row.
- **Recommendation**: Fixed — `validate` row added.

### Clean Areas
- `hooks/triage-error.js` — reads stdin only; no network, no credentials, no file writes
- `hooks/list-skills.js` — reads local plugin registry only; no network, no writes, no credentials
- `hooks/hooks.json` — timeouts within limits (5000ms, 10000ms); no untrusted variable interpolation
- `tools/validate-store.cjs` — self-contained; reads local `.forge/store/` only; no network
- `tools/collate.cjs` — reads/writes project-local paths only; no network
- `tools/estimate-usage.cjs` — pure local computation; no network, no credential access
- `tools/generation-manifest.cjs` — reads/writes `.forge/generation-manifest.json`; uses crypto for SHA256 (benign)
- `tools/manage-config.cjs` — reads/writes `.forge/config.json` only; pipeline names validated with `[a-z0-9_-]`; atomic rename pattern
- `commands/*.md` — no prompt injection phrases, no hidden instructions, no exfiltration, no permission escalation
- `meta/workflows/*.md` — all checked; no injection; "act as" match in `meta-architect.md:41` is a false positive from the substring "impact assessment"
- `meta/personas/*.md` — no injection, no hijacking attempts
- Zero-width Unicode — none found across all 91 files
- Base64 blobs — none found in any markdown file
- Binary/compiled artifacts — none; all files are `.md`, `.json`, `.js`, `.cjs`
- Plugin size — 684KB (well within 5MB threshold)

### Verdict

**SAFE TO USE**

No prompt injection, credential access, persistence mechanisms, suspicious network calls, or hidden instructions found across all 91 files. The three warnings are justified design decisions. The three info items were functional bugs (missing `validate` role propagation) caught and fixed in this session before publication.
