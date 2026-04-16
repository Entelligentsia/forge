# FORGE-S07-T05: Implement store-cli.cjs — deterministic store custodian CLI

**Sprint:** FORGE-S07
**Estimate:** L
**Pipeline:** default

---

## Objective

Create `forge/tools/store-cli.cjs` — a new deterministic CLI tool that wraps
`store.cjs` and is the sole authorized path for the probabilistic layer (LLM
workflows) to read and modify the store. Implements write-time schema validation
(R3) and status transition enforcement (R4).

## Acceptance Criteria

1. Tool exists at `forge/tools/store-cli.cjs` and is executable via
   `node forge/tools/store-cli.cjs <command> <args>`

2. **Commands implemented (R1):**
   - `write <entity> '<json>'` — validates against schema, writes via facade; exit 1 + stderr on validation error
   - `read <entity> <id>` — reads and prints entity record; `--json` flag outputs raw JSON
   - `list <entity> [key=value]` — lists entities with optional filter
   - `delete <entity> <id>` — deletes entity record
   - `update-status <entity> <id> <field> <value>` — atomic status update with transition check
   - `emit <sprintId> '<json>'` — writes event via `store.writeEvent()` (ghost-file logic delegated)
   - `emit <sprintId> '<json>' --sidecar` — writes `_{eventId}_usage.json` sidecar
   - `merge-sidecar <sprintId> <eventId>` — reads sidecar, merges token fields into canonical event, deletes sidecar
   - `purge-events <sprintId>` — deletes all events for a sprint via `store.purgeEvents()`
   - `write-collation-state '<json>'` — writes COLLATION_STATE.json via `store.writeCollationState()`
   - `validate <entity> '<json>'` — validates against schema without writing; exit 0/1

3. **Entities:** `sprint`, `task`, `bug`, `event`, `feature`

4. **Schema validation (R3):**
   - Reads schemas from `.forge/schemas/` at startup; falls back to `{forgeRoot}/schemas/`; caches in memory
   - Validates `required`, `type`, `enum`, `additionalProperties: false`, `minimum`
   - On failure: exit 1, stderr one error per line prefixed with field name, no partial write

5. **Status transition enforcement (R4):**
   - Transition tables defined in code (not prose) covering task, sprint, bug, feature
   - `update-status` checks current status → new status is a legal transition
   - "Failed" states (blocked, escalated, etc.) may be entered from any non-terminal state
   - On illegal transition: exit 1, stderr: `"Illegal transition: {entity} {id} {field}: {current} → {new}"`
   - `--force` flag bypasses transition check (for migration/repair scenarios), emits warning

6. **Exit codes:** 0 on success, 1 on failure; human-readable stderr; JSON to stdout where applicable

7. **No new dependencies:** uses only `fs`, `path`, and `require('./store.cjs')`

8. **Acceptance tests:**
   - `node forge/tools/store-cli.cjs write task '{"taskId":"X"}'` exits 1 with validation errors (missing required fields)
   - `node forge/tools/store-cli.cjs validate sprint '{}'` exits 1
   - `node forge/tools/store-cli.cjs read sprint FORGE-S07` exits 0 and prints the sprint record

9. `node --check forge/tools/store-cli.cjs` passes

## Context

Requirements R1, R3, R4, AC2, AC3. See `docs/requirements/store-custodian.md` for
the full command reference and transition tables.

**Legal transition tables to implement in code:**

Task:
```
draft → planned → plan-approved → implementing → implemented
      → review-approved → approved → committed
Failed states (from any non-terminal): plan-revision-required, code-revision-required, blocked, escalated, abandoned
Terminal states: committed, abandoned
```

Sprint:
```
planning → active → completed → retrospective-done
Failed: blocked, partially-completed, abandoned
Terminal: retrospective-done, abandoned
```

Bug:
```
reported → triaged → in-progress → fixed → verified
Terminal: verified
```

Feature:
```
draft → active → shipped / retired
Terminal: shipped, retired
```

**Schema path resolution** must handle:
- `.forge/schemas/` (installed project)
- `{forgeRoot}/schemas/` or `forge/schemas/` (in-tree / canary install)

**Sidecar format** for `emit --sidecar`: writes `_{eventId}_usage.json` with token
fields only (inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens, model,
cost, durationMinutes, startTimestamp, endTimestamp). No ghost-file logic for sidecars.

**Merge-sidecar**: reads the `_` prefixed sidecar, copies token fields into the
canonical event record via `store.writeEvent()`, then deletes the sidecar file.
Fails (exit 1) if sidecar or canonical event is missing.

## Plugin Artifacts Involved

- `forge/tools/store-cli.cjs` — new file

## Operational Impact

- **Version bump:** Required (included in T09)
- **Regeneration:** `tools` target (users running `/forge:update-tools` will get the new CLI)
- **Security scan:** Required (included in T09)
