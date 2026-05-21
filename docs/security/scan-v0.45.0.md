# Security Scan — forge:forge — 2026-05-21

**SHA**: not recorded (source-path scan against working tree at `/home/boni/src/forge-engineering/forge/forge/`)
**Installed**: n/a (scanning source, not installed plugin cache)
**Last updated**: 2026-05-21
**Scope**: source-path
**Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary

306 files scanned | **0 critical** | **0 warnings** | **2 info**

Delta from v0.44.10 → v0.45.0:
- `forge/tools/manage-versions.cjs` — new `replaySnapshots` function + `replay` subcommand. Pure FS operation (reads `.forge/structure-versions.json`, copies files from `.forge/archive/snap-N/` back to `.forge/`). No network calls, no shell exec, no eval, no credential paths.
- `forge/tools/__tests__/manage-versions.test.cjs` — 7 new tests covering replay scenarios.
- `forge/commands/regenerate.md` — each of personas/skills/workflows/templates categories now invokes `manage-versions replay` after subagent generation and before manifest record.
- `forge/.claude-plugin/plugin.json` — version bump.
- `forge/migrations.json` — new top entry.
- `CHANGELOG.md` — feature section.
- `forge/integrity.json` — re-generated.

### Findings

#### [INFO] `forge/commands/health.md`:173
- **Check**: B (long base64-looking blob)
- **Issue**: 64-char hex blob matches the `[A-Za-z0-9+/=]{40,}` warning pattern.
- **Recommendation**: False positive. SHA-256 of `verify-integrity.cjs`, required and verified each release.

#### [INFO] `forge/tools/__tests__/*` and `forge/hooks/__tests__/*`
- **Check**: A (network calls / credential paths)
- **Issue**: Test fixtures reference `https://evil.com`, `https://example.com`, JSON schema URLs, and `CLAUDE_PLUGIN_*` env vars — negative-match tests validating the permissions hook blocks such calls.
- **Recommendation**: False positives.

### Clean Areas

- **Check A (hooks + tools, runtime code)**: zero new hits. The `replay` implementation reads `structure-versions.json` (project-internal JSON), walks file paths within `.forge/`, and uses `fs.copyFileSync` / `fs.existsSync`. No spawn/exec/network/eval. The path normalization regex (`normalizeRel`) operates only on path-like strings already trusted from the project's own snapshot manifest.
- **Check B (markdown)**: `regenerate.md` gains four `manage-versions replay` invocations and the `replay` CLI documentation. No prompt-injection phrases, no zero-width chars, no suspicious frontmatter changes.
- **Check C (permissions)**: unchanged from v0.44.10.
- **Check D (structure)**: unchanged: 306 files, ~3.0 MB, no compiled artifacts.

### Verdict

**SAFE TO USE**

Feature release adding a snapshot-replay subcommand and its integration into regenerate. All operations are confined to the project's own `.forge/` tree. No new attack surface — `replay` reads internal manifest data and copies files within the project; the path it can write to is bounded by `.forge/structure-versions.json`'s `archivePath` field, which is itself constrained by `add-snapshot` to `.forge/archive/snap-N` (incrementing index, project-internal).
