## Security Scan — forge:forge — 2026-06-06

**SHA**: pending (v1.2.20 release commit) | **Installed**: n/a (in-tree source scan) | **Last updated**: 2026-06-06
**Scope**: source — `forge/forge/` (plugin payload) | **Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary
395 files scanned (delta vs v1.2.18 full-tree baseline, same day) | 0 critical | 0 warnings | 2 info (carried)

### Scan basis

v1.2.20 adds one new tool plus prompt/schema changes (forge-engineering#40).
Delta (12 files, +162/−94) on top of the same-day v1.2.18 full-tree sweep:

- **NEW `tools/commit-task.cjs`** (~190 lines) — deterministic commit
  choreography. Reviewed line-by-line:
  - Spawns only `git` and sibling `.cjs` scripts (`preflight-gate.cjs`,
    `store-cli.cjs`) via `spawnSync` **argv arrays** — no shell-string
    interpolation anywhere.
  - No network, no `eval`, no credential-path access, no env-secret reads.
  - Path containment: every staged path (record path, provenance, `--also`)
    is resolved and rejected if it escapes the project root.
  - Commit-boundary guard refuses to sweep a pre-populated index.
  - `--force` is operator-gated transitively (store-cli `FORGE_ALLOW_FORCE`).
  - `--dry-run` honored before any write; `'use strict'`; top-level
    try/catch → exit 1. Dangerous-token sweep over the file: zero matches.
- `tools/store-cli.cjs` — one declared schema property added
  (`files_changed`, string array ≤100); no logic change.
- `meta/workflows/meta-commit.md` (rewritten around the tool) and
  `meta-implement.md` (provenance instruction) — prose only; the generated
  `commit_task.md` SHRANK 5.2KB → 3.9KB.
- Tests (`commit-task.test.cjs` new, `store-cli.test.cjs` extended),
  packaging (`plugin.json`/`migrations.json`/`CHANGELOG.md`), regenerated
  manifests/integrity.

### Findings

Both v1.2.18 INFO items carry over unchanged (documented update poll in
`hooks/check-update.cjs:65`; pinned verify-integrity sha256 in
`commands/health.md:200`).

### Clean Areas
- `tools/commit-task.cjs` — see basis above; the tool *narrows* the commit
  attack surface (the LLM can no longer improvise `git` invocations in the
  commit phase; the prompt forbids manual `git add`/`commit`/`reset`).
- Everything else — unchanged from the v1.2.18/19 baselines.

### Verdict

**SAFE TO USE**

The release replaces free-form LLM git choreography with a constrained,
path-validated, operator-gated tool — a net security improvement.
