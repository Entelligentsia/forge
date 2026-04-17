## Security Scan — forge:forge — 2026-04-17

**SHA**: `726d576` | **Installed**: source scan (not from cache) | **Last updated**: 2026-04-17
**Scope**: source (pre-publication) | **Install path**: `/home/boni/src/forge/forge`

This scan covers v0.12.4 source pre-publication. It bundles the changes
shipped across v0.12.0 (FEAT-003 fast-mode init) → v0.12.1 (FEAT-004
interactive prompt + FEAT-005 /forge:config + FORGE-BUG-010 gitignore) →
v0.12.2 (Fast default) → v0.12.3 (FEAT-006 visual onboarding character)
→ v0.12.4 (fast-mode capability announcement).

### Summary

140 files scanned · 1.2 MB total · **0 critical · 0 warnings · 3 info**

### Findings

#### [INFO] forge/hooks/check-update.js:77

- **Check**: A — Hook scripts (network calls)
- **Issue**: HTTPS GET to `raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`
  (or the `updateUrl` recorded in the installed plugin's manifest).
  This is the once-per-day version-check call invoked from the
  `SessionStart` hook.
- **Excerpt**:
  ```js
  https.get(remoteUrl, { timeout: 5000 }, (res) => { ... });
  ```
- **Recommendation**: **Accepted** (carry-forward from prior scans). Call
  is justified by the plugin's stated update-check function, scoped to
  the official Forge GitHub raw endpoint, throttled to 24-hour intervals
  via plugin-level cache, fails silently on error (`process.on('uncaughtException', () => process.exit(0))`),
  and never exfiltrates project state.

#### [INFO] forge/hooks/triage-error.js:42

- **Check**: A — Hook scripts (PostToolUse on Bash)
- **Issue**: PostToolUse hook reads stdin (the JSON event) and emits
  `additionalContext` JSON to stdout when a Forge-related Bash command
  exits non-zero. No network. No filesystem reads beyond the event
  payload. Pattern-matches commands against an allow-list of
  forge-related strings (`/forge:`, `.forge/`, `manage-config`, etc.) so
  it never injects context for unrelated tool calls.
- **Excerpt**:
  ```js
  if (event.tool_name !== 'Bash') return;
  if (!isForgeRelated(command)) return;
  if (exitCode === 0 || exitCode === undefined) return;
  ```
- **Recommendation**: **Accepted**. Hook is purely diagnostic, scoped to
  Forge commands, and follows the no-non-zero-exit invariant
  (`process.on('uncaughtException', () => process.exit(0))`).

#### [INFO] forge/.claude-plugin/plugin.json + forge/hooks/hooks.json

- **Check**: C — Permissions
- **Issue**: Plugin manifest declares no `allowed-tools` overrides. Hooks
  registry uses standard event names (`SessionStart`, `PostToolUse`),
  bounded timeouts (10s and 5s respectively), and `${CLAUDE_PLUGIN_ROOT}`
  interpolation for the executable path — no command-string interpolation
  of untrusted variables.
- **Excerpt**:
  ```json
  "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/check-update.js\""
  ```
- **Recommendation**: **Safe**. Permissions surface is minimal and
  consistent with the plugin's stated function.

### Clean Areas

- `forge/commands/` (13 files) — no prompt-injection patterns, no exfil
  language, no credential references, no hidden HTML comments, no
  zero-width Unicode. All `https://` references are official Anthropic /
  GitHub URLs (raw.githubusercontent.com, github.com/Entelligentsia,
  json-schema.org, cli.github.com docs reference).
- `forge/init/` and `forge/init/generation/` (~20 files) — orchestration
  rulebooks. No injection patterns. New `lazy-materialize.md` (v0.12.0)
  and capability-announcement wiring (v0.12.4) reviewed in detail; both
  delegate to `ensure-ready.cjs` for state checks and `banners.cjs` for
  display — no inline shell-out beyond standard `node "$FORGE_ROOT/tools/*.cjs"`
  invocations.
- `forge/meta/personas/`, `forge/meta/skills/`, `forge/meta/templates/`,
  `forge/meta/workflows/` (~50 files) — all are agent-facing meta
  definitions consumed by Forge's own generation pipeline. No external
  network calls, no credential references, no persona-hijacking
  language.
- `forge/tools/*.cjs` and `forge/tools/__tests__/*.test.cjs` (~30 files)
  — all are pure Node.js built-ins (`fs`, `path`, `os`, `https`, `crypto`).
  No `eval`, no `base64 -d | bash`-style obfuscation, no `~/.ssh` or
  credential reads. The new `banners.cjs` (v0.12.3) ANSI library is
  display-only; `--plain` mode honours `NO_COLOR` / `FORGE_BANNERS_PLAIN`
  / non-tty stdout. The new `ensure-ready.cjs` `--announce` /
  `--capabilities*` subcommands (v0.12.4) only read project files and
  emit JSON / text — no writes, no network.
- `forge/schemas/*.schema.json` and `forge/schemas/structure-manifest.json`
  — JSON Schema documents only.
- `forge/hooks/hooks.json` — minimal hook registry (2 hooks, both
  reviewed above).
- `forge/agents/tomoshibi.md` — KB-linking agent rulebook. No injection
  language; reads/writes within project tree only.

### Verification details

- File count: 140 (was 139 in v0.12.0 scan; +1 = `engineering/features/FEAT-006.md`
  spec file included via `forge/` glob? actually v0.12.4 added new test
  fixture and capability code — see git log. Source size: 1.2 MB.
- No binary files, no compiled bytecode (`.pyc`, `.so`, `.dylib`, `.exe`,
  `.class`), no oversized files (>100 KB).
- No zero-width / invisible Unicode (U+200B, U+FEFF, U+200C, U+200D, U+00AD).
- No long base64-looking blobs (>60 chars `[A-Za-z0-9+/=]`) embedded in
  any file.
- No `.bashrc` / `.zshrc` / `crontab` / `systemctl` / `launchctl` /
  `apt-get` / `brew install` / `pip install` / `sudo` references.
- No `eval` of variable substitution, no `base64 -d | bash`, no
  `python3 -c` shell-out.
- The single string match for `TOKENS_PER_MINUTE` is the LLM
  throughput-estimation table in `forge/tools/estimate-usage.cjs` — not
  an auth token.

### Verdict

**SAFE TO USE**

Three info-level findings, all carry-forward from prior accepted scans
(version-check hook, error-triage hook, minimal permission surface). No
critical or warning findings introduced by v0.12.0 → v0.12.4 changes.
The new visual-character helpers (banners.cjs extensions in v0.12.3) and
capability-announcement helpers (ensure-ready.cjs extensions in v0.12.4)
are display-only or read-only and introduce no new attack surface.
