# PLAN REVIEW — FORGE-S07-T04: Refactor validate-store.cjs — remove embedded schemas and fix facade bypass

🌿 *Forge Supervisor*

**Task:** FORGE-S07-T04

---

**Verdict:** Approved

---

## Review Summary

The plan is well-structured and addresses all eight acceptance criteria from the task prompt. Both changes are mechanical refactors with clear before/after mappings. The approach correctly identifies that `validateRecord()` needs no modification since it already works with any object having `required` and `properties` keys. One robustness gap (malformed schema files) should be handled in implementation but does not block approval.

## Feasibility

The approach is realistic and correctly scoped. Both Part 1 (schema loading) and Part 2 (facade bypass) are self-contained, mechanical refactors. The file list is correct — only `forge/tools/validate-store.cjs` needs modification. The facade methods `store.listEventFilenames()` and `store.getEvent()` were confirmed present in `store.cjs` (added in T02). The M estimate is appropriate.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — correctly deferred to T09 per task prompt.
- **Migration entry targets correct?** N/A — deferred to T09. The advisory note about `"schemas"` as a regenerate target is reasonable but T09 will determine the final list.
- **Security scan requirement acknowledged?** Yes — deferred to T09.

## Security

No new security risks introduced. Schema loading reads from fixed convention paths (`.forge/schemas/` and `forge/schemas/`), not from user-controlled paths. No prompt injection surface (this is a CJS tool, not Markdown). The `store.impl.*` bypass removal actually *improves* security posture by reducing private-API surface area.

## Architecture Alignment

- Uses `store` facade methods instead of `store.impl.*` — aligns with the facade pattern established in S04 and the sprint goal.
- No hardcoded store paths — schema paths are convention-based (`.forge/schemas/`, `forge/schemas/`), distinct from the config-driven `storeRoot`.
- `process.on('uncaughtException', () => process.exit(1))` already in place.
- No `additionalProperties` concerns — schemas themselves are unchanged.
- No new npm dependencies.

## Testing Strategy

Adequate. `node --check` and `validate-store --dry-run` cover the stack's verification capabilities. The manual smoke test (temporarily removing `.forge/schemas/` to verify fallback) is a good addition. The baseline was captured before the plan (2 errors, known warnings).

---

## If Approved

### Advisory Notes

1. **Malformed schema files:** The plan describes fallback for "file not found" but does not explicitly address "file found but contains invalid JSON." The `loadSchemas()` implementation must wrap `JSON.parse(fs.readFileSync(...))` in try/catch and treat parse failures the same as file-not-found: fall back to the next source or minimal schema, with a stderr warning. This is the natural implementation of the plan's stated intent and does not require a plan revision.

2. **Schema resolution order for dogfooding:** In this project, both `.forge/schemas/` and `forge/schemas/` exist, and the installed copy (`.forge/schemas/`) may be stale (e.g., missing `goal`, `path`, `features` on sprint). The plan correctly identifies this as benign since `validateRecord` does not enforce `additionalProperties: false`. After implementation, running `/forge:update-tools` will sync the installed copy. No action needed in this task.

3. **`fs` and `path` imports remain needed:** After removing the embedded schemas, `fs` is still required for schema file reading and Pass 3 filesystem checks. `path` is still required for path construction. The existing imports at the top of the file remain unchanged.

4. **NULLABLE_FK set:** The plan correctly preserves this. During implementation, verify that the `NULLABLE_FK` set is not accidentally removed when the `SCHEMAS` const is deleted — they are adjacent in the source but independent in function.