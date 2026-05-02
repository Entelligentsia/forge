## Security Scan — forge:forge — 2026-05-02

**SHA**: 977e3c9 (read-side collate patch + pricing.cjs, v0.40.1 release metadata) | **Installed**: n/a | **Last updated**: n/a
**Scope**: source-path `forge/forge/` | **Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary
284 files scanned (2.5M) — **0 critical | 4 warnings | 5 info**. All four warnings are carry-forward baselines from v0.31.0 / v0.40.0; no new critical findings introduced by the v0.40.1 surface (pricing.cjs, collate.cjs read-side patch). The two new files introduced in v0.40.1 (tools/lib/pricing.cjs and updated tools/collate.cjs) are reviewed and found clean — no network calls, no credential access, no dynamic code execution.

### Findings

#### WARNING hooks/forge-permissions.js:47,51
- **Check**: A — Hook Scripts
- **Issue**: `touch` and `rmdir` patterns match any command starting with those words — the match trigger (`/^touch\s+/`, `/^rmdir\s+/`) is broader than the persisted rule (`touch .forge/*`, `rmdir .forge/*`). A `touch /tmp/x` would match and auto-approve with the `.forge/*`-scoped rule. Rule content is correct and scoped; only the match pattern is wider than necessary. Pre-existing finding (unchanged from v0.29.0 → v0.31.0 → v0.40.0 → v0.40.1).
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

#### INFO tools/lib/pricing.cjs (new — v0.40.1)
- **Check**: D — Structural Anomalies
- **Issue**: New pure library module (166 LoC) exporting `MODEL_PRICING`, `canonicalizeModel`, and `computeCost`. Contains only in-memory data (Anthropic published pricing rates as constants) and pure functions. No network calls, no credential access, no filesystem I/O, no dynamic code execution. Uses only Node.js built-ins. Module is `'use strict'` with no `process.exit` calls (no CLI surface). 29 tests in `tools/__tests__/pricing.test.cjs`.
- **Recommendation**: Safe to ignore — clean pure library with no runtime security surface.

#### INFO tools/collate.cjs (updated — v0.40.1 read-side patch)
- **Check**: D — Structural Anomalies
- **Issue**: Three changes introduced in v0.40.1: (1) `mergeSidecarEvents` deduplicates sidecar events by `eventId` before merging; (2) an Ingestion Quality (IQ) section is appended to `COST_REPORT.md` listing missing/malformed sidecar events; (3) cost is recomputed from canonical model via `pricing.cjs` rather than trusting potentially-stale sidecar `estimatedCostUSD`. All changes are read-side filesystem operations only. No network calls added. The new `canonicalizeModel` call is pure (no I/O). IQ section writes only to the already-authorized output file (`COST_REPORT.md`). No new filesystem paths accessed.
- **Recommendation**: Safe to ignore — read-side reporting enhancement; no new security surface introduced.

#### INFO hooks/post-init.cjs (carry-forward — T09)
- **Check**: A — Hook Scripts
- **Issue**: PostToolUse hook fires once at the end of a successful `/forge:init` Phase 4 and invokes `/forge:enhance --phase 1 --auto`. Uses `'use strict';`, installs `process.on('uncaughtException', () => process.exit(0))` (fail-open), sentinel-gated. Emits `enhancement-trigger` events via `store-cli.cjs emit`. No network, no credential access, no dynamic code execution. Unchanged from v0.40.0.
- **Recommendation**: Safe to ignore — legitimate orchestration hook; fail-open and sentinel-gated.

#### INFO hooks/post-sprint.cjs (carry-forward — T09)
- **Check**: A — Hook Scripts
- **Issue**: PostToolUse hook fires after `collate.cjs <SPRINT_ID> --purge-events` matching the `*-S\d+` shape and invokes `/forge:enhance --phase 2`. Sprint-ID shape gate ensures bug-fix invocations do NOT trigger. Sentinel-gated per sprint. Unchanged from v0.40.0.
- **Recommendation**: Safe to ignore — legitimate orchestration hook with input-shape gating.

#### INFO meta/workflows/meta-orchestrate.md (carry-forward)
- **Check**: B — Skill/Command/Context Files
- **Issue**: Large file (>500 lines). No prompt injection patterns, no exfiltration instructions, no persona hijacking, no hidden instructions after final `---`. Unchanged from v0.40.0. Flagged for depth only.
- **Recommendation**: Safe to ignore — complexity is inherent to orchestration workflow specification.

### Clean Areas
- `commands/` — 21 command files: no prompt injection, no credential reads, no exfiltration instructions, no zero-width Unicode, no base64 blobs
- `agents/` — 2 agent files: clean
- `skills/` — 4 skill files: clean
- `hooks/validate-write.js` — schema-enforcement hook: no network calls, no credential reads, fail-open
- `hooks/triage-error.js` — error-triage hook: no network calls, clean stderr-only output
- `hooks/forge-permissions.js` — permission auto-approver: no bulk-rule escalation (fixed in v0.28.1), clean
- `tools/lib/pricing.cjs` — new v0.40.1 file: pure library, no I/O, no network, clean
- `schemas/` — 12 schema files: clean JSON Schema definitions, no executable content
- `init/base-pack/` — base-pack templates: no prompt injection found, all placeholder-based
- `.claude-plugin/plugin.json` — version 0.40.1, correct update/migrations URLs pointing at `raw.githubusercontent.com`
- No binary files, no compiled artifacts, no misleading extensions found
- Plugin size (2.5M) is proportionate for an SDLC orchestration plugin of this scope

### Verdict

**SAFE TO USE**

No new security findings in v0.40.1. The two modified files (`tools/lib/pricing.cjs`, `tools/collate.cjs`) are read-side-only enhancements with no network calls, no credential access, and no dynamic code execution. All four pre-existing warnings are low-urgency carry-forwards from v0.31.0 and remain unchanged. The integrity verifier hash in `commands/health.md` matches the on-disk `tools/verify-integrity.cjs` (`3ec3c970dd3d7c3001f8f373bcc40556803eadd2fc2afafb14f1c232cba4cc3f`).
