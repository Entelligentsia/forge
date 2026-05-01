## Security Scan — forge:forge — 2026-05-01

**SHA**: db4bd7c (source scan, forge-engineering repo) | **Installed**: n/a | **Last updated**: n/a
**Scope**: source-path `forge/forge/` | **Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary
269 files scanned | 0 critical | 4 warnings | 3 info

### Findings

#### WARNING hooks/forge-permissions.js:47,51
- **Check**: A — Hook Scripts
- **Issue**: `touch` and `rmdir` patterns match any command starting with those words — the match trigger (`/^touch\s+/`, `/^rmdir\s+/`) is broader than the persisted rule (`touch .forge/*`, `rmdir .forge/*`). A `touch /tmp/x` would match and auto-approve with the `.forge/*`-scoped rule. Rule content is correct and scoped; only the match pattern is wider than necessary. Pre-existing finding (unchanged from v0.29.0).
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

#### INFO tools/build-base-pack.cjs (new — 808 lines)
- **Check**: D — Structural Anomalies
- **Issue**: New development-time build tool added in this version. Operates on `forge/` source tree only; no network calls, no credential access, no dynamic code execution. Requires only `fs` and `path` built-ins. Reads from meta-sources and writes to `init/base-pack/` within the plugin directory.
- **Recommendation**: Safe to ignore — legitimate development build script with no runtime security surface.

#### INFO meta/workflows/meta-orchestrate.md:204
- **Check**: B — Skill/Command/Context Files
- **Issue**: Persona-assignment phrasing ("You are acting as the...") in an orchestrator code block — programmatic subagent persona assignment at runtime. Pre-existing finding (unchanged).
- **Recommendation**: Safe to ignore — this is the legitimate mechanism by which the orchestrator assigns roles to generated subagents. Scoped to structured workflow code, not freeform instruction injection.

#### INFO commands/update.md (1093 lines), init/sdlc-init.md (921 lines), meta/workflows/meta-orchestrate.md (928 lines)
- **Check**: B — Skill/Command/Context Files
- **Issue**: Files exceed 500 lines. Long files can bury instructions deep. Tails and midpoints of all three were inspected — no hidden instructions found after apparent document endings. Pre-existing finding (unchanged).
- **Recommendation**: Safe to ignore — legitimate complex workflow and command specifications.

### Previously Fixed (v0.29.0 → v0.31.0)

| Finding | Status | Fix |
|---------|--------|-----|
| C1: Bulk permission escalation (forge-permissions.js:170-186) | FIXED in v0.29.0 | Only matched rule persisted |
| C2: Unrestricted node -e/p (forge-permissions.js:36-37) | FIXED in v0.29.0 | Patterns removed entirely |
| C3: Unvalidated update URL (check-update.js) | FIXED in v0.29.0 | Domain allowlist added |
| C4: Prototype pollution (manage-config.cjs) | FIXED in v0.29.0 | Dangerous key guard added |
| C5: Path traversal (store-cli.cjs cmdProgress/cmdProgressClear) | FIXED in v0.29.0 | `_resolveEventsDir` guard added |

### New in v0.31.0

| Component | Assessment |
|-----------|-----------|
| `tools/build-base-pack.cjs` | Clean — no network, no credential access, `fs`+`path` only |
| `tools/build-base-pack-rules.json` | Clean — static rule data, no executable content |
| `tools/build-base-pack.test.cjs` | Clean — test file, no production security surface |
| `tools/placeholder-coverage.test.cjs` | Clean — test file |
| `schemas/project-context.schema.json` | Clean — pure JSON schema, no executable content |
| `schemas/project-overlay.schema.json` | Clean — pure JSON schema |
| Regenerated `init/base-pack/` (45 files) | Scanned for prompt injection — zero hits on all critical patterns |

### Clean Areas
- `tools/manage-config.cjs` — prototype pollution fixed (v0.29.0), no new issues
- `tools/store-cli.cjs` — path traversal fixed (v0.29.0), spawnSync scoped to fixed `store-query.cjs` path
- `hooks/forge-permissions.js` — bulk escalation and node -e/p removed; `require.main` guard present
- `hooks/check-update.js` — URL domain allowlist enforced; update URL validated before any network call
- `hooks/validate-write.js` — no issues; schema-gated write boundary, fail-open on errors
- `hooks/triage-error.js` — no issues; read-only stdin parser, no network or credential access
- `hooks/hooks.json` — no unrestricted Bash, no `bash -c` interpolation, all timeouts ≤ 10000ms
- `tools/lib/validate.js` — no issues (unchanged)
- `tools/collate.cjs` — project-scoped I/O only
- `tools/seed-store.cjs` — project-scoped I/O only
- `tools/validate-store.cjs` — read-only validation
- `tools/store.cjs` — project-scoped I/O, path traversal guard present
- `tools/build-manifest.cjs` — project-scoped writes
- `tools/build-context-pack.cjs` — project-scoped writes
- `tools/build-persona-pack.cjs` — project-scoped writes
- `tools/build-init-context.cjs` — CLI path args used as-is (pre-existing advisory)
- `tools/list-skills.js` — env var overrides for testing only; no security-sensitive I/O
- `tools/build-base-pack.cjs` — new, clean; `fs`+`path` built-ins only, no network
- `tools/banners.cjs` / `tools/banners.sh` — pure display, no I/O concerns
- `tools/parse-gates.cjs` / `tools/parse-verdict.cjs` — pure parsing
- `tools/store-query.cjs` / `tools/lib/store-query-exec.cjs` — read-only queries
- `tools/preflight-gate.cjs` / `tools/ensure-ready.cjs` — read-only
- `tools/query-logger.cjs` — project-scoped append-only log
- `schemas/` — all JSON schemas, no executable content
- `init/base-pack/` (45 regenerated files) — scanned for prompt injection; zero critical hits
- `agents/store-query-validator.md`, `agents/tomoshibi.md` — no injection patterns
- All other markdown files — no prompt injection, no safety bypass, no exfiltration, no permission escalation

### Verdict

**SAFE TO USE**

No critical findings. All five critical findings from v0.28.0 remain fixed in this release. The v0.31.0 additions (`build-base-pack.cjs`, project-context schema, regenerated base-pack) introduce no new security surface. The four remaining warnings are pre-existing (touch/rmdir pattern scope, git push/checkout breadth, /tmp cache, settings scan) and were assessed as low-risk or safe-to-ignore in prior scans. No new warnings introduced by the v0.31.0 changes.
