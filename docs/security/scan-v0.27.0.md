## Security Scan — forge:forge — 2026-04-23

**SHA**: `491167e1195daf0d69e0f9fe1e25add701e8410b` (source scan; installed cache at 0.26.0) | **Installed**: 2026-04-22T17:10:17.253Z | **Last updated**: 2026-04-22T17:10:17.253Z
**Scope**: user | **Install path**: /home/boni/src/forge/forge/ (source — pre-release v0.27.0)

### Summary

183 files scanned | 0 critical | 1 warning | 4 info

### Findings

#### [WARNING] tools/query-logger.cjs:10
- **Check**: A — Hook Scripts / environment variable read
- **Issue**: Reads `process.env.TOOL_INPUT` from the PostToolUse hook environment. The value is provided by the Claude Code runtime (bash command string from the hook event), not from user-controlled input. The value is passed to `JSON.stringify()` before being appended to the log file, which escapes all special characters. No injection path exists, but the env var read is noted per policy.
- **Excerpt**: `const toolInput = process.env.TOOL_INPUT || '';`
- **Recommendation**: Safe. `TOOL_INPUT` is a standard Claude Code PostToolUse hook variable containing the Bash command text. The value is only used for (a) substring matching to decide whether to log, and (b) truncated to 500 chars and JSON-serialized before writing. No execution of the value occurs.

#### [INFO] skills/store-query-nlp/SKILL.md — allowed-tools: Bash
- **Check**: C — Permissions
- **Issue**: `allowed-tools: [Bash]` with no command pattern restriction. Bash is required because the skill's only operation is invoking `node "$FORGE_ROOT/tools/store-cli.cjs" nlp ...`. The Bash usage is minimal and documented.
- **Recommendation**: Consistent with all other Forge skills that invoke CLI tools. The skill body constrains usage to the specific `store-cli.cjs` invocation pattern. Acceptable.

#### [INFO] skills/store-query-grammar/SKILL.md — allowed-tools: Bash
- **Check**: C — Permissions
- **Issue**: `allowed-tools: [Bash]` declared for a primarily reference/documentation skill. The only Bash invocation in the body is `node "$FORGE_ROOT/tools/store-cli.cjs" schema` to dump the live grammar. The description accurately states this: "Reference for the Forge NLP query grammar..."
- **Recommendation**: The single Bash usage (schema dump) is justified. `allowed-tools: []` would be more restrictive but would prevent the schema dump command. Current declaration is proportionate.

#### [INFO] commands/store-query.md — allowed-tools: Bash
- **Check**: C — Permissions
- **Issue**: `allowed-tools: [Bash]` required for the command to invoke `store-cli.cjs query` and `store-cli.cjs nlp`. These are the command's core operations.
- **Recommendation**: Expected and justified. Consistent with other Forge commands.

#### [INFO] hooks/hooks.json — PostToolUse Bash matcher, two hooks registered
- **Check**: C — Permissions
- **Issue**: Two hooks now registered on the `PostToolUse/Bash` event: `triage-error.js` (existing) and `query-logger.cjs` (new). The hooks run serially; both have short timeouts (5000ms, 3000ms). Multiple hooks on one event type is noted per policy.
- **Recommendation**: Both hooks are read-only observers (no writes outside `.forge/store/query-log.jsonl`). The combination is safe. `query-logger.cjs` silently exits if `TOOL_INPUT` doesn't match the store-cli query pattern, adding negligible overhead to non-query invocations.

### Clean Areas

- `tools/store-query.cjs` — no network calls, no credential access, no eval, no unsafe subprocess construction; uses `spawnSync` with fixed binary path and array args (no shell interpolation)
- `tools/lib/store-facade.cjs` — pure filesystem reads from `.forge/store/` and `.forge/config.json`; no network, no eval
- `tools/lib/store-nlp.cjs` — pure deterministic string parsing; no network, no I/O, no eval
- `tools/lib/store-query-exec.cjs` — query execution against StoreFacade; no network, no eval
- `skills/store-custodian/SKILL.md` — updated with query section; no new instructions change scope beyond documented store-cli operations
- `agents/store-query-validator.md` — read-only validation agent; no write instructions, no external calls
- `meta/workflows/meta-plan-task.md`, `meta-fix-bug.md`, `meta-sprint-plan.md` — additions are shortcut bash commands using the existing `store-cli.cjs` gateway; no new tool grants
- `meta/tool-specs/store-cli.spec.md` — documentation only
- `migrations.json`, `CHANGELOG.md`, `plugin.json` — metadata updates only
- All new files: no binary content, no compiled artifacts, no invisible Unicode, no base64 blobs

### Verdict

**SAFE TO USE**

Nine new source files (4 tool modules, 2 skills, 1 agent, 1 command, 1 hook logger) added in v0.27.0. All are read-only filesystem operations or structured CLI invocations via the existing `store-cli.cjs` gateway. No network calls beyond the pre-existing `check-update.js` version-check. No credential access. No eval or code injection vectors. `TOOL_INPUT` read in `query-logger.cjs` is JSON-serialized before use.
