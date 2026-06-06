## Security Scan — forge:forge — 2026-06-06

**SHA**: pending (v1.2.21 release commit) | **Installed**: n/a (in-tree source scan) | **Last updated**: 2026-06-06
**Scope**: source — `forge/forge/` (plugin payload) | **Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary
395 files scanned (delta vs v1.2.18 full-tree baseline, same day) | 0 critical | 0 warnings | 2 info (carried)

### Scan basis

v1.2.21 is a small hardening delta inside the already line-reviewed
`tools/commit-task.cjs` (see scan-v1.2.20.md) plus prose:

- `commit-task.cjs`: adds `git check-ignore -q -- <path>` per staging-set
  entry (argv-array spawn, same constraints as the rest of the tool) and a
  no-op success path that reuses the existing store-cli transition spawn. No
  new capability, no network, no new process classes. Delta dangerous-token
  sweep: zero matches.
- `meta-commit.md` — prose only (forge_commit primary surface, no-op
  semantics). Tests + packaging + regenerated manifests.

### Findings

Both v1.2.18 INFO items carry over unchanged.

### Verdict

**SAFE TO USE**
