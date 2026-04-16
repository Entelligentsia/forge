## Security Scan — forge:forge (source: forge/) — 2026-04-15

**SHA**: not applicable (source scan) | **Installed**: 2026-04-09T18:02:54.923Z | **Last updated**: 2026-04-15T11:08:02.491Z
**Scope**: local + user | **Install path (source)**: /home/boni/src/forge/forge/

### Summary
106 files scanned | 0 critical | 2 warnings (carry-forward, accepted) | 14 info

### Findings

#### [WARNING] forge/hooks/check-update.js:76–84
- **Check**: A — Network call in hook
- **Issue**: `https.get()` call to a remote URL on every session start (throttled to once per 24h by cache). URL is read from `plugin.json → updateUrl`, falling back to `raw.githubusercontent.com/Entelligentsia/forge/main/...`. The hook has no URL allowlist enforcement — a malicious `plugin.json` could redirect the URL to an attacker-controlled host.
- **Excerpt**: `https.get(remoteUrl, { timeout: 5000 }, (res) => { ... JSON.parse(body).version ... })`
- **Recommendation**: Carry-forward from prior scans — accepted. Mitigated by: (1) URL is read from the plugin's own `plugin.json` (not user-supplied), (2) only the `version` field of the JSON response is consumed, (3) response is not executed. Risk is theoretical URL redirect via a tampered plugin.json. SAFE AS-IS.

#### [WARNING] forge/hooks/check-update.js:24
- **Check**: A — Write to shared temp location
- **Issue**: The cache file path uses `os.tmpdir()` (`/tmp/forge-plugin-data/`) as a fallback when `CLAUDE_PLUGIN_DATA` is unset. Writing a version-check cache to a shared temp directory is lower-risk (world-readable, no credentials), but a low-level TOCTOU or tmp-race exists in a multi-user environment.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Carry-forward from prior scans — accepted. The only data written is `{ lastCheck, remoteVersion }` — no sensitive content. The project-level cache at `.forge/update-check-cache.json` is preferred (project-scoped). SAFE AS-IS.

#### [INFO] forge/commands/update.md — 902 lines
- **Check**: B — Large file
- **Issue**: Longest file in plugin at 902 lines. Inspected thoroughly — no buried instructions or injections found. Length reflects comprehensive update/migration UX logic across 6 steps.
- **Recommendation**: No action needed.

#### [INFO] forge/tools/store-cli.cjs — 747 lines
- **Check**: D — Large CJS tool
- **Issue**: Largest tool at 747 lines. Thoroughly scanned — `'use strict'`, top-level try/catch, `process.exit(1)` on error, no npm deps, no network calls, `--dry-run` honored. All writes go through `store.cjs` facade.
- **Recommendation**: No action needed.

#### [INFO] forge/hooks/hooks.json — Hook registrations
- **Check**: C — Permissions
- **Issue**: Two hooks registered: `SessionStart` → `check-update.js` (10s timeout), `PostToolUse` with `Bash` matcher → `triage-error.js` (5s timeout). No `allowed-tools` in frontmatter. Timeouts are reasonable (5s, 10s). Both hooks use `node "${CLAUDE_PLUGIN_ROOT}/..."` — `CLAUDE_PLUGIN_ROOT` is a system env var, not user-supplied.
- **Recommendation**: No action needed.

#### [INFO] forge/hooks/triage-error.js — PostToolUse hook
- **Check**: A — Hook reads stdin (tool input/output) and writes to stdout
- **Issue**: The hook reads `event.tool_input.command` and `event.tool_response.stderr/output` from Bash PostToolUse events. The `errorSnippet` is sliced to 3 lines and embedded in an `additionalContext` string. No credential fields are extracted. The snippet could theoretically include secrets if a Bash command echoes them, but this is user-controlled data flowing through user's own session — not an exfiltration vector.
- **Recommendation**: No action needed.

#### [INFO] forge/meta/workflows/meta-orchestrate.md — spawn_subagent
- **Check**: B — Workflow instructions spawning agents
- **Issue**: The meta-workflow generates orchestrators that use Agent tool calls (`spawn_subagent`). The generated prompt includes persona content from `.forge/personas/` and skill content from `.forge/skills/`. These are project-generated files — injecting malicious content into them would require prior write access to `.forge/`. No injection vectors in the meta-workflow itself.
- **Recommendation**: No action needed.

#### [INFO] forge/commands/report-bug.md — `gh issue create`
- **Check**: B — External write
- **Issue**: The command runs `gh issue create --repo Entelligentsia/forge ...` — explicitly user-initiated (requires user to type "confirm" at draft review step). The body is populated from conversation context; user sees the draft before filing. No ambient or auto-triggered writes.
- **Recommendation**: No action needed.

#### [INFO] forge/commands/remove.md — `rm -rf`
- **Check**: B — Destructive filesystem operations
- **Issue**: Three options include `rm -rf .forge/`, `rm -rf .forge/ engineering/`. All paths are hardcoded project-relative paths (not constructed from user input). User must type exact confirmation strings (`"confirm"`, `"delete engineering"`). No path traversal possible.
- **Recommendation**: No action needed.

#### [INFO] forge/tools/list-skills.js — reads installed_plugins.json
- **Check**: A — Reads system plugin registry
- **Issue**: Reads `~/.claude/plugins/installed_plugins.json` to enumerate installed skills. This is a legitimate function (health check / skill gap analysis). No network calls, no writes, no credential access.
- **Recommendation**: No action needed.

#### [INFO] forge/tools/seed-store.cjs — DEBUG_SEED env var
- **Check**: A — Env var read
- **Issue**: `process.env.DEBUG_SEED` is checked to enable debug logging. Not a sensitive var name; only affects console.log output. No security implications.
- **Recommendation**: No action needed.

#### [INFO] forge/meta/personas/meta-architect.md:41 — "act as" pattern
- **Check**: B — Potential persona hijacking match
- **Issue**: Grep for "act as" matched `"The project's deployment topology for impact assessment"` — false positive. No persona hijacking language present.
- **Recommendation**: No action needed.

#### [INFO] forge/meta/workflows/meta-sprint-plan.md — new explicit path instruction
- **Check**: B — Changed instruction in this release
- **Issue**: Step 4 Documentation now reads `Write SPRINT_PLAN.md to \`engineering/sprints/{sprintId}/SPRINT_PLAN.md\`` — a path template instruction. No executable content, no external URLs, no credential access, no new agent directives. Change is additive and path-anchoring only.
- **Recommendation**: No action needed.

#### [INFO] No binary files
- **Check**: D — Structural
- **Issue**: No `.pyc`, `.class`, `.so`, `.dylib`, `.dll`, `.exe`, or binary files found in any subdirectory.
- **Recommendation**: No action needed.

#### [INFO] No hidden Unicode
- **Check**: B — Zero-width characters
- **Issue**: Grep for zero-width space (U+200B), BOM (U+FEFF), zero-width non-joiner (U+200C), zero-width joiner (U+200D), soft hyphen (U+00AD) returned no results.
- **Recommendation**: No action needed.

### Clean Areas
- `forge/schemas/` — JSON Schema definitions only, no executable content
- `forge/vision/` — documentation only, no instructions
- `forge/init/discovery/` — read-only discovery prompts, no writes
- `forge/init/generation/` — generation instruction templates, no injection patterns
- `forge/meta/templates/` — document format templates, no code
- `forge/meta/personas/` — persona identity files, no injection patterns
- `forge/meta/skills/` — skill reference files, no injection patterns
- `forge/meta/store-schema/` — schema documentation, no code
- `forge/meta/tool-specs/` — tool specification documents, no injection patterns
- `forge/tools/store.cjs` — pure facade, no network, no env reads outside FORGE_ROOT scope
- `forge/tools/collate.cjs` — filesystem writes to project dirs only, `--dry-run` honored
- `forge/tools/validate-store.cjs` — read-only validation, `--fix` explicit opt-in
- `forge/tools/manage-config.cjs` — config CRUD, project-local only
- `forge/tools/estimate-usage.cjs` — pure calculation, no I/O side effects
- `forge/tools/generation-manifest.cjs` — manifest tracking, project-local only

### Verdict

**SAFE TO USE**

106 files scanned. 0 critical findings. 2 carry-forward warnings (version-check network call and tmp-dir cache, both accepted in prior scans, no change in risk profile). 14 informational notes with no action required. The single file changed in this release (`meta-sprint-plan.md`) adds only a path template string — no new attack surface.
