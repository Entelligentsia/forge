## Security Scan — forge:forge — 2026-04-19

**SHA**: not recorded (source scan) | **Installed**: N/A | **Last updated**: N/A
**Scope**: source | **Install path**: /home/boni/src/forge/forge/

### Summary
166 files scanned | 0 critical | 3 warnings | 4 info

### Findings

#### [WARNING] hooks/check-update.js:24
- **Check**: A — Hook Script — Writing to /tmp
- **Issue**: When `CLAUDE_PLUGIN_DATA` is not set, the plugin-level update-check cache is written to `os.tmpdir()` (typically `/tmp`). The data stored (`lastCheck` timestamp, `remoteVersion` string) is entirely non-sensitive, but writing to `/tmp` is flagged per Check A policy.
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: No action required — the data written (version string + timestamp) carries no sensitive information and the fallback path is intentional for environments where `CLAUDE_PLUGIN_DATA` is not configured. This is benign and expected. (Accepted carry-forward from v0.18.1.)

#### [WARNING] hooks/check-update.js:44,77
- **Check**: A — Hook Script — Outbound network call
- **Issue**: The `SessionStart` hook makes an outbound HTTPS GET to `raw.githubusercontent.com` once per 24 hours to check for a newer plugin version. The URL is read from `plugin.json` (`updateUrl`) with a hardcoded fallback to `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json`. Only the `version` field of the response is parsed and used; the full body is not eval'd or executed. No data is sent outbound — this is a pure GET.
- **Excerpt**: `const FALLBACK_UPDATE_URL = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';` / `https.get(remoteUrl, { timeout: 5000 }, ...)`
- **Recommendation**: Justified — this is the canonical version-check pattern for a plugin update detector. The destination is the legitimate plugin repository. The timeout is bounded at 5000ms. The `updateUrl` in `plugin.json` is controlled by Entelligentsia and not overridable by untrusted project config. (Accepted carry-forward from v0.18.1.)

#### [WARNING] hooks/validate-write.js:173
- **Check**: A — Hook Script — Bypass mechanism via environment variable
- **Issue**: Setting `FORGE_SKIP_WRITE_VALIDATION=1` disables schema enforcement on all Write/Edit/MultiEdit operations to Forge-owned paths for that session. The bypass is audit-logged to the event progress log, but the log is append-only and only written if the target directory already exists. A user or process with the ability to set environment variables could silently bypass schema validation.
- **Excerpt**: `if (process.env.FORGE_SKIP_WRITE_VALIDATION === '1') { writeBypassAudit(...); process.exit(0); }`
- **Recommendation**: The bypass is intentionally documented as an "emergency repair" escape hatch; the audit trail is a reasonable control. No change required. (Accepted carry-forward from v0.18.1.)

#### [INFO] commands/init.md — Inline node -e pattern
- **Check**: B — Skill/Command file — Inline node -e pattern
- **Issue**: The init command uses an inline `node -e` snippet to write `.forge/init-progress.json` with a mode value derived from the user's input string. The mode value is constrained to the literal strings `"full"` or `"fast"` by the surrounding control flow. No external data is interpolated into the evaluated code.
- **Excerpt**: `node -e "const fs=require('fs'),f='.forge/init-progress.json'; ..."`
- **Recommendation**: Safe as written — the mode value is resolved by the LLM to one of two allowed string literals, not from untrusted user input. No change required. (Carry-forward from v0.18.1.)

#### [INFO] commands/calibrate.md — Inline node -e for hash computation
- **Check**: B — Skill/Command file — Inline node -e pattern
- **Issue**: Two inline `node -e` snippets compute SHA-256 hashes of `MASTER_INDEX.md`. No user-supplied data is interpolated; paths are derived from `config.json` at runtime.
- **Excerpt**: `node -e "const crypto=require('crypto'),fs=require('fs'); ... console.log(crypto.createHash('sha256')..."`
- **Recommendation**: Safe as written — purely additive hash computation over known local files. No change required. (Carry-forward from v0.18.1.)

#### [INFO] init/sdlc-init.md — Plugin install instructions
- **Check**: B — Skill/Command file — `/plugin install` instructions
- **Issue**: The init workflow instructs the model to run `/plugin install <skill-name>@<marketplace>` for marketplace skills selected by the user from a whitelist defined in `forge/meta/skill-recommendations.md`. This is expected and documented SDLC-init behavior.
- **Excerpt**: `run /plugin install <skill-name>@<marketplace> for each selected skill`
- **Recommendation**: The install list is bounded to the recommendations table (well-known marketplaces: `claude-plugins-official`, `personal`). No untrusted skill names are inserted. This is the intended design. (Carry-forward from v0.18.1.)

#### [INFO] commands/health.md:173 — Hardcoded integrity hash
- **Check**: C / D — Structural / Permissions
- **Issue**: The health check embeds a hardcoded SHA-256 expected hash of `verify-integrity.cjs` as a literal string in the command markdown. This provides tamper-evidence for the verifier tool itself. The value appears as a long hex string that triggers the base64-blob scanner, but is a standard SHA-256 hex digest, not encoded executable content.
- **Excerpt**: `EXPECTED="3ec3c970dd3d7c3001f8f373bcc40556803eadd2fc2afafb14f1c232cba4cc3f"`
- **Recommendation**: This is the intended tamper-detection pattern. The hash must be kept in sync with `verify-integrity.cjs` when the file changes (the CLAUDE.md build instructions document this requirement). No security concern; informational note only. (Carry-forward from v0.18.1.)

### New in v0.19.0 — Changes vs v0.18.1

The single change from v0.18.1 to v0.19.0 is a bug fix to `tools/preflight-gate.cjs`
(commit `3576f59`): `loadWorkflowMarkdown` was previously hardcoded to scan two specific
file paths (`meta-orchestrate.md` and `meta-fix-bug.md`) that only exist in the Forge
dogfooding environment. The fix scans all `.md` files under `.forge/workflows/` using
`fs.readdirSync` and matches the correct fence-label pattern
(`` ```gates phase=<name> ``). This is a pure read-only local file system change.
No new network calls, no credential access, no eval, no persistent side effects.

Three new JSON Schema files (`collation-state.schema.json`, `event-sidecar.schema.json`,
`progress-entry.schema.json`) were added to `forge/schemas/`. These are pure declarative
JSON Schema definitions with no executable content.

### Clean Areas

- `hooks/hooks.json` — hook registrations are scoped (matcher: Write|Edit|MultiEdit for validate-write; matcher: Bash for triage-error), no unrestricted tools granted; all timeouts within bounds (10000ms, 5000ms, 5000ms)
- `hooks/triage-error.js` — PostToolUse hook reads Bash exit codes and injects informational context; no writes, no network calls, no credential access
- `hooks/validate-write.js` — PreToolUse schema enforcer; fail-open by design; reads only local schemas and tool input from stdin
- `hooks/lib/write-registry.js` — pure in-memory pattern registry; no I/O
- `hooks/__tests__/validate-write.test.js` — test harness only; no security-relevant code
- `.claude-plugin/plugin.json` — minimal manifest; `updateUrl` and `migrationsUrl` both point to `raw.githubusercontent.com/Entelligentsia/forge`; no `allowed-tools` overrides
- `tools/verify-integrity.cjs` — read-only SHA-256 file verifier; no network, no writes
- `tools/gen-integrity.cjs` — release-time manifest generator; no network, writes only to specified output path
- `tools/lib/validate.js` — pure JSON Schema validator; no I/O
- `tools/store-cli.cjs`, `tools/store.cjs` — local filesystem store operations; no network, no credential reads
- `tools/manage-config.cjs` — reads/writes only `.forge/config.json`; validated pipeline input
- `tools/collate.cjs`, `tools/validate-store.cjs`, `tools/seed-store.cjs` — local file operations only
- `tools/banners.cjs`, `tools/banners.sh` — pure display utilities; no I/O beyond stdout
- `tools/list-skills.js` — reads only `~/.claude/plugins/installed_plugins.json` and `~/.claude/skills/`; no network, no writes
- `tools/preflight-gate.cjs` — fixed to scan all `.forge/workflows/*.md` files locally; `evalPredicate` is a switch/case over schema-constrained operators, not `eval()`; pure read-only filesystem access, no network, no writes
- `tools/build-*.cjs` — build context/manifest/persona pack tools; write only to specified output paths under `.forge/`
- `tools/estimate-usage.cjs`, `tools/parse-gates.cjs`, `tools/parse-verdict.cjs` — pure computation tools
- `tools/check-structure.cjs`, `tools/ensure-ready.cjs` — read-only structural validators
- `agents/tomoshibi.md` — concierge agent with explicit guardrails; forbidden operations list is well-defined; no prompt injection patterns
- `commands/*.md` (all 15) — no prompt injection, persona hijacking, safety bypass, credential-exfiltration, or permission-escalation instructions found; `name` and `description` frontmatter fields are consistent with body content
- `skills/refresh-kb-links/SKILL.md` — writes only to agent instruction files within the project root; no credential access
- `meta/personas/*.md`, `meta/skills/*.md`, `meta/workflows/*.md`, `meta/templates/*.md` — no injection patterns; no hidden instructions; "act as" fragment in meta-architect.md (line 63) is a legitimate deployment topology reference, not a persona-hijack instruction
- `meta/tool-specs/*.md`, `meta/store-schema/*.md` — specification documents; no executable content
- `schemas/*.schema.json` (all, including the 3 new files) — standard JSON Schema definitions; no executable content
- `init/discovery/*.md`, `init/generation/*.md`, `init/sdlc-init.md`, `init/smoke-test.md` — generation orchestration; no credential reads or exfiltration targets
- `migrations.json` — migration chain data; no executable content
- `integrity.json` — tamper-evident hash manifest; no executable content
- No binary, compiled, or bytecode files found (0 `.pyc`, `.class`, `.so`, `.dylib`)
- Plugin total size: 1.5 MB (well within bounds for a skill-plus-hook plugin)
- No zero-width or invisible Unicode characters detected in any file
- No base64 blobs of suspicious length found in markdown files (SHA-256 hex digest in health.md is inert data, not encoded executable content)
- No credentials, tokens, or sensitive environment variables are read, captured, or transmitted
- No `eval()`, `base64 | bash`, or obfuscated execution patterns found anywhere
- No shell init file writes, no persistence mechanisms, no software installation commands
- No `sudo` usage in any hook or tool script

### Verdict

**SAFE TO USE**

The forge:forge v0.19.0 plugin is a well-structured, internally consistent SDLC orchestration tool. The sole code change from v0.18.1 is a targeted bug fix to `preflight-gate.cjs` that makes workflow-file scanning project-agnostic — the change is read-only, local, and introduces no new risk surface. Three new JSON Schema definition files (collation-state, event-sidecar, progress-entry) were added; these are inert declarative data. All three carry-forward warnings from prior scans remain accepted: the `/tmp` update-check cache write, the bounded `raw.githubusercontent.com` version-check GET, and the documented `FORGE_SKIP_WRITE_VALIDATION` emergency bypass. No critical findings were identified in any of the 166 files scanned.
