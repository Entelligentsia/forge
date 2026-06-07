## Security Scan — forge:forge — 2026-06-07

**SHA**: pending (v1.3.0 release commit) | **Installed**: n/a (in-tree source scan) | **Last updated**: 2026-06-07
**Scope**: source — `forge/forge/` (plugin payload) | **Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary
400 files scanned (delta vs v1.2.21 baseline) | 0 critical | 0 warnings | 2 info (carried)

### Scan basis

v1.3.0 is a CLI-first bootstrap architecture change. Changed surfaces:

- `init/base-pack/commands/init.md` — NEW project-local command wrapper. Uses
  vendored `.forge/tools/` paths only. No `$FORGE_ROOT` / `${CLAUDE_PLUGIN_ROOT}`
  references. No network calls. Instructs `workflow('wfl:init', args)` dispatch
  and explicit Workflow-tool-missing error. Marketplace-skills offer and
  `forge:refresh-kb-links` Skill invocation are post-workflow user-consented flows.
- `commands/init.md` — Execute section replaced with `workflow('wfl:init')` dispatch.
  Prose only. No new network calls, no new capabilities.
- `init/phases/phase-1-collect.md` — Orchestrator-owned annotations inserted.
  Prose only.
- `init/phases/phase-4-register.md` — Orchestrator-owned annotations inserted.
  Prose only.
- `init/sdlc-init.md` — Body reduced to a spec pointer. Prose only.
- `tools/__tests__/command-wfl-conformance.test.cjs` — Test 7 flipped from
  boundary-absent to presence + conformance. Test-only. No production code.
- `migrations.json`, `CHANGELOG.md`, `integrity.json`, `plugin.json` — metadata only.

Dangerous-token sweep (all checks A–D applied to delta files):
- Check A (hook scripts): no hook files modified. Existing hooks unchanged.
- Check B (prompt injection): no injection patterns found. Orchestrator-note
  annotations are informational and semantics-preserving — no persona hijacking,
  no safety bypass, no exfiltration instructions.
- Check C (permissions): `hooks.json` unchanged. No new `allowed-tools` entries.
- Check D (structural): no binary files, no compiled artifacts. Plugin size 4.0M
  (within expected range for this codebase). No misleading extensions.

### Findings

Both v1.2.18 INFO items carry over unchanged (check-update.cjs network call to
`raw.githubusercontent.com` for version check — domain-validated, version-check
only; `CLAUDE_PLUGIN_ROOT` env read — required for plugin path resolution).

No new findings.

### Verdict

**SAFE TO USE**

All new content is prose-only markdown (command wrappers, phase annotations,
spec pointer). No new hook code, no new tool code, no new network calls, no new
permissions. Delta is a pure orchestration-architecture refactor.
