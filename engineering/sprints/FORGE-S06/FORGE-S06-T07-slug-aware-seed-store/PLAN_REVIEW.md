# PLAN REVIEW — FORGE-S06-T07: Slug-aware seed-store discovery and path construction

**Task:** FORGE-S06-T07

---

**Verdict:** Approved

---

## Review Summary

The plan is well-scoped and correctly identifies the sole file to modify (`seed-store.cjs`). The progressive fallback approach for directory discovery is sound, and all eight acceptance criteria from the task prompt are addressed. The plan appropriately extends coverage to bug discovery (consistent with the same slug-naming pattern used in `engineering/bugs/`).

## Feasibility

The approach is realistic. The current code has clear, localized regex patterns that are straightforward to replace with broader patterns. The `deriveSlug()` function is a pure utility with no side effects. Scope is appropriate for a single task.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — changes to `forge/tools/seed-store.cjs` are material.
- **Migration entry targets correct?** Yes — `regenerate: []` is correct since seed-store changes don't affect generated workflows, commands, or tools that are installed into user projects.
- **Security scan requirement acknowledged?** Yes.

## Security

No new attack surface. `seed-store.cjs` reads local filesystem directories and writes JSON files — no network calls, no user input parsing beyond CLI flags. `deriveSlug()` is a pure string transform with no injection risk.

## Architecture Alignment

- Follows the established pattern: reads `.forge/config.json` for paths, uses `Store.writeSprint/writeTask/writeBug` facade, Node.js built-ins only.
- No schema changes (sprint `path` field was added in T06 as optional).
- `additionalProperties: false` is preserved — no schema changes in this task.

## Testing Strategy

- `node --check` on modified file: included.
- `validate-store --dry-run`: included.
- Manual smoke test with `seed-store --dry-run`: included, and it's the right verification since this project has both legacy (`FORGE-S01/T01/`) and slug-named (`FORGE-S06/FORGE-S06-T07-slug-aware-seed-store/`) directories.

---

## Advisory Notes

1. **`deriveSlug()` usage**: The task prompt specifies this function but seed-store reads existing directories (it doesn't create new ones). During implementation, clarify where `deriveSlug` is actually called. If seed-store doesn't create directories, `deriveSlug` should still be exported or used somewhere — otherwise it's dead code. Consider using it to validate that discovered slugs match the title-derived slug, or export it for use by sprint-intake.

2. **Sprint ID extraction**: When discovering `FORGE-S06-post-07-feedback`, the sprint ID should be `FORGE-S06` (prefix + sprint number), not the full directory name. The plan notes this but implementation should carefully extract only `{PREFIX}-S{NN}` from the directory name, discarding the slug suffix.

3. **Task ID construction**: For task directories like `T01-fix-persona-lookup`, the task ID needs the parent sprint context (`FORGE-S06-T01`). Ensure the sprint's prefix and number are available when constructing task IDs from short-form directory names.

4. **Bug ID padding**: The current code zero-pads bug numbers (`B1` -> `BUG-01`). The slug-named format uses `BUG-001` (3-digit). Ensure consistent 2-digit or 3-digit padding. The existing code uses `.padStart(2, '0')` which gives `BUG-01`; the actual bug dirs use `BUG-001` (3-digit). This inconsistency predates this task but should be noted.