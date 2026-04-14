# FORGE-S06-T09: Update validate-store discovery for slug-named directories

**Sprint:** FORGE-S06
**Estimate:** M
**Pipeline:** default

---

## Objective

Update `validate-store.cjs` to discover slug-named sprint and task directories on the filesystem and use the `sprint.path` field for referential integrity checks. This closes SPRINT_REQUIREMENTS item 4d.

## Acceptance Criteria

1. Filesystem walk updated to find slug-named sprint directories (matching `{PREFIX}-S\d+(-\S+)?/` pattern)
2. Filesystem walk updated to find slug-named task directories (matching `T\d+(-\S+)?/` or `{PREFIX}-S\d+-T\d+(-\S+)?/`)
3. Referential integrity checks use `path` field on sprints when available
4. `validate-store` passes on a store with slug-named directories; no false positives
5. `validate-store` still passes on legacy stores with bare-ID directories
6. `node --check forge/tools/validate-store.cjs` passes
7. `node forge/tools/validate-store.cjs --dry-run` exits 0

## Context

Currently `validate-store.cjs` doesn't do any filesystem discovery — it reads from the store JSON files via the `store.cjs` facade. The "discovery" is done by `seed-store.cjs`. However, `validate-store` should be able to detect orphaned directories on the filesystem that aren't represented in the store.

Looking at the current code, `validate-store.cjs` doesn't walk the filesystem at all — it only validates the JSON records. The acceptance criteria say "Filesystem walk updated to find slug-named sprint and task directories" — this might mean adding a new check: detect directories in `engineering/sprints/` that don't have a corresponding sprint record in the store.

**What to add:**

1. After the existing validation passes, add a filesystem consistency check:
   - Walk `engineering/sprints/` directories
   - For each directory, try to extract a sprint ID
   - If the sprint ID doesn't exist in the store, report a warning
   - Use slug-aware regex patterns for directory name parsing

2. For referential integrity of `path`:
   - If `sprint.path` is set, verify the directory exists on the filesystem
   - If `sprint.path` is set but the directory doesn't exist, report a warning

3. Regex patterns for slug-aware discovery:
   - Sprint: `^(FORGE-S\d+)(-\S+)?$` → captures the sprint ID
   - Task: `^(T\d+)(-\S+)?$` or `^(FORGE-S\d+-T\d+)(-\S+)?$` → captures the task ID

**Important:** T04 may have modified validate-store.cjs for the ghost event fix. Make sure to work on top of T04's changes.

## Plugin Artifacts Involved

- `forge/tools/validate-store.cjs` — the only file to modify

## Operational Impact

- **Version bump:** required — extends validation coverage
- **Regeneration:** no user action needed
- **Security scan:** required