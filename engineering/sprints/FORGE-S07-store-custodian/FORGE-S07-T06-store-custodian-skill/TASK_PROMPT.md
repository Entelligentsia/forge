# FORGE-S07-T06: Create store custodian skill and tool spec

**Sprint:** FORGE-S07
**Estimate:** S
**Pipeline:** default

---

## Objective

Create two new meta-definition files that document and expose the store custodian
for use by the probabilistic layer: (1) a Forge skill at
`forge/meta/skills/meta-store-custodian.md` that instructs the LLM to delegate
all store operations to `store-cli.cjs`, and (2) a tool spec at
`forge/meta/tool-specs/store-cli.md` that documents the CLI interface for reference
during workflow generation.

## Acceptance Criteria

1. `forge/meta/skills/meta-store-custodian.md` exists and:
   - Skill name / invocation: `/forge:store <command> <args>`
   - Instructs the LLM to run `node "$FORGE_ROOT/tools/store-cli.cjs" <command> <args>`
   - Specifies FORGE_ROOT resolution: `FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)")`
   - On exit 1: read stderr, fix the data, retry (max 2 retries)
   - On exit 1 after retries: report the validation error to the user and stop
   - Hard rule: **never fall back to writing store files directly**
   - Documents all invocation patterns from the requirements (write sprint, read task,
     update-status, emit, emit --sidecar, merge-sidecar, validate, list, delete)

2. `forge/meta/tool-specs/store-cli.md` exists and:
   - Documents all commands with usage syntax, arguments, exit codes
   - Documents entity types: sprint, task, bug, event, feature
   - Documents the transition table summary (which transitions are legal)
   - Documents schema validation behavior (what it validates, when it rejects)
   - Documents the sidecar pattern (emit --sidecar, merge-sidecar)

3. Both files follow the formatting conventions of existing skill/tool-spec files
   in `forge/meta/skills/` and `forge/meta/tool-specs/`

## Context

Requirements R5, AC1. See `docs/requirements/store-custodian.md` Section R5 for
the skill prompt requirements and invocation pattern table.

Reference existing skills (e.g., `forge/meta/skills/meta-collate.md`) and tool
specs (e.g., `forge/meta/tool-specs/collate.md`) for formatting conventions.

## Plugin Artifacts Involved

- `forge/meta/skills/meta-store-custodian.md` — new skill definition
- `forge/meta/tool-specs/store-cli.md` — new tool spec

## Operational Impact

- **Version bump:** Required (included in T09)
- **Regeneration:** Skills and tools targets (users need `/forge:regenerate skills` to
  get the new `/forge:store` skill in their project)
- **Security scan:** Required (included in T09)
