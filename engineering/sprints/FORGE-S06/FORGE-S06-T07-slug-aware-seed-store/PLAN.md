# PLAN — FORGE-S06-T07: Slug-aware seed-store discovery and path construction

**Task:** FORGE-S06-T07
**Sprint:** FORGE-S06
**Estimate:** M

---

## Objective

Update `seed-store.cjs` to discover slug-named sprint and task directories (e.g., `FORGE-S06-post-07-feedback/` containing `T01-fix-persona-lookup/`), auto-derive slugs from titles, and populate the sprint `path` field. This enables seed-store to work correctly with the new descriptive directory naming convention introduced in v0.7.0.

## Approach

The current seed-store uses narrow regex patterns (`/^S\d+$/i` for sprints, `/^T\d+$/i` for tasks) that only match bare numeric IDs. The new convention uses full prefixed IDs with slugs (e.g., `FORGE-S06-T07-slug-aware-seed-store`). The fix replaces these with progressive fallback discovery: try the slug pattern first, then fall back to the legacy bare-ID pattern.

Key changes:
1. **Sprint discovery** — three-tier regex: `{PREFIX}-S{NN}-*` (slug) > `{PREFIX}-S{NN}` (full ID, no slug) > `S{NN}` (bare legacy). Extract sprint ID from the `{PREFIX}-S{NN}` portion.
2. **Task discovery** — three-tier regex: `T{NN}-*` (bare ID with slug) > `{PREFIX}-S{NN}-T{NN}-*` (full ID with slug) > `T{NN}` (bare legacy). Extract task ID using the prefix and sprint number from the parent context.
3. **Bug discovery** — two-tier regex: `{PREFIX}-BUG-{NN}-*` (slug) > `B{NN}` (bare legacy). Extract bug ID from the `{PREFIX}-BUG-{NN}` portion.
4. **Slug derivation** — new `deriveSlug()` function converting titles to lower-kebab-case, truncated to 30 chars.
5. **Sprint `path` field** — populated at seed time: `{engPath}/sprints/{dirName}` where `dirName` is the actual filesystem directory name.
6. **Task `path` field** — already populated; update to use actual directory name instead of constructed path when slug-named dirs exist.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/seed-store.cjs` | Replace sprint/task/bug discovery regexes with slug-aware patterns; add `deriveSlug()` function; populate sprint `path` field; update task `path` construction to use actual directory name | Task requirement — current patterns miss slug-named directories entirely |

## Plugin Impact Assessment

- **Version bump required?** Yes — changes store seeding behavior (affects `forge/tools/seed-store.cjs`)
- **Migration entry required?** Yes — `regenerate: []` (no user action needed, but version tracks the change)
- **Security scan required?** Yes — any change to `forge/` requires a scan
- **Schema change?** No — sprint `path` field already added in FORGE-S06-T06

## Testing Strategy

- Syntax check: `node --check forge/tools/seed-store.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run`
- Manual smoke test: run `node forge/tools/seed-store.cjs --dry-run` in this project and verify it discovers all sprint directories including slug-named ones like `FORGE-S06-T01-fix-orchestrator-persona-lookup`

## Acceptance Criteria

- [ ] Sprint discovery regex matches `FORGE-S06-post-07-feedback/` style directories (prefix + sprint number + slug)
- [ ] Sprint discovery regex matches `FORGE-S06/` style directories (prefix + sprint number, no slug)
- [ ] Sprint discovery regex falls back to `S01/` bare-ID directories
- [ ] Task discovery regex matches `T01-fix-persona-lookup/` (bare task ID with slug)
- [ ] Task discovery regex matches `FORGE-S06-T01-fix-persona/` (full task ID with slug)
- [ ] Task discovery regex falls back to `T01/` bare-ID directories
- [ ] Bug discovery regex matches `BUG-001-sprint-runner-context-accumulation/` (full ID with slug)
- [ ] Bug discovery regex falls back to `B01/` bare-ID directories
- [ ] `deriveSlug()` produces correct lower-kebab-case slugs truncated to ~30 chars
- [ ] Sprint `path` field populated with `{engPath}/sprints/{dirName}` using actual filesystem directory name
- [ ] Task `path` field uses actual directory name (slug-aware)
- [ ] `node --check forge/tools/seed-store.cjs` passes
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0
- [ ] `node forge/tools/seed-store.cjs --dry-run` correctly discovers slug-named directories in this project

## Operational Impact

- **Distribution:** No user action needed — `seed-store` is a bootstrap tool run via `/forge:init` or manually. Existing stores are unaffected.
- **Backwards compatibility:** Full backwards compatibility maintained. Legacy bare-ID directories (`S01/`, `T01/`, `B01/`) are still discovered via fallback. The `path` field is optional in the sprint schema (added as non-required in T06).