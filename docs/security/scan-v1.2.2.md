## Security Scan — forge:forge — 2026-06-02

**SHA**: pending (v1.2.2 release commit) | **Installed**: n/a (in-tree source scan) | **Last updated**: 2026-06-02
**Scope**: source — `forge/forge/` (plugin payload) | **Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary
401 files scanned | 0 critical | 0 warnings | 1 info

### Scan basis

v1.2.2 fixes three orchestration-logic edge-case bugs in two packaged JS workflow
drivers. The delta versus v1.2.1 is control-flow/comment edits only:

- `init/base-pack/workflows-js/wfl-run-sprint.js` — `terminal` now short-circuits on `child.skipped`; the retry drops the unhonored `resumeFrom` arg. No new calls.
- `init/base-pack/workflows-js/wfl-fix-bug.js` — adds a null guard + early escalate-return on the finalize dispatch.
- `workflows-js-drift.test.cjs` — three text-contract regression tests.
- `plugin.json` / `migrations.json` / `CHANGELOG.md` — version + migration metadata.
- Regenerated `structure-manifest.json` / `enum-catalog.json` / `integrity.json`.

### Findings

#### [INFO] control-flow-only edits — no new surface
- **Check**: A — workflow driver scripts
- **Issue**: The edits change boolean/branch logic and add a guarded early
  return. No new network, `eval`/`exec`/`child_process`/`require`, credential,
  or environment access. The grep matches for "exec"/"spawn" in the diff are the
  English words "executed" and "Re-spawn" inside comments, not code. All IO
  remains delegated to subagents via prompt strings.
- **Excerpt**: `const terminal = child.skipped || TERMINAL_OK_SET.has(status)`
- **Recommendation**: Safe. Pure orchestration-correctness fixes.

### Clean Areas
- `forge/hooks/`, `forge/commands/`, `forge/skills/`, `forge/personas/` — unchanged from the v1.2.1 baseline; no network, credential, eval, or injection patterns.
- `forge/init/base-pack/workflows-js/` — three JS drivers; no Node-API or filesystem access in driver bodies; meta contract uniform; orchestration-logic guards added.
- Generated `schemas/*.json` — deterministic regenerated manifests; integrity verified (29 hashed assets unmodified).

### Verdict

**SAFE TO USE**

v1.2.2 is a control-flow correctness fix to two workflow drivers plus regression
tests. No new external surface, no injection vectors, no permission escalation.
