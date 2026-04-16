# PLAN REVIEW — FORGE-S06-T01: Fix orchestrator persona lookup + model announcement

*Forge Supervisor*

**Task:** FORGE-S06-T01

---

**Verdict:** Approved

---

## Review Summary

The plan correctly identifies the single-file change needed to fix the orchestrator's role-based persona file lookups and announcement line. The ROLE_TO_NOUN table is a clean, minimal addition that bridges the gap between role identifiers and noun-based filenames. The fallback `.get(phase.role, phase.role)` provides a safe backwards-compatibility path during the transition period before persona regeneration (T03) lands.

## Feasibility

The approach is realistic and correctly scoped. The only file modified is `forge/meta/workflows/meta-orchestrate.md`, which is confirmed as the correct target (it is the meta-template that generates `.forge/workflows/orchestrate_task.md`). The PERSONA_MAP already exists in the Execution Algorithm; the ROLE_TO_NOUN table simply extends the same pattern. No new JS/CJS files are introduced. Scope is appropriate for an M-estimate task.

Cross-referenced against `engineering/architecture/routing.md`: meta-workflows live in `forge/meta/workflows/`, confirmed correct.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes. The change alters how generated orchestrators resolve persona files and format announcements -- this is user-visible behaviour in the generated workflow output. Bump from 0.7.2 to 0.7.3 is appropriate.
- **Migration entry targets correct?** Yes. The `regenerate` target `workflows:orchestrate_task` is correct -- users must regenerate their orchestrator after updating to get the noun-based lookups and new announcement format. The `type: "functional"` and `patch` description follow the format established in the 0.7.1->0.7.2 migration entry.
- **Security scan requirement acknowledged?** Yes. The plan correctly states that any change to `forge/` requires a scan.

## Security

No new risk introduced. The change is confined to a Markdown meta-workflow template. No hook scripts, no tool specs, no commands are modified. The ROLE_TO_NOUN table is a static lookup with no user-controllable input. Prompt injection risk is nil -- the table values are hardcoded, not derived from user input.

## Architecture Alignment

- **Follows established patterns:** Yes. The ROLE_TO_NOUN table sits alongside PERSONA_MAP, following the same dictionary-lookup pattern already used for emoji/name/tagline resolution.
- **No npm dependencies introduced:** Correct -- Markdown-only change.
- **Schema changes:** None. The plan correctly notes no JSON schemas are affected.
- **`additionalProperties: false`:** Not applicable -- no schema changes.
- **Path hardcoding:** Not applicable -- no JS files modified.

## Testing Strategy

- `node --check` on JS/CJS files: Not applicable (Markdown-only change). The plan correctly notes this.
- `validate-store --dry-run`: Included, should pass since no schemas change.
- Manual verification: The plan lists four concrete checks (ROLE_TO_NOUN coverage, no remaining role-literal pattern, announcement format, acceptance criteria mapping). These are adequate.

## Completeness

All five acceptance criteria from the task prompt are addressed:

| Criterion | Plan Coverage |
|-----------|--------------|
| 1. Noun-based persona file lookup via ROLE_TO_NOUN | Change #1 + #2 |
| 2. Explicit role-to-noun mapping in Generation Instructions | Change #4 |
| 3. skill_content also uses noun-based filenames | Change #2 |
| 4. Announcement line includes resolved model | Change #3 + #5 |
| 5. node --check passes on modified files | N/A (Markdown only) |

Edge case covered: `.get(phase.role, phase.role)` fallback for roles not yet in the table (e.g., custom pipeline roles) -- degrades gracefully to the current role-literal behaviour.

Backwards compatibility path described: Until personas are regenerated with noun filenames (T03), the fallback will attempt role-based filenames which currently exist in `.forge/personas/`. This is a safe transition.

---

## Advisory Notes

1. **Missing skill file for `qa-engineer`**: The meta-skills directory contains `meta-engineer-skills.md`, `meta-supervisor-skills.md`, and `meta-architect-skills.md`, but no `meta-qa-engineer-skills.md`. After T03 regenerates personas/skills with noun-based names, the `validate` role will look up `qa-engineer-skills.md`. The `read_file` will return an empty string for a missing file (graceful), but T03 should ensure this file is generated. This is out of scope for T01 but worth noting for T03.

2. **Missing skill file for `collator`**: Same situation -- no `meta-collator-skills.md` exists. The `writeback` role maps to `collator`, so the skill lookup will be `collator-skills.md`. This is also gracefully handled (empty string) but should be addressed in T03.

3. **PERSONA_MAP and ROLE_TO_NOUN overlap**: Both tables encode knowledge about role-to-noun relationships. PERSONA_MAP already has the noun as `persona_name` (e.g., "Engineer", "Supervisor"). A future refactor could derive ROLE_TO_NOUN from PERSONA_MAP rather than maintaining two separate tables, but this is not a concern for the current task -- two tables is the simpler, more explicit approach.