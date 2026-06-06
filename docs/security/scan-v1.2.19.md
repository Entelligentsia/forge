## Security Scan — forge:forge — 2026-06-06

**SHA**: pending (v1.2.19 release commit) | **Installed**: n/a (in-tree source scan) | **Last updated**: 2026-06-06
**Scope**: source — `forge/forge/` (plugin payload) | **Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary
394 files scanned (delta vs v1.2.18 full-tree baseline, same day) | 0 critical | 0 warnings | 2 info (carried)

### Scan basis

v1.2.19 is a prompt-text + one-literal change confined to the two JS workflow
drivers, on top of the v1.2.18 full-tree sweep performed earlier the same day
(`scan-v1.2.18.md`). Delta (9 files, +125/−9):

- `init/base-pack/workflows-js/wfl-run-task.js` / `wfl-fix-bug.js` —
  `TASK_TYPE_TOKENS` / `BUG_TYPE_TOKENS` constant maps (string literals only)
  and additional emit-instruction prose lines (type-token guidance);
  `emitSkip()` iteration literal 0→1. No new process invocation, no network,
  no filesystem access, no capability change. The dangerous-token sweep over
  the delta (curl/wget/url/eval/base64/ssh/env-secret/chmod/sudo) matched
  only the `*_TYPE_TOKENS` identifier names — benign.
- Tests: new `wfl-run-task-events.test.cjs`, extended
  `wfl-fix-bug-events.test.cjs` (string-invariant assertions, node:test +
  node --check only).
- Packaging: `plugin.json`/`migrations.json`/`CHANGELOG.md`, regenerated
  `structure-manifest.json`/`enum-catalog.json`/`integrity.json`.

### Findings

Both v1.2.18 INFO items carry over unchanged (documented update poll in
`hooks/check-update.cjs:65`; pinned sha256 in `commands/health.md:200` —
hash re-verified against the unmodified `verify-integrity.cjs`).

### Clean Areas
- The two modified drivers — instruction prose and string-literal maps only;
  drivers retain zero Node-API/filesystem access in their bodies.
- Everything else — unchanged from the v1.2.18 full-tree sweep baseline.

### Verdict

**SAFE TO USE**

Prompt-text discipline change; nothing executable was added.
