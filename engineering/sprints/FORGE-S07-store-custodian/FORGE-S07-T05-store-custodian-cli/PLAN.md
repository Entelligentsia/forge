# PLAN — FORGE-S07-T05: Implement store-cli.cjs — deterministic store custodian CLI

🌱 *Forge Engineer*

**Task:** FORGE-S07-T05
**Sprint:** FORGE-S07
**Estimate:** L

---

## Objective

Create `forge/tools/store-cli.cjs` — a deterministic CLI tool that wraps the
`store.cjs` facade and is the sole authorized path for the probabilistic layer
(LLM workflows and commands) to read and modify the JSON store. It implements
write-time schema validation (R3), status transition enforcement (R4), and all
commands specified in the task acceptance criteria (R1).

## Approach

The CLI is a single Node.js CJS script with no external dependencies. It
reuses the schema-loading pattern from `validate-store.cjs` (filesystem-first,
minimal fallback) and adapts its `validateRecord()` logic, adding the missing
`additionalProperties: false` enforcement. Transition tables are hardcoded as
plain JS objects. All store mutations go through `require('./store.cjs')`.

**Structure:**

1. **Schema loader** — reads `.forge/schemas/` then `forge/schemas/`, caches
   at startup, minimal fallback if missing (same resolution as
   `validate-store.cjs`)
2. **Validator** — checks `required`, `type` (including multi-type), `enum`,
   `minimum`, and `additionalProperties: false` — the last one is new compared
   to `validate-store.cjs`
3. **Transition tables** — `TASK_TRANSITIONS`, `SPRINT_TRANSITIONS`,
   `BUG_TRANSITIONS`, `FEATURE_TRANSITIONS` as plain objects; a
   `FAILED_STATES` set for states enterable from any non-terminal
4. **Command dispatch** — switch on `process.argv[2]`, each command is a
   function that parses args, validates, calls the facade, and exits 0/1
5. **Sidecar handling** — `emit --sidecar` writes `_`-prefixed JSON;
   `merge-sidecar` reads sidecar, copies matching token fields into the
   canonical event, deletes sidecar

**Field name alignment:** The orchestrate_task workflow defines sidecar fields
as `cacheWriteTokens` / `estimatedCostUSD` (matching the event schema). The
TASK_PROMPT mentions `cacheCreationTokens` / `cost`. The CLI will accept both
aliases at merge time and map them to the canonical event schema fields
(`cacheWriteTokens`, `estimatedCostUSD`).

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/store-cli.cjs` | NEW — ~450-line CJS script | The core deliverable: CLI gateway for all store operations |

No other files in `forge/` are touched by this task. The skill (T06), workflow
migrations (T07), command migrations (T08), and release engineering (T09) are
separate tasks in this sprint.

## Plugin Impact Assessment

- **Version bump required?** Yes — new tool file is a material change. However,
  the version bump is deferred to T09 (release engineering) which covers all
  S07 changes. T05 does NOT bump the version itself.
- **Migration entry required?** No — deferred to T09.
- **Security scan required?** Yes — any change to `forge/` requires a scan.
  Deferred to T09 along with the version bump.
- **Schema change?** No — T05 does not modify any `forge/schemas/*.schema.json`.

## Testing Strategy

- Syntax check: `node --check forge/tools/store-cli.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (no schema
  changes, but confirms no store corruption)
- Acceptance tests from TASK_PROMPT:
  - `node forge/tools/store-cli.cjs write task '{"taskId":"X"}'` — exits 1 with
    validation errors (missing required fields)
  - `node forge/tools/store-cli.cjs validate sprint '{}'` — exits 1
  - `node forge/tools/store-cli.cjs read sprint FORGE-S07` — exits 0, prints
    sprint record
- Additional manual smoke tests:
  - `update-status` with legal and illegal transitions
  - `emit` with and without `--sidecar`
  - `merge-sidecar` with existing sidecar
  - `list` with and without `key=value` filters
  - `validate` on valid and invalid records
  - `purge-events` (on a test sprint or with `--dry-run` equivalent guard)
  - `delete` on an existing and non-existing entity
  - `--force` flag on `update-status`

## Acceptance Criteria

- [ ] `forge/tools/store-cli.cjs` exists and is executable via
      `node forge/tools/store-cli.cjs <command> <args>`
- [ ] All 11 commands implemented: `write`, `read`, `list`, `delete`,
      `update-status`, `emit`, `merge-sidecar`, `purge-events`,
      `write-collation-state`, `validate`, plus `emit --sidecar` variant
- [ ] Entity types supported: `sprint`, `task`, `bug`, `event`, `feature`
- [ ] Schema validation enforces `required`, `type`, `enum`,
      `additionalProperties: false`, `minimum` — exits 1 on failure with
      per-field stderr errors, no partial write
- [ ] Status transition enforcement on `update-status` — exits 1 with
      `"Illegal transition: ..."` on illegal transitions; `--force` bypasses
      with warning
- [ ] Exit codes: 0 on success, 1 on failure; human-readable stderr; JSON to
      stdout where applicable
- [ ] No npm dependencies — uses only `fs`, `path`, and `require('./store.cjs')`
- [ ] `node --check forge/tools/store-cli.cjs` passes
- [ ] `node forge/tools/validate-store.cjs --dry-run` passes
- [ ] Acceptance tests from TASK_PROMPT all pass:
  - `write task '{"taskId":"X"}'` exits 1
  - `validate sprint '{}'` exits 1
  - `read sprint FORGE-S07` exits 0 and prints the sprint record

## Operational Impact

- **Distribution:** The new CLI ships as part of the `tools` regeneration
  target. Users will get it after running `/forge:update-tools` following the
  T09 version bump.
- **Backwards compatibility:** Fully backward compatible — the CLI is additive.
  No existing tools, commands, or workflows are modified. Existing store data
  is untouched.

## Design Details

### Command Reference

| Command | Args | Facade Call | Notes |
|---|---|---|---|
| `write` | `<entity> '<json>'` | `store.write{Entity}()` | Validates first; rejects on error |
| `read` | `<entity> <id> [--json]` | `store.get{Entity}()` | Pretty-print by default; `--json` for raw |
| `list` | `<entity> [key=value]` | `store.list{Entities}(filter)` | Filter parsed from `key=value` pairs |
| `delete` | `<entity> <id>` | `store.delete{Entity}()` | No validation needed |
| `update-status` | `<entity> <id> <field> <value> [--force]` | `store.get{Entity}()` + transition check + `store.write{Entity}()` | Reads current, checks transition, applies update |
| `emit` | `<sprintId> '<json>' [--sidecar]` | `store.writeEvent()` | With `--sidecar`: writes `_{eventId}_usage.json`, no ghost logic |
| `merge-sidecar` | `<sprintId> <eventId>` | `store.getEvent()` + `store.writeEvent()` | Reads sidecar, merges token fields, deletes sidecar |
| `purge-events` | `<sprintId>` | `store.purgeEvents()` | Delegates to facade |
| `write-collation-state` | `'<json>'` | `store.writeCollationState()` | Delegates to facade |
| `validate` | `<entity> '<json>'` | None | Validation only, no write |

### Transition Tables

```
TASK_TRANSITIONS = {
  draft:                 ['planned', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  planned:               ['plan-approved', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  'plan-approved':       ['implementing', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  implementing:          ['implemented', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  implemented:           ['review-approved', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  'review-approved':     ['approved', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  approved:              ['committed', 'plan-revision-required', 'code-revision-required', 'blocked', 'escalated', 'abandoned'],
  // Terminal: committed, abandoned — no transitions out
}

SPRINT_TRANSITIONS = {
  planning:    ['active', 'blocked', 'partially-completed', 'abandoned'],
  active:      ['completed', 'blocked', 'partially-completed', 'abandoned'],
  completed:   ['retrospective-done', 'blocked', 'partially-completed', 'abandoned'],
  // Terminal: retrospective-done, abandoned
}

BUG_TRANSITIONS = {
  reported:    ['triaged'],
  triaged:     ['in-progress'],
  'in-progress': ['fixed'],
  fixed:       ['verified'],
  // Terminal: verified
}

FEATURE_TRANSITIONS = {
  draft:   ['active'],
  active:  ['shipped', 'retired'],
  // Terminal: shipped, retired
}
```

### Entity ID Field Mapping

| Entity | ID Field | Used for file path |
|---|---|---|
| sprint | `sprintId` | `sprints/{sprintId}.json` |
| task | `taskId` | `tasks/{taskId}.json` |
| bug | `bugId` | `bugs/{bugId}.json` |
| event | `eventId` | `events/{sprintId}/{eventId}.json` |
| feature | `id` | `features/{id}.json` |

Note: `feature` uses `id` (not `feature_id`) as its primary key. The `feature_id`
field on sprint/task is a foreign key pointing to `feature.id`.

### Schema Path Resolution

Identical to `validate-store.cjs`:
1. `.forge/schemas/{type}.schema.json` (project-installed)
2. `forge/schemas/{type}.schema.json` (in-tree source, for dogfooding)
3. Minimal fallback: `{ type: 'object', required: [...], properties: {} }`
   with stderr warning

### Sidecar Format

The sidecar file (`_{eventId}_usage.json`) uses a subset schema. Accepted
fields at write time: `inputTokens`, `outputTokens`, `cacheReadTokens`,
`cacheWriteTokens`, `estimatedCostUSD`, `model`, `cost`, `durationMinutes`,
`startTimestamp`, `endTimestamp`, `cacheCreationTokens` (alias for
`cacheWriteTokens`). The merge-sidecar command maps `cacheCreationTokens`
to `cacheWriteTokens` and `cost` to `estimatedCostUSD` when merging.

### Additional Properties Validation

This is the key gap in the current `validate-store.cjs` — it does not check
`additionalProperties: false`. The CLI will enforce it: any key in the data
that is not declared in `schema.properties` produces an error of the form
`"undeclared field: \"{key}\""`. This prevents schema drift at write time.