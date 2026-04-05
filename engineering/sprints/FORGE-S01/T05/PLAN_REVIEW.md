# PLAN REVIEW — FORGE-S01-T05: collate.cjs — COST_REPORT.md generation

**Reviewer:** Supervisor
**Task:** FORGE-S01-T05

---

**Verdict:** Approved

---

## Review Summary

The plan is well-structured and realistic. It correctly identifies all files to modify, reuses existing helper functions (`padTable`, `writeFile`, `resolveDir`), and introduces a clean `tokenSource` schema addendum that enables accurate labelling in the cost report. The scope is appropriate for an L-sized task.

## Feasibility

The approach is realistic. The collation tool already loads sprint and task records; extending it to load events from the events directory is a natural addition. The four report sections are well-defined with concrete column layouts. The `padTable()` helper handles variable-width columns, so no new table-formatting logic is needed.

The plan correctly identifies that the sprint directory resolution needs `resolveDir()` to handle both full-ID and short-ID naming conventions.

One minor gap: the plan does not specify what happens if `tokenSource` is absent on some events (pre-existing events without the field). The acceptance criteria mention "unlabelled" as fallback, but the plan should handle this edge case explicitly during aggregation — e.g., treat missing `tokenSource` as a third state for the source label column.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — deferred to T08, consistent with the sprint plan
- **Migration entry targets correct?** Yes — `regenerate: ["tools"]` in T08, which covers `collate.cjs`, `estimate-usage.cjs`, and schema files
- **Security scan requirement acknowledged?** Yes — explicitly acknowledged as bundled with T08

## Security

No security concerns. This is a CJS tool that reads local JSON files and writes a Markdown report. No user-facing Markdown commands are introduced, so prompt injection is not applicable. The schema change is additive (optional field), so no existing data is invalidated.

## Architecture Alignment

- Follows established patterns: `readConfig()` for path resolution, `padTable()` for tables, `writeFile()` for `--dry-run` transparency, `resolveDir()` for directory lookup.
- Preserves `additionalProperties: false` in the event schema — the `tokenSource` field is explicitly added to `properties`.
- Reads paths from `.forge/config.json` via the existing `config.paths.store` and `config.paths.engineering` pattern.

## Testing Strategy

The testing plan is thorough and adequate:
- Syntax checks on both modified CJS files
- `validate-store --dry-run` for schema validation
- Manual smoke test with a real sprint
- Dry-run mode verification
- Zero-token sprint edge case
- MASTER_INDEX.md regression check (diff before/after)

---

## If Approved

### Advisory Notes

1. **Sidecar filter convention:** The plan says to filter event files that "do not start with `_`" (prefix check). The existing `estimate-usage.cjs` uses `!f.includes('_sidecar')` (substring match). Consider aligning both tools to the same convention during implementation. The prefix check (`f.startsWith('_')`) is more general and forward-compatible.

2. **Missing `tokenSource` handling:** Events created before this schema addendum will lack `tokenSource`. The implementation should treat `undefined` as a distinct state (e.g., label as "unknown" or omit the source column entry) rather than silently coercing it.

3. **Numeric formatting:** Consider formatting token counts with locale-aware separators (e.g., `1,234,567`) and cost values to a fixed decimal precision (e.g., `$0.0042`) for readability. The plan does not specify formatting — this is non-blocking but improves report quality.
