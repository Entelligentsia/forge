# PLAN — FORGE-S06-T08: Update collate path resolution for slug-named directories

🌱 *Forge Engineer*

**Task:** FORGE-S06-T08
**Sprint:** FORGE-S06
**Estimate:** S

---

## Objective

Update `collate.cjs` so that MASTER_INDEX.md sprint task links resolve the sprint directory name from `sprint.path` (when present), instead of always using `resolveDir`. This mirrors the fix already applied to the COST_REPORT section and closes SPRINT_REQUIREMENTS item 4c.

## Approach

In `generateMasterIndex()`, the `sprintDir` variable is used as a fallback path segment when building task links for tasks without `t.path` set. Currently it always calls `resolveDir(...)`, which has no awareness of the `sprint.path` field.

The fix is a one-liner: check `sprint.path` first (take `path.basename(sprint.path)`) and fall through to the existing `resolveDir` call for legacy stores. This is identical to the pattern already used in the COST_REPORT section (lines 321–325 of collate.cjs).

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/collate.cjs` | Replace `const sprintDir = resolveDir(...)` with a conditional that prefers `sprint.path` | Matches existing COST_REPORT pattern; enables slug-named sprint directories |

## Plugin Impact Assessment

- **Version bump required?** Yes — behaviour change in a shipped tool (`collate.cjs`)
- **Migration entry required?** Yes — `regenerate: []` (no user regeneration needed; collate runs on demand)
- **Security scan required?** Yes — any change to `forge/` requires a scan
- **Schema change?** No

## Testing Strategy

- Syntax check: `node --check forge/tools/collate.cjs`
- Store validation: not required (no schema changes)
- Manual smoke test: run `node forge/tools/collate.cjs` and verify MASTER_INDEX.md task links for FORGE-S06 tasks reference `FORGE-S06/FORGE-S06-T08-collate-slug-path-resolution/INDEX.md` (slug path), not a path based on the bare sprint ID

## Acceptance Criteria

- [ ] When `sprint.path` is set, `sprintDir` is derived from `path.basename(sprint.path)` in the MASTER_INDEX section
- [ ] Falls back to `resolveDir` for sprints without `path`
- [ ] `node --check forge/tools/collate.cjs` passes
- [ ] MASTER_INDEX.md task links for FORGE-S06 point to correct slug-named directories

## Operational Impact

- **Distribution:** Users must re-run `collate` (or `/forge:collate`) to get corrected links; no forced update needed
- **Backwards compatibility:** Full — `sprint.path` absence falls back to existing `resolveDir` behaviour
