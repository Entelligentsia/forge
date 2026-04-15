# CODE REVIEW — FORGE-S08-T04: Update step banners and explicit sequencing

*Forge Supervisor*

**Task:** FORGE-S08-T04

---

**Verdict:** Approved

---

## Review Summary

The implementation faithfully follows the approved plan. All five acceptance criteria are met. The single modified file (`forge/commands/update.md`) contains only the additions specified in the plan: a Progress Output Format section, step banner emit instructions, and a regeneration order table. No JS/CJS files were modified, so no syntax check or validate-store is needed. One minor fix was applied during review (em-dash formatting in the sequencing table).

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | N/A | Markdown-only change |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | N/A | No tools modified |
| `--dry-run` supported where writes occur | N/A | No tools modified |
| Reads `.forge/config.json` for paths (no hardcoded paths) | N/A | No code changes |
| Version bumped if material change | N/A | Deferred to T06 |
| Migration entry present and correct | N/A | Deferred to T06 |
| Security scan report committed | N/A | Deferred to T06 |
| `additionalProperties: false` preserved in schemas | N/A | No schemas modified |
| `node --check` passes on modified JS/CJS files | N/A | No JS/CJS files modified |
| `validate-store --dry-run` exits 0 | N/A | No schemas modified |
| No prompt injection in modified Markdown files | Pass | All banner text is static, no user-derived content |

## Issues Found

None. The implementation matches the plan exactly.

---

## If Approved

### Advisory Notes

1. **Pre-existing frontmatter change.** The diff includes a `+name: update` frontmatter addition that predates this task. This is benign (the field was missing from the original command file) but should be noted for the commit scope.

2. **Em-dash consistency.** During review, the sequencing table was corrected from `--` (double dash) to `—` (em-dash) to match the plan. All other em-dashes in the file are correct.

3. **Step 4 prose vs. table.** The existing Step 4 prose says "Run non-knowledge-base targets first (workflows, templates, commands, tools)" which lists a different order than the new sequencing table (tools, workflows, templates, personas, commands). The table is the authoritative ordering. A future task could reconcile the prose with the table, but this is not a blocker.