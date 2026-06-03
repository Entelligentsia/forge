## Security Scan — forge:forge — 2026-06-02

**SHA**: pending (v1.2.0 release commit) | **Installed**: n/a (in-tree source scan) | **Last updated**: 2026-06-02
**Scope**: source — `forge/forge/` (plugin payload) | **Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary
401 files scanned | 0 critical | 0 warnings | 1 info

### Scan basis

v1.2.0 retires the LLM orchestration prose (`orchestrate_task` / `run_sprint` /
`fix_bug`) in favour of the existing deterministic JS drivers. The delta versus
v1.1.2 is **entirely removals and list/count edits**:

- Deleted: 3 base-pack prose workflows, 1 init rulebook (`generate-orchestration.md`), 2 drift tests.
- Edited: `build-base-pack.cjs` / `build-manifest.cjs` (drop 3 mapping rows), `workflow-gen-plan.json` (16→15), 4 test count assertions, `rebuild.md` / `refresh-kb-links` / `vision` docs.
- Regenerated: `structure-manifest.json`, `enum-catalog.json`, `integrity.json`.

No new code paths, no new external surface.

### Findings

#### [INFO] retirement is removal-only
- **Check**: A / D — tool scripts + structure
- **Issue**: The tool edits in `build-base-pack.cjs` and `build-manifest.cjs`
  remove array entries; no new network, `eval`/`exec`/`child_process`, credential,
  or environment access is introduced. File count drops 407 → 401. No binaries or
  compiled artifacts; no misleading extensions.
- **Excerpt**: `const COPY_VERBATIM_WORKFLOWS = [ 'quiz_agent.md' ];` (was 2 entries)
- **Recommendation**: Safe. Surface area strictly shrinks.

### Clean Areas
- `forge/hooks/`, `forge/commands/`, `forge/skills/`, `forge/personas/` — no
  network calls, credential reads, eval, injection strings, or zero-width Unicode
  introduced; unchanged from the v1.1.2 baseline except the documented doc edits.
- `forge/.claude-plugin/plugin.json`, `forge/migrations.json` — version/migration
  metadata only; no permission changes.
- Generated `schemas/*.json` — deterministic regenerated manifests; integrity
  verified (29 hashed assets unmodified).

### Verdict

**SAFE TO USE**

v1.2.0 is a removal-only retirement that shrinks the plugin's surface. No new
external surface, no injection vectors, no permission escalation.
