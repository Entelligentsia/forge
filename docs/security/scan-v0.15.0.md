## Security Scan — forge:forge — 2026-04-19

**SHA**: 063ccea | **Installed**: n/a (source scan) | **Last updated**: n/a
**Scope**: source | **Install path**: /home/boni/src/forge/forge/

### Summary
154 files scanned | 0 critical | 0 warnings | 3 info

### Findings

### [INFO] forge/hooks/check-update.js:77
- **Check**: A — outbound network call
- **Issue**: `https.get(remoteUrl, ...)` fires during the SessionStart hook. This is the declared legitimate update-check path.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => { ... })`
- **Recommendation**: No action. Verified: `remoteUrl` is sourced from `forge/.claude-plugin/plugin.json` `updateUrl` (lines 45–51) with a fallback to the main-branch `raw.githubusercontent.com/Entelligentsia/forge/main/...` URL. No hardcoded exfiltration endpoint. Timeout is bounded (5000ms). Hook wraps `uncaughtException` to exit 0 so a network failure cannot break session start. No credentials or env vars are transmitted — only a GET for the remote `plugin.json`.

### [INFO] forge/commands/update.md:156
- **Check**: A — outbound network call (documentation reference)
- **Issue**: Command instructions mention `curl` as a fallback for fetching the remote `plugin.json` during `/forge:update`.
- **Excerpt**: `Use the WebFetch tool (preferred) or \`curl\` via Bash:`
- **Recommendation**: No action. This is user-initiated, references the same declared `updateUrl`, and executes only when the user invokes `/forge:update`. No credential exfiltration surface.

### [INFO] forge/hooks/hooks.json:14 (PostToolUse hook)
- **Check**: C — hook matcher scope
- **Issue**: The `triage-error.js` PostToolUse hook matches every `Bash` invocation. This is broad by necessity (to catch Forge command failures anywhere), but it does fire on every shell call in any project where the plugin is installed.
- **Excerpt**: `"matcher": "Bash"` with `"timeout": 5000`
- **Recommendation**: No action required for this release. The hook only reads `event.tool_input.command` and matches against a closed regex whitelist (`FORGE_PATTERNS`) before doing anything. On non-match it returns immediately. It never shells out, never touches the network, never reads files, and never touches credentials. `uncaughtException` is swallowed to exit 0.

### Clean Areas
- forge/hooks/check-update.js — no credential reads, no env-var capture, no eval, no persistence, no writes outside `CLAUDE_PLUGIN_DATA` / `.forge/`; URL sourced from plugin.json per project policy.
- forge/hooks/triage-error.js — stdin-only event handler; no network, no spawn, no fs reads; closed regex whitelist.
- forge/hooks/hooks.json — two events (SessionStart, PostToolUse); both timeouts <= 10s (< 30s WARNING threshold); no multi-event hook.
- forge/tools/parse-verdict.cjs (new v0.15.0) — pure parser; reads single file argument via `fs.readFileSync`; no network, no spawn, no eval, no env-var access.
- forge/tools/parse-gates.cjs (new v0.15.0) — pure parser; no I/O; closed grammar (unknown directives throw).
- forge/tools/preflight-gate.cjs (new v0.15.0) — pure evaluator; only `fs.statSync/readFileSync/existsSync`; no writes, no network, no spawns; path substitution uses a whitelisted `{key}` template vocabulary.
- forge/meta/workflows/meta-orchestrate.md, meta-fix-bug.md, meta-plan-task.md, meta-implement.md, meta-review-plan.md, meta-review-implementation.md, meta-approve.md, meta-commit.md, meta-validate.md — scanned for prompt-injection phrases ("ignore previous", "disregard", "jailbreak", "you are now"): zero matches. No hidden instructions in HTML comments. No zero-width Unicode anywhere in the tree.
- forge/.claude-plugin/plugin.json — minimal manifest; no `allowed-tools`, no hooks inline, no Agent grants, no MCP servers; `updateUrl`/`migrationsUrl` correctly pinned to `raw.githubusercontent.com/Entelligentsia/forge/main/`.
- forge/commands/ and forge/meta/ markdown — no unjustified `allowed-tools` frontmatter; no permission-escalation instructions (nothing editing `settings.json`); no exfiltration instructions.
- forge/tools/*.cjs — `child_process` usage appears only in tests (`spawnSync` of the tool under test), not in shipped runtime code. No shell-injection sinks on untrusted input.
- No binaries, no compiled bytecode (.pyc/.class/.so/.dll/.exe), no files >500 KB. No `package.json` or `node_modules` — dep-free design honoured.
- No reads of `~/.ssh`, `~/.aws`, `.env`, `*.pem`, `id_rsa`. No capture of `TOKEN|SECRET|PASSWORD|API_KEY|AUTH` env vars (the `*Tokens` matches are all LLM token-usage fields in store/event schemas — legitimate telemetry). No `eval`, no `base64 -d | sh`, no `xxd`, no `crontab`/`launchctl`/`nohup`, no shell init file writes, no `sudo`, no silent `npm -g`/`pip`/`brew` installs, no `chmod +x` on generated files, no `/tmp` writes outside `os.tmpdir()` defaults.

### Verdict
**SAFE TO USE**
Zero critical, zero warnings. All three new v0.15.0 tool scripts (`parse-verdict.cjs`, `parse-gates.cjs`, `preflight-gate.cjs`) are pure, read-only evaluators with no network, spawn, or eval surface. The nine edited workflow files contain no prompt-injection phrases, hidden instructions, or permission-escalation directives. The sole outbound network call remains the declared update-check in `check-update.js`, correctly sourcing its URL from `plugin.json`.
