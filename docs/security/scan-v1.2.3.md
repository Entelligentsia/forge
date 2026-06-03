## Security Scan — forge:forge — 2026-06-02

**SHA**: pending (v1.2.3 release commit) | **Installed**: n/a (in-tree source scan) | **Last updated**: 2026-06-02
**Scope**: source — `forge/forge/` (plugin payload) | **Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary
401 files scanned | 0 critical | 0 warnings | 1 info

### Scan basis

v1.2.3 is a prompt-text-only hardening of the subagent FORGE_ROOT preamble in the
three packaged JS workflow drivers. The delta versus v1.2.2:

- `init/base-pack/workflows-js/wfl-{run-task,run-sprint,fix-bug}.js` — replaced ~23 occurrences of the bare *"Resolve FORGE_ROOT from .forge/config.json paths.forgeRoot"* preamble with a directive to read `./.forge/config.json` (cwd, never a parent dir) and `export FORGE_ROOT`. No logic change.
- `workflows-js-drift.test.cjs` — regression guard.
- `plugin.json` / `migrations.json` / `CHANGELOG.md` — version + migration metadata.
- Regenerated `structure-manifest.json` / `enum-catalog.json` / `integrity.json`.

### Findings

#### [INFO] new subagent directive runs `export FORGE_ROOT` from the project's own config — benign
- **Check**: B — context/prompt text
- **Issue**: The added directive instructs subagents to set `FORGE_ROOT` to the
  `paths.forgeRoot` value read from the project's own `./.forge/config.json` and
  export it for use in subsequent `node "$FORGE_ROOT/tools/*.cjs"` calls. The
  value is project-local configuration, not untrusted external input; there is no
  network call, no `eval`, no credential or `.env` access, no exfiltration. The
  diff scan for dangerous tokens (curl/wget/eval/child_process/base64/ssh/env/
  secret/credential) returned nothing beyond the documented `export FORGE_ROOT`.
- **Excerpt**: `export it as FORGE_ROOT so $FORGE_ROOT works in every command below`
- **Recommendation**: Safe. Tightens path resolution; reduces the chance of a
  tool running against an unintended directory.

### Clean Areas
- `forge/hooks/`, `forge/commands/`, `forge/skills/`, `forge/personas/` — unchanged from the v1.2.2 baseline.
- `forge/init/base-pack/workflows-js/` — three JS drivers; no Node-API/filesystem access in driver bodies; meta + orchestration guards intact.
- Generated `schemas/*.json` — deterministic regenerated manifests; integrity verified (29 hashed assets unmodified).

### Verdict

**SAFE TO USE**

v1.2.3 hardens subagent path resolution via prompt text only. No new external
surface, no injection vectors, no permission escalation.
