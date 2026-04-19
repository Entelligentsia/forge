# FORGE-S06-T08: Update collate path resolution for slug-named directories

**Sprint:** FORGE-S06
**Estimate:** S
**Pipeline:** default

---

## Objective

Update `collate.cjs` to resolve sprint directory names from the `sprint.path` field, falling back to ID-based discovery for legacy stores. This closes SPRINT_REQUIREMENTS item 4c.

## Acceptance Criteria

1. When `sprint.path` is set, collate resolves the sprint directory name from it (using `path.basename`)
2. Falls back to `resolveDir` for legacy stores without `path`
3. `collate` generates correct `MASTER_INDEX.md` for a store with slug-named directories
4. `node --check forge/tools/collate.cjs` passes
5. `node forge/tools/validate-store.cjs --dry-run` exits 0

## Context

**Current code in collate.cjs (MASTER_INDEX generation):**
```javascript
const sprintDir = resolveDir(path.join(engRoot, 'sprints'), sprint.sprintId, sprint.sprintId.split('-').pop());
```

This uses `resolveDir` which tries the full sprint ID first, then the trailing segment. It doesn't use the `sprint.path` field.

**The fix:** Add `sprint.path` resolution before the `resolveDir` fallback, similar to how it's already done in the COST_REPORT section:
```javascript
// COST_REPORT section already does this correctly:
if (sprint.path) {
  sprintDirName = path.basename(sprint.path.replace(/\/$/, ''));
} else {
  sprintDirName = resolveDir(...);
}
```

Apply the same pattern to the MASTER_INDEX sprint task link generation.

## Plugin Artifacts Involved

- `forge/tools/collate.cjs` — the only file to modify

## Operational Impact

- **Version bump:** required — changes collate output
- **Regeneration:** no user action needed
- **Security scan:** required