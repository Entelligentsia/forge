# PLAN REVIEW — FORGE-S06-T08: Update collate path resolution for slug-named directories

🌿 *Forge Supervisor*

**Task:** FORGE-S06-T08

---

**Verdict:** Approved

---

## Review Summary

The plan is minimal and well-scoped. It identifies the single correct file (`forge/tools/collate.cjs`), applies an established pattern already present in the same file, and handles the legacy fallback explicitly. All acceptance criteria from the task prompt are addressed.

## Feasibility

Approach is realistic. The fix is a 3-line conditional that mirrors the COST_REPORT section verbatim. Single file. No cross-cutting concerns.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — change to a shipped tool is material.
- **Migration entry targets correct?** Yes — `regenerate: []` is correct since collate runs on demand; users don't need to regenerate after installing the update.
- **Security scan requirement acknowledged?** Yes — explicitly stated.

## Security

No new attack surface. The change modifies how a local directory name is derived from a JSON field — no external input, no file writes to unexpected paths, no prompt injection risk. Output is internal markdown (MASTER_INDEX.md).

## Architecture Alignment

- Uses only `path.basename()` (built-in) — no npm dependencies introduced.
- Follows the existing pattern from lines 321–325 of `collate.cjs` exactly.
- No schema changes; `additionalProperties: false` is unaffected.
- Reads from store data (already loaded), not from hardcoded paths.

## Testing Strategy

Adequate. `node --check forge/tools/collate.cjs` is sufficient for a pure logic change with no schema modifications. Manual smoke test (run collate and inspect MASTER_INDEX.md links) described correctly.

---

## If Approved

### Advisory Notes

- The implementation should also verify MASTER_INDEX.md output manually after the fix to confirm slug-named task links render correctly for FORGE-S06 tasks.
- The version bump (handled in FORGE-S06-T10) should reference this task as a contributor.
