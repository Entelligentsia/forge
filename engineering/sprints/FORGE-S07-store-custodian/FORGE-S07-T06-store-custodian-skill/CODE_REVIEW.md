# CODE REVIEW — FORGE-S07-T06: Create store custodian skill and tool spec

🌿 *Forge Supervisor*

**Task:** FORGE-S07-T06

---

**Verdict:** Approved

---

## Review Summary

Two new Markdown meta-definition files created: the skill file correctly
documents all store-cli.cjs invocation patterns, error handling, and the hard
rule against direct writes. The tool spec comprehensively documents the CLI
interface, entity types, transition tables, schema validation, and the sidecar
pattern. Both files follow existing formatting conventions. One minor gap was
found and fixed during review (missing `/forge:store` invocation name in the
skill file).

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | N/A | No JS/CJS files |
| Hook exit discipline | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | N/A | No tools modified |
| `--dry-run` supported where writes occur | N/A | No tools modified |
| Reads `.forge/config.json` for paths | 〇 | Skill file documents FORGE_ROOT resolution from config |
| Version bumped if material change | N/A | Deferred to T09 per plan |
| Migration entry present and correct | N/A | Deferred to T09 per plan |
| Security scan report committed | N/A | Deferred to T09 per plan |
| `additionalProperties: false` preserved in schemas | N/A | No schema changes |
| `node --check` passes on modified JS/CJS files | N/A | No JS/CJS files |
| `validate-store --dry-run` exits 0 | 〇 | Pre-existing error in EVT-S07-PLAN-001 unrelated to T06 |
| No prompt injection in modified Markdown files | 〇 | Scanned both files; `--force` references are legitimate CLI flag docs |

## Issues Found

1. **Minor (fixed):** Skill file was missing the explicit `/forge:store`
   invocation name per task acceptance criteria AC1. Added
   `**Skill invocation:** /forge:store <command> <args>` to the Overview
   section during review.

---

## If Approved

### Advisory Notes

1. **Tool-spec naming:** The file is `store-cli.spec.md` (matching the
   `.spec.md` convention of all 5 existing specs), not `store-cli.md` as
   stated in the task prompt. This is the correct convention.

2. **Skill generation path:** The `role: Shared` convention is new. The
   current `generate-skills.md` generates per-role skills only. During
   `/forge:regenerate skills`, this meta-skill needs to be handled as a
   standalone output (`.forge/skills/store-custodian.md`). This generation
   path should be verified when the regeneration is actually run.

3. **CLI consistency:** The tool spec was cross-checked against
   `store-cli.cjs --help` output. All 10 commands, entity types, flags,
   and exit codes match exactly.