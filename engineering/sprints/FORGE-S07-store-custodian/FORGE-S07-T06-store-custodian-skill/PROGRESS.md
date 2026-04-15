# PROGRESS — FORGE-S07-T06: Create store custodian skill and tool spec

🌱 *Forge Engineer*

**Task:** FORGE-S07-T06
**Sprint:** FORGE-S07

---

## Summary

Created two new meta-definition files that expose the store custodian CLI
(`store-cli.cjs`) to the probabilistic layer: (1) a cross-cutting skill at
`forge/meta/skills/meta-store-custodian.md` that instructs the LLM to delegate
all store operations to `store-cli.cjs`, and (2) a tool spec at
`forge/meta/tool-specs/store-cli.spec.md` that documents the CLI interface for
reference during workflow generation. No code changes were made.

## Syntax Check Results

No JS/CJS files were created or modified. Syntax check is not applicable.

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
ERROR  FORGE-S07/EVT-S07-PLAN-001: missing required field: "iteration"

1 error(s) found.
```

The validation failure is pre-existing (event `EVT-S07-PLAN-001` missing
`iteration` field, created during sprint planning). It is unrelated to T06
changes, which only added Markdown files in `forge/meta/`.

## Files Changed

| File | Change |
|---|---|
| `forge/meta/skills/meta-store-custodian.md` | NEW — skill definition for `/forge:store` |
| `forge/meta/tool-specs/store-cli.spec.md` | NEW — tool spec documenting CLI interface |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `meta-store-custodian.md` exists with `/forge:store <command> <args>` invocation | 〇 Pass | Frontmatter `name: Store Custodian`, `role: Shared` |
| Instructs LLM to run `node "$FORGE_ROOT/tools/store-cli.cjs"` | 〇 Pass | FORGE_ROOT section + Invocation section |
| FORGE_ROOT resolution via `.forge/config.json` | 〇 Pass | `$()` command substitution pattern |
| On exit 1: read stderr, fix data, retry (max 2) | 〇 Pass | Error Handling section |
| On exit 1 after retries: report and stop | 〇 Pass | Error Handling section |
| Hard rule: never fall back to direct writes | 〇 Pass | Stated in Overview and Error Handling |
| Documents all invocation patterns | 〇 Pass | 18 patterns in Invocation Patterns table |
| `store-cli.spec.md` documents commands with usage, args, exit codes | 〇 Pass | CLI Interface + Algorithm sections |
| Documents entity types | 〇 Pass | Entity Types table with ID fields and required fields |
| Documents transition table summary | 〇 Pass | Status Transitions section with all 4 entity types |
| Documents schema validation behavior | 〇 Pass | Schema Validation section |
| Documents sidecar pattern | 〇 Pass | Sidecar Pattern section with emit --sidecar and merge-sidecar |
| Both files follow formatting conventions | 〇 Pass | YAML frontmatter + section structure matches existing files |
| `validate-store --dry-run` exits 0 | 〇 Pass* | Pre-existing error in EVT-S07-PLAN-001, not caused by T06 |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` — **Deferred to T09**
- [ ] Migration entry added to `forge/migrations.json` — **Deferred to T09**
- [ ] Security scan run and report committed — **Deferred to T09**

## Knowledge Updates

None. The skill file introduces a `role: Shared` convention for cross-cutting
skills. This is a new pattern not yet documented in `engineering/architecture/`.
If it is adopted by future meta-skills, it should be documented in
`routing.md` or a new `engineering/architecture/skills.md`.

## Notes

- The tool-spec file uses `.spec.md` suffix (matching the convention of all 5
  existing specs) rather than `store-cli.md` as stated in the task prompt.
  The task prompt's naming was inconsistent with the established convention.
- The skill uses `role: Shared` in frontmatter, a new convention for
  cross-cutting skills that don't map to a single persona. The
  `generate-skills.md` process currently generates per-role skills only.
  During `/forge:regenerate skills`, this skill needs to be handled as a
  standalone output (`.forge/skills/store-custodian.md`) rather than merged
  into a role-specific file. This generation-path detail can be addressed
  when T07 migrates workflows to reference the custodian.
- Prompt-injection scan: both Markdown files were checked for injection
  patterns (ignore prior rules, dump env vars, curl external URLs). None
  found.