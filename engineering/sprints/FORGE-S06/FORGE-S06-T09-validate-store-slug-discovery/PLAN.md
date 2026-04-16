# PLAN — FORGE-S06-T09: Update validate-store discovery for slug-named directories

🌱 *Forge Engineer*

**Task:** FORGE-S06-T09
**Sprint:** FORGE-S06
**Estimate:** M

---

## Objective

Add filesystem consistency checks to `validate-store.cjs` so it can:
1. Walk `engineering/sprints/` and detect directories that have no corresponding sprint record in the store (using slug-aware regex patterns).
2. Walk each sprint's task sub-directories and detect directories that have no corresponding task record in the store.
3. Verify that when a sprint or task record has a `path` field, the path actually exists on disk.

This closes SPRINT_REQUIREMENTS item 4d and works with the `path` field added in T06, the slug-aware `seed-store.cjs` (T07), and slug-aware `collate.cjs` (T08).

## Approach

`validate-store.cjs` currently validates only the JSON records — it reads from the store via the `store.cjs` facade. No filesystem walk is performed. This task adds a **Pass 3: Filesystem consistency** section after the existing validation passes.

The new pass will:

1. Determine the `engineeringRoot` from the config (`config.paths.engineering`, defaulting to `engineering`).
2. Walk `{engineeringRoot}/sprints/` for subdirectories.
3. For each directory, attempt to extract a sprint ID using slug-aware regex: `^([A-Z]+-S\d+)(-\S+)?$`.
4. If no sprint record exists for that ID in the store, emit a `WARN`.
5. Walk each sprint directory for task subdirectories.
6. For each task directory, attempt to extract a task ID using slug-aware regex: `^([A-Z]+-S\d+-T\d+)(-\S+)?$` or fallback `^(T\d+)(-\S+)?$` (resolved using sprint prefix).
7. If no task record exists for that ID, emit a `WARN`.
8. If a sprint record has a non-empty `path` field, verify the directory exists; if not, emit a `WARN`.
9. If a task record has a non-empty `path` field, verify the directory exists; if not, emit a `WARN`.

All new checks are **warnings** (not errors) — they should not fail validation for legacy stores or partially-seeded projects. The existing error/warning counts will include them in the final summary.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/validate-store.cjs` | Add Pass 3 filesystem consistency section | Closes 4d; detects orphaned directories and dangling path fields |

## Plugin Impact Assessment

- **Version bump required?** Yes — extends validation coverage in a shipped tool (`validate-store.cjs`)
- **Migration entry required?** Yes — `regenerate: []` (no user regeneration needed; validate-store runs on demand)
- **Security scan required?** Yes — any change to `forge/` requires a scan
- **Schema change?** No — `path` was added to sprint schema in T06; this task only adds filesystem cross-checks

## Implementation Detail

### Reading `engineeringRoot` from config

```js
// Near top of validate-store.cjs, after store is required
const CONFIG_PATH = '.forge/config.json';
let engineeringRoot = 'engineering';
try {
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  engineeringRoot = (cfg.paths && cfg.paths.engineering) || 'engineering';
} catch (_) {}
```

### Sprint directory regex

```js
const SPRINT_DIR_RE = /^([A-Z]+-S\d+)(-\S+)?$/;
```

This matches `FORGE-S06`, `FORGE-S06-t09-slug`, etc. Captures group 1 = sprint ID.

### Task directory regex

```js
const TASK_FULL_RE  = /^([A-Z]+-S\d+-T\d+)(-\S+)?$/;  // e.g. FORGE-S06-T09-my-task
const TASK_SHORT_RE = /^(T\d+)(-\S+)?$/;               // e.g. T09-my-task (legacy)
```

### Pass 3 structure

```
// --- Pass 3: Filesystem consistency ---
const sprintsDir = path.join(engineeringRoot, 'sprints');
if (fs.existsSync(sprintsDir)) {
  for each entry in fs.readdirSync(sprintsDir) that is a directory:
    match against SPRINT_DIR_RE → extract sprintId
    if sprintId && !sprintIds.has(sprintId):
      warn(sprintId, `directory "${entry}" has no sprint record in store`)
    else if sprintId:
      walk entry for task subdirectories:
        match against TASK_FULL_RE or TASK_SHORT_RE (with sprint prefix)
        if taskId && !taskIds.has(taskId):
          warn(taskId, `directory "${entry}/${taskEntry}" has no task record in store`)
}

// path field cross-check (sprints)
for sprint in sprints:
  if sprint.path && !fs.existsSync(sprint.path):
    warn(sprint.sprintId, `path "${sprint.path}" does not exist on disk`)

// path field cross-check (tasks)
for task in tasks:
  if task.path && !fs.existsSync(task.path):
    warn(task.taskId, `path "${task.path}" does not exist on disk`)
```

### Placement

Pass 3 is inserted **after** the Events section and **before** the `// --- Result ---` section, so it does not interfere with existing checks.

## Testing Strategy

- Syntax check: `node --check forge/tools/validate-store.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run`
  - Must pass (exit 0) against the current dogfooding store with slug-named directories
  - Should produce no new false-positive errors (warnings for unmapped dirs are OK)
- Manual smoke test: verify the warning format is human-readable in the output

## Acceptance Criteria

- [ ] Filesystem walk in `validate-store.cjs` finds slug-named sprint directories matching `^([A-Z]+-S\d+)(-\S+)?$`
- [ ] Filesystem walk finds slug-named task directories matching `^([A-Z]+-S\d+-T\d+)(-\S+)?$` or `^T\d+(-\S+)?$`
- [ ] If a sprint directory is present with no store record, a `WARN` is emitted (not an error)
- [ ] If a task directory is present with no store record, a `WARN` is emitted (not an error)
- [ ] If `sprint.path` is set and does not exist on disk, a `WARN` is emitted
- [ ] If `task.path` is set and does not exist on disk, a `WARN` is emitted
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0 on current dogfooding store
- [ ] `node --check forge/tools/validate-store.cjs` passes
- [ ] Legacy stores with bare `SNN/` directory names still pass (no false positives)

## Operational Impact

- **Distribution:** No user action needed; `validate-store` runs on demand; new warnings are informational
- **Backwards compatibility:** Full — all new checks are warnings; no existing errors added; old stores with bare-ID directories will still pass (regex either matches or produces no ID match → no warning emitted)
