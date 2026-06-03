## Security Scan — forge:forge — 2026-06-02

**SHA**: pending (v1.2.1 release commit) | **Installed**: n/a (in-tree source scan) | **Last updated**: 2026-06-02
**Scope**: source — `forge/forge/` (plugin payload) | **Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary
401 files scanned | 0 critical | 0 warnings | 1 info

### Scan basis

v1.2.1 is a one-line-semantics bug fix: `wfl-fix-bug.js` declared its workflow
meta with `desc:`/`steps:` instead of `description:`/`phases:`, so the Workflow
runtime rejected it and the named-workflow registry skipped it. The delta versus
v1.2.0 is:

- `init/base-pack/workflows-js/wfl-fix-bug.js` — meta keys renamed (`desc → description`, `steps → phases`, added a `Resolve` phase). No body/logic change.
- `workflows-js-drift.test.cjs` — new meta-contract regression test.
- `plugin.json` / `migrations.json` / `CHANGELOG.md` — version + migration metadata.
- Regenerated `structure-manifest.json` / `enum-catalog.json` / `integrity.json`.

### Findings

#### [INFO] meta-key rename only — no behavioural surface change
- **Check**: A / B — workflow driver + context file
- **Issue**: The edit renames object-literal keys in the `export const meta`
  block of a JS workflow driver. No new network, `eval`/`exec`/`child_process`,
  credential, or environment access; no new permissions, hooks, or commands. The
  driver body (subagent prompts, gate calls) is unchanged.
- **Excerpt**: `description: 'Code-orchestrated port of /forge:fix-bug …'` (was `desc:`)
- **Recommendation**: Safe. Pure metadata correction that makes the existing
  driver launchable.

### Clean Areas
- `forge/hooks/`, `forge/commands/`, `forge/skills/`, `forge/personas/` — unchanged from the v1.2.0 baseline; no network, credential, eval, or injection patterns.
- `forge/init/base-pack/workflows-js/` — three JS drivers; no binaries; meta now uniform (`name` + non-empty `description` + `phases`), enforced by the new test.
- Generated `schemas/*.json` — deterministic regenerated manifests; integrity verified (29 hashed assets unmodified).

### Verdict

**SAFE TO USE**

v1.2.1 corrects metadata keys on one workflow driver and adds a regression test.
No new external surface, no injection vectors, no permission escalation.
