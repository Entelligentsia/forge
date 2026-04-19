# PLAN — FORGE-S07-T06: Create store custodian skill and tool spec

🌱 *Forge Engineer*

**Task:** FORGE-S07-T06
**Sprint:** FORGE-S07
**Estimate:** S

---

## Objective

Create two new meta-definition files that expose the store custodian CLI
(`store-cli.cjs`, implemented in T05) to the probabilistic layer: (1) a Forge
skill at `forge/meta/skills/meta-store-custodian.md` that instructs the LLM to
delegate all store operations to `store-cli.cjs`, and (2) a tool spec at
`forge/meta/tool-specs/store-cli.spec.md` that documents the CLI interface for
reference during workflow generation.

## Approach

Both files are pure Markdown with no code changes. The skill file follows the
meta-skill convention (YAML frontmatter + Generation Instructions + Skill Set
sections) but is structured as a standalone operational skill rather than a
role-specific capability set, since the store custodian is invoked by every
persona that touches the store. The tool spec follows the existing `.spec.md`
convention (collate.spec.md, validate-store.spec.md, etc.) with Purpose, Inputs,
Outputs, CLI Interface, and Error Handling sections.

**Key design decisions:**

1. **Skill naming:** The skill name is `store` so the invocation becomes
   `/forge:store <command> <args>` per the requirements (R5). This is a
   departure from existing role-prefixed skills (e.g., `meta-engineer-skills`)
   since the custodian is a cross-cutting utility, not a role capability.

2. **Tool spec naming:** Use `store-cli.spec.md` (not `store-cli.md` as stated
   in the task prompt) to match the existing `.spec.md` convention used by all
   five existing tool specs in `forge/meta/tool-specs/`.

3. **FORGE_ROOT resolution:** The skill instructs the LLM to resolve
   `FORGE_ROOT` at runtime from `.forge/config.json` using
   `node -e "console.log(require('./.forge/config.json').paths.forgeRoot)"`.
   This matches the pattern used by generated workflows and avoids hardcoding
   the plugin install path.

4. **Retry logic:** On exit 1, the skill instructs the LLM to read stderr,
   fix the data, and retry (max 2 retries). On persistent failure, report the
   validation error to the user and stop. This matches the requirements (R5).

5. **Hard rule:** The skill explicitly forbids falling back to direct store
   file writes, ensuring the custodian is the sole gateway.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/meta/skills/meta-store-custodian.md` | NEW — skill definition | Instructs the LLM to use `store-cli.cjs` for all store operations |
| `forge/meta/tool-specs/store-cli.spec.md` | NEW — tool spec | Documents CLI interface for workflow generation reference |

No existing files in `forge/` are modified by this task. The workflow migrations
(T07), command migrations (T08), and release engineering (T09) are separate
tasks.

## Plugin Impact Assessment

- **Version bump required?** Yes — new meta-definition files are a material
  change (they alter what gets generated into user projects on
  `/forge:regenerate`). However, the version bump is deferred to T09 (release
  engineering) which covers all S07 changes. T06 does NOT bump the version
  itself.
- **Migration entry required?** No — deferred to T09. The migration entry in
  T09 will include `skills` and `tools` in the `regenerate` list so users get
  the new skill and tool spec after updating.
- **Security scan required?** Yes — any change to `forge/` requires a scan.
  Deferred to T09 along with the version bump.
- **Schema change?** No — T06 does not modify any `forge/schemas/*.schema.json`.

## Testing Strategy

- No JS/CJS files are created or modified, so `node --check` is not applicable.
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (confirms
  no store corruption from any incidental changes).
- Manual verification:
  - Confirm `meta-store-custodian.md` follows the YAML frontmatter convention
    (name, description fields present).
  - Confirm `store-cli.spec.md` follows the existing spec format (Purpose,
    Inputs, Outputs, CLI Interface, Error Handling sections).
  - Confirm the skill invocation patterns match all commands in `store-cli.cjs`
    (write, read, list, delete, update-status, emit, emit --sidecar,
    merge-sidecar, purge-events, write-collation-state, validate).
  - Confirm FORGE_ROOT resolution instructions match the pattern in
    `generate-tools.md`.

## Acceptance Criteria

- [ ] `forge/meta/skills/meta-store-custodian.md` exists and:
  - Skill name: `/forge:store <command> <args>`
  - Instructs the LLM to run `node "$FORGE_ROOT/tools/store-cli.cjs" <command> <args>`
  - Specifies FORGE_ROOT resolution via `.forge/config.json`
  - On exit 1: read stderr, fix data, retry (max 2 retries)
  - On exit 1 after retries: report validation error to user and stop
  - Hard rule: never fall back to writing store files directly
  - Documents all invocation patterns (write, read, list, delete,
    update-status, emit, emit --sidecar, merge-sidecar, purge-events,
    write-collation-state, validate)
- [ ] `forge/meta/tool-specs/store-cli.spec.md` exists and:
  - Documents all commands with usage syntax, arguments, exit codes
  - Documents entity types: sprint, task, bug, event, feature
  - Documents the transition table summary (which transitions are legal)
  - Documents schema validation behavior (what it validates, when it rejects)
  - Documents the sidecar pattern (emit --sidecar, merge-sidecar)
- [ ] Both files follow the formatting conventions of existing meta-skill and
      tool-spec files in `forge/meta/`
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users will get the new skill after running
  `/forge:regenerate skills` following the T09 version bump. The tool spec is
  a meta-definition used during workflow generation — it ships with the plugin
  but is not copied to user projects directly.
- **Backwards compatibility:** Fully backward compatible — these files are
  additive. No existing skills, tool specs, workflows, or commands are
  modified. Existing store data is untouched.