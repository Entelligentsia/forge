## Security Scan — forge:forge — 2026-05-02

**SHA**: 2827c2d (T11 final, plus v0.40.0 release-authoring edits) | **Installed**: n/a | **Last updated**: n/a
**Scope**: source-path `forge/forge/` | **Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary
69 manifest-tracked structural files (per `structure-manifest.json` v0.40.0) plus tools, hooks, and schemas. **0 critical | 4 warnings | 5 info**. All four warnings are pre-existing baselines from v0.31.0; no new critical findings introduced by the S13 / v0.40 surface (T02–T11).

### Findings

#### WARNING hooks/forge-permissions.js:47,51
- **Check**: A — Hook Scripts
- **Issue**: `touch` and `rmdir` patterns match any command starting with those words — the match trigger (`/^touch\s+/`, `/^rmdir\s+/`) is broader than the persisted rule (`touch .forge/*`, `rmdir .forge/*`). A `touch /tmp/x` would match and auto-approve with the `.forge/*`-scoped rule. Rule content is correct and scoped; only the match pattern is wider than necessary. Pre-existing finding (unchanged from v0.29.0 → v0.31.0 → v0.40.0).
- **Excerpt**: `{ pattern: /^touch\s+/, rule: 'touch .forge/*' }`
- **Recommendation**: Narrow patterns to `/^touch\s+\.forge\//` and `/^rmdir\s+\.forge\//`. Low urgency — the persisted rule is correctly scoped even if the match fires for non-`.forge/` paths.

#### WARNING hooks/forge-permissions.js:60-61
- **Check**: A — Hook Scripts
- **Issue**: `git push *` and `git checkout *` auto-approved permanently for any ref. Force pushes and checkout to any branch/tag are allowed without user confirmation. Pre-existing finding (unchanged).
- **Excerpt**: `{ pattern: /^git\s+push\b/, rule: 'git push *' }`
- **Recommendation**: Safe to ignore — Claude Code's own git safety layer blocks force push by default. The hook only adds an allow rule; user deny rules always take precedence.

#### WARNING hooks/check-update.js:24
- **Check**: A — Hook Scripts
- **Issue**: Cache files written to `/tmp` via `os.tmpdir()` fallback when `CLAUDE_PLUGIN_DATA` env var is unset. `/tmp` is world-writable on most Linux systems, creating symlink attack and data leak vectors. Pre-existing finding (unchanged).
- **Excerpt**: `const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');`
- **Recommendation**: Use a project-local cache directory (`.forge/cache/`) as default instead of `/tmp`. Low urgency in practice — cached data is only update-check timestamps and version strings, not sensitive content.

#### WARNING hooks/check-update.js:46-47,52,104
- **Check**: A — Hook Scripts
- **Issue**: Reads `~/.claude/settings.json` and scans `~/.claude/plugins/` directories. Pre-existing finding (unchanged).
- **Recommendation**: Safe to ignore — the access is directly justified by the hook's stated purpose: multi-plugin detection and enabled-status checking.

#### INFO hooks/post-init.cjs (new — T09)
- **Check**: A — Hook Scripts
- **Issue**: PostToolUse hook fires once at the end of a successful `/forge:init` Phase 4 and invokes `/forge:enhance --phase 1 --auto`. Uses `'use strict';`, installs `process.on('uncaughtException', () => process.exit(0))` (fail-open), writes a sentinel under `paths.cacheDir/post-init-enhancement-triggered` to prevent re-fire. Emits `enhancement-trigger` events via `store-cli.cjs emit`. No network, no credential access, no dynamic code execution; uses only `fs`, `path`, `os`, `child_process.spawn` (with explicit args, no shell).
- **Recommendation**: Safe to ignore — legitimate orchestration hook; fail-open and sentinel-gated.

#### INFO hooks/post-sprint.cjs (new — T09)
- **Check**: A — Hook Scripts
- **Issue**: PostToolUse hook fires after `collate.cjs <SPRINT_ID> --purge-events` matching the `*-S\d+` shape and invokes `/forge:enhance --phase 2`. Uses `'use strict';`, installs `process.on('uncaughtException', () => process.exit(0))`, sentinel-gated per detected sprintId. Sprint-ID shape gate ensures bug-fix invocations (`FORGE-B07`) do NOT trigger. Spawn semantics identical to post-init.cjs.
- **Recommendation**: Safe to ignore — legitimate orchestration hook with input-shape gating.

#### INFO tools/substitute-placeholders.cjs (new — T03, ~506 LoC)
- **Check**: D — Structural Anomalies
- **Issue**: Walks `forge/init/base-pack/` and writes substituted artefacts to project-scoped paths (`.claude/commands/forge/`, `.forge/personas/`, `.forge/skills/`, `.forge/workflows/`, `.forge/templates/`). `--dry-run` honoured. Uses only `fs` and `path` built-ins. No network, no credential access. `additionalProperties: false` is preserved on all schema reads. Path resolution uses `path.resolve(...)` and rejects paths that escape the project root.
- **Recommendation**: Safe to ignore — legitimate template materialiser; no runtime security surface.

#### INFO tools/manage-versions.cjs (new — T05, ~364 LoC)
- **Check**: D — Structural Anomalies
- **Issue**: Single gateway for `.forge/structure-versions.json` writes (`init`, `snapshot`, `enhance`, `migrate`, `list`). Validates input against `structure-versions.schema.json` before write. Project-scoped I/O only. Uses only `fs` and `path` built-ins.
- **Recommendation**: Safe to ignore — legitimate state-tracking tool with schema-gated writes.

#### INFO tools/build-base-pack.cjs (new in v0.31.0; unchanged in v0.40)
- **Check**: D — Structural Anomalies
- **Issue**: Development-time build tool. Operates on `forge/` source tree only; no network calls, no credential access, no dynamic code execution. Pre-existing finding from v0.31.0.
- **Recommendation**: Safe to ignore — legitimate development build script with no runtime security surface.

#### INFO meta/workflows/meta-orchestrate.md:204 (pre-existing)
- **Check**: B — Skill/Command/Context Files
- **Issue**: Persona-assignment phrasing ("You are acting as the...") in an orchestrator code block — programmatic subagent persona assignment at runtime. Pre-existing finding (unchanged).
- **Recommendation**: Safe to ignore — legitimate orchestrator role assignment.

### Previously Fixed (v0.29.0 → v0.40.0)

| Finding | Status | Fix version |
|---------|--------|-------------|
| C1: Bulk permission escalation (forge-permissions.js:170-186) | FIXED | v0.29.0 |
| C2: Unrestricted node -e/p (forge-permissions.js:36-37) | FIXED | v0.29.0 |
| C3: Unvalidated update URL (check-update.js) | FIXED | v0.29.0 |
| C4: Prototype pollution (manage-config.cjs) | FIXED | v0.29.0 |
| C5: Path traversal (store-cli.cjs cmdProgress/cmdProgressClear) | FIXED | v0.29.0 |

All five critical findings from v0.28.0 remain fixed in v0.40.0.

### New in v0.40.0 (T02–T11 surface)

| Component | LoC | Assessment |
|-----------|----:|-----------|
| `schemas/project-context.schema.json` (T02) | n/a | Clean — pure JSON schema, `additionalProperties: false` on every object |
| `schemas/structure-versions.schema.json` (T05) | n/a | Clean — pure JSON schema |
| `schemas/project-overlay.schema.json` (T05 / FR-007) | n/a | Clean — pure JSON schema |
| `tools/substitute-placeholders.cjs` (T03) | ~506 | Clean — `fs`+`path` only, project-scoped writes, `--dry-run` honoured |
| `tools/manage-versions.cjs` (T05) | ~364 | Clean — `fs`+`path` only, schema-gated writes |
| `tools/build-base-pack.cjs` (T06; v0.31 carryover) | ~851 | Clean — already cleared in v0.31.0 |
| `init/sdlc-init.md` (T04 + FR-007 fixup) | new 4-phase | Clean — no inline LLM-call exfiltration; Phase 4-1b adds idempotent substrate copy |
| `init/base-pack/` (regenerated by build-base-pack) | ~45 files | Scanned for prompt injection; zero hits across all 11 critical patterns (instructions to ignore prior rules, env var dump, external curl, etc.) |
| `meta/workflows/meta-enhance.md` (T08) | n/a | Clean — orchestrator-only audience; no exfiltration in Phase 1/2/3 routing |
| `meta/workflows/meta-migrate.md` (T10) | n/a | Clean — pre-flight gates, idempotent sentinel, archive-before-write contract |
| `commands/enhance.md` (T08) | n/a | Clean — thin dispatcher to meta-enhance.md |
| `commands/migrate.md` (T10) | n/a | Clean — thin dispatcher to meta-migrate.md |
| `hooks/post-init.cjs` (T09) | new | Clean — fail-open, sentinel-gated, no shell interpolation |
| `hooks/post-sprint.cjs` (T09) | new | Clean — fail-open, sentinel-gated, sprint-ID shape gate |
| T11 hardening of `tools/preflight-gate.cjs` (forge#72) | edited | Clean — `--workflow` selection narrowed; no new security surface |
| T11 hardening of `tools/gen-integrity.cjs` (forge#71-bug6) | edited | Clean — release-time hash regeneration; no new I/O surface |
| T11 hardening of `commands/update.md` (forge#71-bug 1–7) | edited | Clean — markdown-only, no new shell exec |
| T11 hardening of `commands/regenerate.md` (forge#71-bug4) | edited | Clean — `_fragments` directory fan-out via `fs.readdirSync`, project-scoped |

### Clean Areas (re-verified at v0.40.0)
- `tools/manage-config.cjs` — prototype pollution fix from v0.29.0 retained, no new issues
- `tools/store-cli.cjs` — path traversal guard from v0.29.0 retained, spawnSync scoped to fixed paths
- `hooks/forge-permissions.js` — bulk escalation and `node -e/p` removed; `require.main` guard present
- `hooks/check-update.js` — URL domain allowlist enforced; update URL validated before any network call
- `hooks/validate-write.js` — schema-gated write boundary, fail-open on errors
- `hooks/triage-error.js` — read-only stdin parser, no network or credential access
- `hooks/hooks.json` — no unrestricted Bash, no `bash -c` interpolation, all timeouts ≤ 10000ms
- `tools/lib/validate.js` — unchanged
- `tools/collate.cjs`, `tools/seed-store.cjs`, `tools/validate-store.cjs` — project-scoped I/O only
- `tools/build-manifest.cjs`, `tools/build-context-pack.cjs`, `tools/build-persona-pack.cjs`, `tools/build-init-context.cjs` — project-scoped writes
- `tools/list-skills.js` — env-var overrides for testing only
- `tools/banners.cjs`, `tools/banners.sh` — pure display, no I/O concerns
- `tools/parse-gates.cjs`, `tools/parse-verdict.cjs` — pure parsing
- `tools/store-query.cjs`, `tools/lib/store-query-exec.cjs` — read-only queries
- `tools/preflight-gate.cjs`, `tools/ensure-ready.cjs` — read-only
- `tools/query-logger.cjs` — project-scoped append-only log
- `schemas/` — all JSON schemas; no executable content; `additionalProperties: false` preserved
- `init/base-pack/` (regenerated) — scanned for prompt injection; zero critical hits
- `agents/store-query-validator.md`, `agents/tomoshibi.md` — no injection patterns
- All other markdown files — no prompt injection, no safety bypass, no exfiltration, no permission escalation

### Verdict

**Verdict:** SAFE TO USE

No critical findings. All five critical findings from v0.28.0 remain fixed in this release. The v0.40.0 additions (T02–T11 — `project-context.schema.json`, `structure-versions.schema.json`, `project-overlay.schema.json`, `substitute-placeholders.cjs`, `manage-versions.cjs`, `build-base-pack.cjs`, `meta-enhance.md`, `meta-migrate.md`, `enhance.md`, `migrate.md`, `post-init.cjs`, `post-sprint.cjs`, plus T11 hardening of `preflight-gate.cjs`, `gen-integrity.cjs`, `update.md`, `regenerate.md`) introduce no new critical security surface. The four remaining warnings are pre-existing (touch/rmdir pattern scope, git push/checkout breadth, /tmp cache, settings scan) and were assessed as low-risk or safe-to-ignore in prior scans. No new warnings introduced by the v0.40.0 changes.

Status: SAFE TO USE.
