# FORGE-S06-T07: Slug-aware seed-store discovery and path construction

**Sprint:** FORGE-S06
**Estimate:** M
**Pipeline:** default

---

## Objective

Update `seed-store.cjs` to discover slug-named sprint and task directories (e.g., `FORGE-S06-post-07-feedback/` containing `T01-fix-persona-lookup/`) and auto-derive slugs from titles. Populate the sprint `path` field. This closes SPRINT_REQUIREMENTS item 4b.

## Acceptance Criteria

1. Discovery regex updated to match `FORGE-SNN-*` (or `{PREFIX}-SNN-*`) patterns for sprint directories, not just bare `S\d+`
2. Task discovery regex updated to match `TNN-*` (or `FORGE-SNN-TNN-*`) patterns, not just bare `T\d+`
3. Slug auto-derived from `title` at creation time: lower-kebab-case, truncated to ~30 chars
4. Sprint `path` field populated at seed time
5. `seed-store` correctly seeds a store from a directory named `FORGE-S06-post-07-feedback/` containing `T01-fix-persona-lookup/`
6. Legacy bare-ID directories (`S01/`, `T01/`) still discovered via fallback
7. `node --check forge/tools/seed-store.cjs` passes
8. `node forge/tools/validate-store.cjs --dry-run` exits 0

## Context

**Current discovery code in seed-store.cjs:**
```javascript
const sprintDirs = fs.readdirSync(sprintsDir)
  .filter(e => /^S\d+$/i.test(e) && ...)
```

This only matches bare `S01/`, `S02/` etc. It doesn't match `FORGE-S06-remediation-sprint/` or `S06-post-feedback/`.

**New discovery logic:**

For sprint directories:
1. First try: match `{PREFIX}-S{NN}-*` pattern (e.g., `FORGE-S06-post-07-feedback`)
2. Second try: match `S\d+` pattern (e.g., `S06`) — legacy fallback
3. Extract sprint ID from the directory name (the `{PREFIX}-S{NN}` part)

For task directories within a sprint:
1. First try: match `T\d+-*` pattern (e.g., `T01-fix-persona-lookup`)
2. Second try: match `FORGE-S{NN}-T{NN}-*` pattern (e.g., `FORGE-S06-T01-fix-persona`)
3. Third try: match bare `T\d+` pattern (e.g., `T01`) — legacy fallback
4. Extract task ID from the directory name

**Slug derivation:**
```javascript
function deriveSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // non-alphanumeric → hyphens
    .replace(/^-|-$/g, '')         // strip leading/trailing hyphens
    .slice(0, 30)                  // truncate
    .replace(/-$/g, '');           // strip trailing hyphen after truncation
}
```

**Path construction:**
For sprints: `path = "{engPath}/sprints/{dirName}"` where `dirName` is the actual filesystem directory name (may include slug).

## Plugin Artifacts Involved

- `forge/tools/seed-store.cjs` — the only file to modify

## Operational Impact

- **Version bump:** required — changes store seeding behavior
- **Regeneration:** no user action needed
- **Security scan:** required