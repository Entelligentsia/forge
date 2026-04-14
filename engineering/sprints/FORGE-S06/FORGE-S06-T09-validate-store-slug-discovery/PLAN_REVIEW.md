# PLAN REVIEW — FORGE-S06-T09: Update validate-store discovery for slug-named directories

🌿 *Forge Supervisor*

**Task:** FORGE-S06-T09

---

**Verdict:** Approved

---

## Review Summary

The plan is well-scoped, complete, and correctly aligned with the task prompt's seven acceptance criteria. The approach of adding a Pass 3 filesystem consistency section — using warnings rather than errors — is the correct strategy for maintaining backward compatibility with legacy stores. All plugin impact decisions are correct.

## Feasibility

The approach is realistic and minimal — one file to modify (`forge/tools/validate-store.cjs`), no new dependencies, no schema changes. The regex patterns match the established patterns used in T07 (`seed-store.cjs`). The plan correctly identifies placement (after Events, before Result) to avoid interfering with existing checks.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — 0.7.10 → 0.7.11; tool behaviour change is material
- **Migration entry targets correct?** Yes — `regenerate: []` is correct (validate-store is a run-on-demand tool, not a generated artifact)
- **Security scan requirement acknowledged?** Yes

## Security

No new attack surface. The filesystem walk reads only directory names (not file contents) in `engineering/sprints/`. The `engineeringRoot` value is read from a config file the plugin already trusts. No prompt injection risk — this is a purely procedural CJS tool.

## Architecture Alignment

- Built-ins only (`fs`, `path`) — no npm deps ✅
- `engineeringRoot` read from `.forge/config.json` rather than hardcoded ✅
- Existing `warn()` function reused — no new output format ✅
- All new checks are warnings — no new error conditions that could break existing stores ✅

## Testing Strategy

Testing strategy is adequate: `node --check` + `node forge/tools/validate-store.cjs --dry-run` against the current dogfooding store, which already has slug-named directories. This will exercise the new path-existence checks for all sprint and task records.

---

## If Approved

### Advisory Notes

1. **Filter to directories only**: The implementation must call `fs.statSync(entryPath).isDirectory()` before processing each entry in `sprintsDir` and within each sprint directory — files (e.g. `COST_REPORT.md`) must be skipped silently.
2. **Prefix extraction**: The `{PREFIX}` in the regex should be derived at runtime from the config's `project.prefix` field (same approach used in seed-store T07), so the validation is portable to non-FORGE projects. If config read fails, fall back to the generic `[A-Z]+` character class as planned.
3. **Short task ID resolution**: When matching `^T\d+(-\S+)?$`, the full task ID should be constructed as `{sprintId}-{T\d+}` to correctly resolve `T09-slug` → `FORGE-S06-T09`. Verify this is implemented in the code, not just described in the pseudo-code.
