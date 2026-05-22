# Security Scan — forge:forge — 2026-05-22

**SHA**: c18166a (working tree, post v0.46.1 build commit)
**Installed**: n/a (source-path scan against working tree at `/home/boni/src/forge-engineering/forge/forge/`)
**Last updated**: 2026-05-22
**Scope**: source-path
**Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary

320 files scanned (3.2 MB) | **0 critical** | **0 warnings** | **3 info**

Delta from v0.45.0 → v0.46.1 (release-relevant code surface):

| Path | Change | Lines | Lifecycle |
|---|---|---|---|
| `forge/tools/replay-scoring.cjs` | new | ~110 | pure helper (T04 cross-task recurrence) |
| `forge/tools/proposal-normalize.cjs` | new | ~70 | pure helper (T02 back-compat for legacy proposals) |
| `forge/tools/delete-candidate-detector.cjs` | new | ~120 | pure helper (T05 zero-use detector) |
| `forge/tools/judge-proposal.cjs` | new | ~140 | pure helper (T03 LLM-judge rubric scorer) |
| `forge/tools/compression-gate.cjs` | new | ~170 | pure helper (T06 >20% growth gate) |
| `forge/tools/queue-drain.cjs` | new | ~190 | helper + one fs write under `.forge/enhancement-proposals/queue/` (T07 append-only queue) |
| `forge/schemas/event.schema.json` | modified | +30 | `skill_usage` event variant added via conditional `allOf` |
| `forge/schemas/proposal.schema.json` | new | ~80 | three-op classification + recurrence fields |
| `forge/meta/workflows/meta-enhance.md` | rewritten | +320 net | Phase 2 pipeline: queue drain → recurrence → delete-candidate → compression gate → judge |
| `forge/init/base-pack/workflows/enhance.md` | regenerated | +320 net | derived from meta source above (v0.46.1 patch fix) |
| `forge/init/base-pack/personas/supervisor.md` | minor edit | small | text fix |
| `forge/commands/regenerate.md` | minor edit | small | wording update |
| `forge/tools/build-persona-pack.cjs` + `manage-versions.cjs` | minor edits | small | pre-existing tools, additive changes |
| `forge/tools/__tests__/*` | +8 new files | ~3000 | test coverage for the 5 new helpers + schema + persona pack |

### Findings

#### [INFO] `forge/tools/queue-drain.cjs`:106
- **Check**: A (file write outside `.forge/`)
- **Issue**: `fs.writeFileSync(target, JSON.stringify(proposals, null, 2), 'utf8')` writes a JSON payload to disk.
- **Excerpt**:
  ```
  if (fs.existsSync(target)) {
    throw new Error(`appendToQueue: queue file already exists at ${target} (queue is append-only; choose a fresh ts).`);
  }
  fs.writeFileSync(target, JSON.stringify(proposals, null, 2), 'utf8');
  ```
- **Recommendation**: False positive. `target` is computed by `queuePathFor({queueRoot, sprintId, taskId, ts})` and is constrained to `.forge/enhancement-proposals/queue/<sprintId>/<taskId>-<ts>.json`. The append-only invariant is enforced by an `existsSync` guard that throws before any write to an existing path. Inputs are validated via `TypeError` guards at the top of every public entry. No path traversal possible because `sprintId`/`taskId`/`ts` are joined via `path.join` and never as raw string concatenation.

#### [INFO] `forge/commands/health.md`:173
- **Check**: B (long base64-looking blob)
- **Issue**: 64-char hex blob (`3ec3c970dd3d7c3001f8f373bcc40556803eadd2fc2afafb14f1c232cba4cc3f`) matches the `[A-Za-z0-9+/=]{40,}` warning pattern.
- **Recommendation**: False positive (carried over from v0.45.0 scan, hash value updated for current verify-integrity.cjs). SHA-256 of `verify-integrity.cjs` per the documented Gate-4 health-hash check.

#### [INFO] `forge/tools/__tests__/*` and `forge/hooks/__tests__/*`
- **Check**: A (network calls / credential paths)
- **Issue**: Test fixtures reference `https://evil.com`, `https://example.com`, JSON schema URLs, and `CLAUDE_PLUGIN_*` env vars — negative-match tests validating the permissions hook blocks such calls.
- **Recommendation**: False positive (carried over from v0.45.0 scan).

### Clean Areas

#### Check A — Hooks & tools (runtime code)

- **5 new SKILL-CURATION helpers** (compression-gate, delete-candidate-detector, judge-proposal, proposal-normalize, queue-drain, replay-scoring): zero hits on `eval` / `new Function` / `child_process` / `spawnSync` / `execSync`. No network calls. No reads of `.ssh` / `.aws` / `.gnupg` / `.netrc` / `.env`. No writes to shell init files. No env-var reads for credential-suggestive names (`TOKEN`/`SECRET`/`KEY`/`PASSWORD`/`PASS`/`CREDENTIAL`/`AUTH`/`API_KEY`). All `require()` calls are static `node:fs`/`node:path`/`node:crypto`; no dynamic require, no path-traversal patterns.
- **Hook scripts** (check-update.js, validate-write.js, triage-error.js, forge-permissions.js, post-init.cjs, post-sprint.cjs): unchanged since v0.45.0 — no re-review required.

#### Check B — Skill, command, and context files

- **`meta/workflows/meta-enhance.md` rewrite + regenerated `base-pack/workflows/enhance.md`** (320-line additions): zero prompt-injection phrases. No persona-hijacking ("you are now…", "act as a different…"). No safety-bypass language. No exfiltration verbs (the only `process.env` reads are `FORGE_SPRINT_ID`, `FORGE_TASK_ID`, `PROJECT_ROOT` — all Forge-internal orchestrator vars, not credentials). No invisible Unicode (U+200B / U+FEFF / U+200C / U+200D / U+00AD). No base64-looking blobs. Frontmatter declares `audience: orchestrator-only` and `deps.skills: [engineer, generic]` — coherent with workflow content. Eight `---` horizontal rules used as section separators (typical for long workflows); no content past the final section.
- **`init/base-pack/personas/supervisor.md`** minor edit and **`commands/regenerate.md`** wording update: both inspected, no instructions hijacking the agent or asking for credential/permission access.

#### Check C — Permissions

- **`hooks/hooks.json`** unchanged from v0.45.0 baseline. All hook commands invoked via `node "${CLAUDE_PLUGIN_ROOT}/..."` (argv-style; no `bash -c "$VAR"` interpolation). Timeouts: 3–10 s, all well under the 30 s warning threshold. Matchers scoped to legitimate Forge tool surfaces (`Write|Edit|MultiEdit`, `Bash`, `PermissionRequest` on `Bash|Write|Edit|MultiEdit|WebFetch`).
- **`plugin.json`** declares no `allowedTools`, no `permissions` block — the plugin relies on the hook chain for write-boundary enforcement rather than blanket grants.

#### Check D — Structural

- **No binaries.** No `.pyc` / `.class` / `.so` / `.dylib` / `.dll` / `.exe` / `.jar`.
- **No mismatched-extension files.** All `*.json` files validate as JSON.
- **Total size**: 3.2 MB across 320 files. Largest entries are `migrations.json` (114 KB — 47 release entries, justified) and `store-cli.cjs` (58 KB — flagship store gateway). Tests are the next-largest stratum, expected for a project with 1437 tests.
- **No git-history rotation anomalies** — version bump 0.46.0 → 0.46.1 ships with one matching content commit (c18166a).

### Verdict

**SAFE TO USE**

The v0.45.0 → v0.46.1 delta is overwhelmingly pure-function additions: five new `.cjs` helpers, none of which call exec/eval/spawn/network/credentials, plus a meta workflow rewrite and its regenerated base-pack copy. The single fs-write site (`queue-drain.cjs:106`) is path-constrained and append-only by explicit guard. The two schema changes (event variant + new proposal schema) are additive and strict (`additionalProperties: false` everywhere). No prompt-injection vectors, no invisible Unicode, no permission expansions. Three INFO items carry over from v0.45.0 (queue-drain's expected fs write, the health-hash hex blob, negative-test fixtures); none are actionable.
