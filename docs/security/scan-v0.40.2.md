## Security Scan — forge:forge — 2026-05-05

**SHA**: 9da9d77 (v0.40.2 hotfix bundle: T03/T04/T05 patches, v0.40.2 release metadata) | **Installed**: n/a | **Last updated**: n/a
**Scope**: source-path `forge/forge/` | **Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary
290 files scanned (2.6M) — **0 critical | 4 warnings | 5 info**. All four warnings are carry-forward baselines from v0.31.0 / v0.40.0 / v0.40.1; no new critical findings introduced by the v0.40.2 surface. The six new/modified files in v0.40.2 (tools/lib/forge-root.cjs, tools/lib/paths.cjs, plus patches to manage-versions.cjs, manage-config.cjs, substitute-placeholders.cjs, check-structure.cjs, build-persona-pack.cjs, build-context-pack.cjs, build-overlay.cjs, check-update.js, plus command/workflow markdown patches) are reviewed and found clean — no new network calls, no credential access, no dynamic code execution beyond what existed in v0.40.1.

### Findings

#### WARNING hooks/forge-permissions.js:47,51
- **Check**: A — Hook Scripts
- **Issue**: `touch` and `rmdir` patterns match any command starting with those words — the match trigger (`/^touch\s+/`, `/^rmdir\s+/`) is broader than the persisted rule (`touch .forge/*`, `rmdir .forge/*`). A `touch /tmp/x` would match and auto-approve with the `.forge/*`-scoped rule. Rule content is correct and scoped; only the match pattern is wider than necessary. Pre-existing finding (unchanged from v0.29.0 → v0.31.0 → v0.40.0 → v0.40.1 → v0.40.2).
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

#### INFO tools/lib/forge-root.cjs (new — v0.40.2)
- **Check**: D — Structural Anomalies
- **Issue**: New pure library module (58 LoC) exporting `resolveForgeRoot`. Contains only path resolution logic with `fs.existsSync` for validating `plugin.json` existence, and `path.resolve`/`path.join` for path construction. `'use strict'` mode. No CLI surface (`require.main === module` block absent). No `process.exit` calls. No network calls, no credential access, no dynamic code execution. Uses only Node.js built-ins (`fs`, `path`).
- **Recommendation**: Safe to ignore — clean pure library with no runtime security surface.

#### INFO tools/lib/paths.cjs (new — v0.40.2)
- **Check**: D — Structural Anomalies
- **Issue**: New pure library module (28 LoC) exporting `getCommandsSubdir`. Contains a single function that lowercases a string argument. `'use strict'` mode. No CLI surface. No I/O, no network, no filesystem access, no dynamic code execution.
- **Recommendation**: Safe to ignore — clean pure library with zero security surface.

#### INFO tools/manage-versions.cjs (updated — v0.40.2, FR-001/FR-013)
- **Check**: D — Structural Anomalies
- **Issue**: Three changes introduced in v0.40.2: (1) `resolveForgeRoot` now uses the 3-tier priority resolution from `tools/lib/forge-root.cjs` (env var, `__dirname/..`, actionable error) instead of the previous 2-tier approach; (2) `--source` flag added to allow specifying a snapshot source explicitly; (3) zero-retry idempotent init for `check-update-cache.json`. All changes are local filesystem operations. No new network calls, credential access, or dynamic code execution.
- **Recommendation**: Safe to ignore — improved path resolution robustness; no new security surface.

#### INFO hooks/check-update.js (updated — v0.40.2, FR-002/FR-010/FR-014)
- **Check**: A — Hook Scripts
- **Issue**: Three changes introduced in v0.40.2: (1) `updateStatus`, `pendingReason`, and `pendingMigrations` fields added to cache writes (FR-002 completion semantics); (2) `forgeRef` field added to project cache sync (FR-010 portability); (3) idempotent cache write logic (FR-014). All changes are local filesystem operations (JSON read/write to project-local `.forge/` directory). No new network calls, credential access, or dynamic code execution. Pre-existing warnings unchanged.
- **Recommendation**: Safe to ignore — state-tracking enhancements with no new security surface.

### Clean Areas
- `commands/` — 21 command files: no prompt injection, no credential reads, no exfiltration instructions, no zero-width Unicode, no base64 blobs
- `agents/` — 2 agent files: clean
- `skills/` — 4 skill files: clean
- `hooks/validate-write.js` — schema-enforcement hook: no network calls, no credential reads, fail-open
- `hooks/triage-error.js` — error-triage hook: no network calls, clean stderr-only output
- `hooks/forge-permissions.js` — permission auto-approver: no bulk-rule escalation (fixed in v0.28.1), carry-forward warnings only
- `tools/lib/pricing.cjs` — carry-forward from v0.40.1: pure library, no I/O, no network, clean
- `tools/lib/forge-root.cjs` — new v0.40.2 file: pure library, no I/O surface beyond `fs.existsSync`, clean
- `tools/lib/paths.cjs` — new v0.40.2 file: pure library, zero I/O, clean
- `schemas/` — 13 schema files: clean JSON Schema definitions, no executable content
- `init/base-pack/` — base-pack templates: no prompt injection found, all placeholder-based
- `.claude-plugin/plugin.json` — version 0.40.2, correct update/migrations URLs pointing at `raw.githubusercontent.com`
- No binary files, no compiled artifacts, no misleading extensions found
- Plugin size (2.6M) is proportionate for an SDLC orchestration plugin of this scope

### Verdict

**SAFE TO USE**

No new security findings in v0.40.2. The two new shared libraries (`forge-root.cjs`, `paths.cjs`) are pure utility modules with no I/O surface beyond `fs.existsSync`. The patches to `manage-versions.cjs`, `manage-config.cjs`, `substitute-placeholders.cjs`, `check-structure.cjs`, `build-persona-pack.cjs`, `build-context-pack.cjs`, `build-overlay.cjs`, and `check-update.js` are all local filesystem and path-resolution improvements with no network calls, no credential access, and no dynamic code execution. All four pre-existing warnings are low-urgency carry-forwards from v0.31.0 and remain unchanged. The integrity verifier hash in `commands/health.md` matches the on-disk `tools/verify-integrity.cjs`.