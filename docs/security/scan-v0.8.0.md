## Security Scan — forge:forge — 2026-04-14

**SHA**: 7f51365 (source scan — local repo, not cached install) | **Installed**: 2026-04-13T04:23:17.016Z | **Last updated**: 2026-04-14T03:10:39.823Z
**Scope**: user + local | **Install path**: /home/boni/src/forge/forge/ (source scan via --source-path)

### Summary
102 files scanned | 0 critical | 2 warnings (pre-existing, accepted) | 3 info

### Findings

#### [WARNING] forge/hooks/check-update.js:24
- **Check**: A — Hook Script — network call and temp directory write
- **Issue**: The `check-update.js` SessionStart hook makes an outbound HTTPS GET to `raw.githubusercontent.com` (the URL is read from `plugin.json → updateUrl`, not hardcoded) and writes a throttle cache to `os.tmpdir()/forge-plugin-data/`. The network call is a version-check only — no data from the project is included in the request. The tmp write is scoped to a named subdirectory and contains only `{ lastCheck, remoteVersion }`.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Accepted. The network call is a legitimate version-check to the plugin's own GitHub repository; destination is always `raw.githubusercontent.com/Entelligentsia/forge/`. The tmp write holds only timing and version metadata. The `CLAUDE_PLUGIN_DATA` env var allows callers to redirect the cache location. No remediation required.

#### [WARNING] forge/hooks/check-update.js:127-132
- **Check**: A — Hook Script — writes to project config file
- **Issue**: The hook may write to `.forge/config.json` in the current project directory to refresh `paths.forgeRoot`. This is an intentional design — the hook keeps the plugin path current after reinstalls. The write is guarded by `hasForge` (the project must have `.forge/config.json`) and is a targeted single-field update (`cfg.paths.forgeRoot = pluginRoot`), not a wholesale config replacement.
- **Excerpt**: `cfg.paths.forgeRoot = pluginRoot; fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');`
- **Recommendation**: Accepted. The write is scoped to a field that the hook is explicitly responsible for keeping current. Guard conditions (`hasForge && pluginRoot !== '.'`) prevent spurious writes. No remediation required.

#### [INFO] forge/hooks/list-skills.js:27-31
- **Check**: A — Hook Script — reads environment variables for path resolution
- **Issue**: Reads `CLAUDE_PLUGIN_DATA_ROOT` and `CLAUDE_SKILLS_DIR` environment variables to locate `installed_plugins.json` and personal skills directory. These are Claude Code-provided variables, not user secrets.
- **Excerpt**: `const pluginsFile = process.env.CLAUDE_PLUGIN_DATA_ROOT ? path.join(...) : path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');`
- **Recommendation**: Informational only. These env vars are standard Claude Code plugin context variables. No action required.

#### [INFO] forge/hooks/triage-error.js — PostToolUse hook reads stdin
- **Check**: A — Hook Script — reads tool execution data from stdin
- **Issue**: The hook reads the PostToolUse event payload from stdin (JSON with `tool_name`, `tool_input`, `tool_response`). It checks `exitCode` and `stderr` of Bash tool calls that match Forge-related patterns. No data is written to disk or transmitted externally — the hook only writes an `additionalContext` message to stdout.
- **Excerpt**: `process.stdin.on('data', chunk => { raw += chunk; }); ... process.stdout.write(JSON.stringify({ hookSpecificOutput: { ... } }) + '\n');`
- **Recommendation**: Informational only. Behavior is scoped, transparent, and non-exfiltrating. No action required.

#### [INFO] forge/hooks/check-update.js:22-25 — reads CLAUDE_PLUGIN_ROOT and CLAUDE_PLUGIN_DATA
- **Check**: A — Hook Script — environment variable reads
- **Issue**: Reads `CLAUDE_PLUGIN_ROOT` (standard plugin context variable) and `CLAUDE_PLUGIN_DATA` (cache location override). Neither is a secret; both are Claude Code infrastructure variables.
- **Excerpt**: `const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || '.';`
- **Recommendation**: Informational only. Standard plugin infrastructure. No action required.

### Clean Areas

- `forge/commands/` — all command files are plain markdown; no prompt injection, persona hijacking, hidden instructions, or permission escalation found
- `forge/meta/workflows/` — all meta-workflow files are generation instructions for project-specific workflows; no adversarial content detected
- `forge/meta/personas/` — persona definitions are role descriptions with no exfiltration or jailbreak patterns
- `forge/meta/skills/` — skill files are reference-only patterns; no injection risks
- `forge/meta/templates/` — template files are document scaffolds; clean
- `forge/meta/tool-specs/` — tool specification markdown; clean
- `forge/meta/store-schema/` — schema documentation; clean
- `forge/schemas/` — JSON Schema definitions (sprint, task, bug, event, feature); no executable content
- `forge/sdlc-config.schema.json` — configuration schema; clean
- `forge/tools/store.cjs` — filesystem facade; no network calls, no credential reads, no unsafe ops
- `forge/tools/manage-config.cjs` — config read/write tool; all writes scoped to `.forge/config.json` via atomic rename; no network, no shell exec
- `forge/tools/validate-store.cjs` — store integrity checker; reads and validates JSON files, no writes in dry-run; clean
- `forge/tools/collate.cjs` — markdown generator; reads store, writes to `engineering/`; no network, no shell exec
- `forge/tools/seed-store.cjs` — store bootstrapper; reads `engineering/` filesystem; no network; DEBUG_SEED env var logs to console only (non-sensitive)
- `forge/tools/estimate-usage.cjs` — token estimation; heuristic table lookups and event file updates; no network, no shell exec
- `forge/tools/generation-manifest.cjs` — file integrity tracker using SHA-256; writes only to `.forge/generation-manifest.json`; no network
- `forge/init/` — discovery and generation instruction markdown; no executable content
- `forge/vision/` — design documentation; no executable content
- `forge/.claude-plugin/plugin.json` — manifest with version, updateUrl pointing to `raw.githubusercontent.com/Entelligentsia/forge/main/`; no unusual fields
- `forge/migrations.json` — migration chain; data-only; no executable content
- `forge/hooks/hooks.json` — hooks configuration; 2 hooks (SessionStart, PostToolUse/Bash); timeout 10000ms and 5000ms respectively; no unrestricted Bash access; no `allowed-tools`
- No binary files, compiled artifacts, or files with misleading extensions found
- No zero-width Unicode characters, embedded base64 blobs, or hidden content detected in any markdown file
- No `eval`, `base64 | bash`, `xxd | sh`, `perl -e`, or command obfuscation patterns found
- No reads of `~/.ssh/`, `~/.aws/`, `~/.gnupg/`, `.env`, `*.pem`, `*.key` or credential-adjacent paths
- No writes to shell init files (`.bashrc`, `.zshrc`, etc.)
- No software installation or persistence mechanisms
- Plugin size: 728K — appropriate for a workflow orchestration plugin of this scope

### Verdict

**SAFE TO USE**

102 files scanned across all hooks, commands, workflows, personas, tools, schemas, and init scripts. Zero critical findings. The two warnings are pre-existing, accepted behaviors (version-check HTTPS call to the plugin's own GitHub repository, and a config sync write scoped to `paths.forgeRoot`). All tool scripts use strict mode, no npm dependencies, and properly scope filesystem operations. No prompt injection, exfiltration, or permission escalation patterns were found.
