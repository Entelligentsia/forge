# Requirements: Store Custodian — Deterministic Store Gateway

## Problem Statement

Forge's JSON store (`.forge/store/`) is the single source of truth for sprints,
tasks, bugs, events, and features. The plugin provides a clean facade
(`forge/tools/store.cjs` + `FSImpl`) for deterministic code, but the
probabilistic layer (LLM-driven workflows and commands) has no way to invoke it.

**Result:** every meta-workflow and several commands instruct the LLM to write
store JSON files directly using the Write/Edit tool, bypassing the facade
entirely. Schema validation is never enforced at write time. The store facade is
effectively dead for the most important consumer in the system.

This document specifies the requirements for a **Store Custodian** — a
deterministic CLI tool and corresponding skill that acts as the sole gateway
between the probabilistic layer and the JSON store.

---

## Terminology

| Term | Meaning |
|------|---------|
| **Store** | The JSON flat-file database at `.forge/store/` |
| **Facade** | `store.cjs` — the `Store` class + `FSImpl` backend |
| **Custodian** | The new CLI tool + skill that wraps the facade, enforces schemas, and is the only authorized gateway for probabilistic code |
| **Probabilistic layer** | LLM-facing workflows, commands, personas, and skills |
| **Deterministic layer** | Node.js CLI tools that run with known inputs/outputs |
| **Sidecar** | An ephemeral `_{eventId}_usage.json` file written by a workflow sub-agent, later merged into the canonical event by the orchestrator |
| **Schema source** | `forge/schemas/*.schema.json` — the canonical JSON Schema definitions |

---

## Audit Findings (Current State)

### F1: Direct store writes by the LLM (HIGH)

All 16 meta-workflow files instruct the LLM to write JSON files directly to
`.forge/store/` paths for:

- **Event emission** — "Emit complete event to `.forge/store/events/{sprintId}/`"
- **Sidecar usage files** — "Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`"
- **Status updates** — "Update task status to X" (LLM reads, modifies, rewrites)
- **Task creation** — "Create task manifests for all planned tasks"

No workflow references `store.cjs` or any store-writing CLI tool, because none
exists.

### F2: Direct store writes by deterministic code (MEDIUM)

| File | Line | Operation | Bypass |
|------|------|-----------|--------|
| `collate.cjs` | 509 | Writes `COLLATION_STATE.json` to store root | Facade |
| `collate.cjs` | 532 | `fs.rmSync` deletes entire event directory | Facade |
| `validate-store.cjs` | 371–378 | Reaches into `store.impl.storeRoot` + `_readJson()` | Encapsulation |

### F3: No write-time schema validation (HIGH)

- `store.cjs` writes data to disk with zero schema checks
- Every `write*()` method is a direct pass-through to `_writeJson()`
- `additionalProperties: false` (declared in all schemas) is never enforced
- The only validation is post-hoc: `validate-store.cjs` as a manual audit tool

### F4: Schema drift (MEDIUM)

The embedded schemas in `validate-store.cjs` have diverged from
`forge/schemas/*.schema.json`:

- Sprint: embedded has `goal`, `features`, `feature_id` absent from standalone
- Task: embedded has `feature_id` absent from standalone

Since v0.6.1, `validate-store.cjs` embeds its own copies and never reads from
the filesystem, making the standalone schema files dead artifacts.

### F5: No invariant enforcement (MEDIUM)

Status transitions are documented in `forge/meta/store-schema/*.md` but never
enforced in code. Any status value can be written to any entity regardless of
the state machine.

---

## Requirements

### R1: Store Custodian CLI Tool

**ID:** R1
**Priority:** P0

A new deterministic CLI tool `forge/tools/store-cli.cjs` that wraps `store.cjs`
and is the sole authorized path for the probabilistic layer to modify the store.

**Commands:**

```
store-cli.cjs write <entity> '<json>'           Write a full entity record
store-cli.cjs read <entity> <id>                Read an entity record
store-cli.cjs read <entity> <id> --json          Read entity, output as JSON
store-cli.cjs list <entity> [filter]             List entities (optional key=value filter)
store-cli.cjs delete <entity> <id>              Delete an entity record
store-cli.cjs update-status <entity> <id> <field> <value>
                                                Atomic status/enum field update with transition check
store-cli.cjs emit <sprintId> '<event-json>'    Write an event (with ghost-file handling)
store-cli.cjs emit <sprintId> '<event-json>' --sidecar
                                                Write a sidecar usage file (ephemeral, _-prefixed)
store-cli.cjs merge-sidecar <sprintId> <eventId>
                                                Merge sidecar into canonical event, delete sidecar
store-cli.cjs purge-events <sprintId>            Delete all events for a sprint
store-cli.cjs write-collation-state '<json>'     Write COLLATION_STATE.json to store root
store-cli.cjs validate <entity> '<json>'         Validate a record against schema without writing
```

**Where `<entity>` is one of:** `sprint`, `task`, `bug`, `event`, `feature`

**Behavior:**

- `write`: validate against schema, reject on validation error (exit 1 + stderr
  message), write via facade on success
- `emit`: same as `write` for entity type `event`, plus ghost-file rename logic
  (delegated to `store.writeEvent()`)
- `emit --sidecar`: validate the sidecar payload (subset schema: token fields
  only), write to `_{eventId}_usage.json`, skip ghost-file logic
- `merge-sidecar`: read sidecar, merge token fields into canonical event via
  `store.writeEvent()`, delete sidecar file. Fail if sidecar or event missing
- `update-status`: read current record, verify the transition is legal per the
  state machine, apply update, write via facade
- `validate`: run schema validation only, report errors, exit 0/1. No write
- All commands exit 0 on success, 1 on failure, with human-readable stderr
- All commands output results to stdout as JSON where applicable

### R2: Schema-as-Source-of-Truth

**ID:** R2
**Priority:** P0

`forge/schemas/*.schema.json` become the single source of truth for all schema
definitions.

**Requirements:**

- `store-cli.cjs` reads schemas from `forge/schemas/` (or `.forge/schemas/`
  in installed projects) at runtime — no embedded copies
- `validate-store.cjs` is updated to read from the same schema files instead of
  embedding its own copies
- When schema files are absent (e.g., before `/forge:update-tools`), fall back
  to a minimal built-in schema that enforces required fields only
- The drift between embedded and standalone schemas is eliminated by removing the
  embedded copies entirely

### R3: Write-Time Validation

**ID:** R3
**Priority:** P0

Every write operation through the custodian validates the payload against the
canonical schema before writing.

**Validation rules:**

- All `required` fields must be present and non-null (except nullable FKs)
- All field types must match schema declarations
- All `enum` values must be in the declared set
- `additionalProperties: false` — reject records with undeclared fields
- `minimum` constraints are enforced for numeric fields

**On validation failure:**

- Exit code 1
- Stderr: one error per line, prefixed with the field name
- No partial write — the store is left unchanged

### R4: Status Transition Enforcement

**ID:** R4
**Priority:** P1

The `update-status` command enforces legal state transitions per the documented
state machines.

**Legal transitions (from `forge/meta/store-schema/*.md`):**

**Task:**
```
draft → planned → plan-approved → implementing → implemented
      → review-approved → approved → committed
Failed: plan-revision-required, code-revision-required, blocked, escalated, abandoned
```

**Sprint:**
```
planning → active → completed → retrospective-done
Failed: blocked, partially-completed, abandoned
```

**Bug:**
```
reported → triaged → in-progress → fixed → verified
```

**Feature:**
```
draft → active → shipped / retired
```

**Requirements:**

- `update-status` reads the current record, checks that `current[field] → new`
  is a legal transition
- If illegal, exit 1 with stderr: `"Illegal transition: {entity} {id}
  {field}: {current} → {new}"`
- "Failed" states (blocked, escalated, etc.) may be entered from any state
  except terminal states (committed, verified, retired, retrospective-done,
  abandoned)
- The transition tables must be defined in code, not in prompt text, so they
  are enforced deterministically

### R5: Store Custodian Skill

**ID:** R5
**Priority:** P0

A new Forge skill `forge:store` that the probabilistic layer invokes instead of
writing files directly.

**Skill file:** `forge/meta/skills/meta-store-custodian.md`

**Skill behavior:**

When invoked, the skill instructs the LLM to run the appropriate
`store-cli.cjs` command. The skill itself does not write files — it always
delegates to the deterministic CLI tool.

**Invocation patterns:**

| Intent | Skill invocation |
|--------|-----------------|
| Write a sprint | `/forge:store write sprint '{...}'` |
| Read a task | `/forge:store read task T01` |
| Update task status | `/forge:store update-status task T01 status implemented` |
| Emit an event | `/forge:store emit S01 '{...}'` |
| Write a sidecar | `/forge:store emit S01 '{...}' --sidecar` |
| Merge a sidecar | `/forge:store merge-sidecar S01 EVT-001` |
| Validate before write | `/forge:store validate task '{...}'` |
| List entities | `/forge:store list task status=planned` |
| Delete an entity | `/forge:store delete task T01` |

**Skill prompt requirements:**

- Always run `node "$FORGE_ROOT/tools/store-cli.cjs" <command> <args>`
- On exit 1, read stderr, fix the data, and retry (max 2 retries)
- On exit 1 after retries, report the validation error to the user and stop
- Never fall back to writing store files directly

### R6: Workflow Migration

**ID:** R6
**Priority:** P0

All 16 meta-workflow files and relevant command files are updated to reference
the store custodian skill instead of instructing direct file writes.

**Changes per workflow:**

| Current instruction | Replacement |
|---------------------|-------------|
| "Emit complete event to `.forge/store/events/{sprintId}/`" | "Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`" |
| "Write a sidecar file at `.forge/store/events/.../{eventId}_usage.json`" | "Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`" |
| "Update task status to X" | "Update task status via `/forge:store update-status task {taskId} status X`" |
| "Update bug status to X" | "Update bug status via `/forge:store update-status bug {bugId} status X`" |
| "Create task manifests" | "Create each task via `/forge:store write task '{task-json}'`" |

**Command changes:**

| Command | Current | Replacement |
|---------|---------|-------------|
| `migrate.md` | "Read JSON, apply mapping, write file back with `JSON.stringify`" | "Apply each migration via `/forge:store write <entity> '{updated-json}'`" |
| `update.md` | "Write `.forge/update-check-cache.json` using Write or Edit tool" | Unchanged — this file is outside `.forge/store/`, not in scope |

**Affected workflow files (all 16):**

1. `meta-plan-task.md`
2. `meta-review-plan.md`
3. `meta-sprint-intake.md`
4. `meta-sprint-plan.md`
5. `meta-orchestrate.md`
6. `meta-retrospective.md`
7. `meta-fix-bug.md`
8. `meta-implement.md`
9. `meta-validate.md`
10. `meta-approve.md`
11. `meta-review-implementation.md`
12. `meta-commit.md`
13. `meta-update-implementation.md`
14. `meta-update-plan.md`
15. `meta-review-sprint-completion.md`
16. `meta-collate.md`

### R7: Facade Gap Closure

**ID:** R7
**Priority:** P1

The three known facade bypasses in deterministic code are closed.

**R7.1: `collate.cjs` COLLATION_STATE write**

Add `writeCollationState(data)` and `readCollationState()` to the `Store` facade
and `FSImpl`. Update `collate.cjs` to use `store.writeCollationState(data)`
instead of direct `writeFile()`.

**R7.2: `collate.cjs` --purge-events**

Add `purgeEvents(sprintId)` to the `Store` facade and `FSImpl`. Update
`collate.cjs` to use `store.purgeEvents(sprintId)` instead of `fs.rmSync()`.

**R7.3: `validate-store.cjs` encapsulation breach**

Add `listEventFilenames(sprintId)` to the `Store` facade and `FSImpl`. This
returns an array of `{filename, id}` objects for event files in a sprint
directory. Update `validate-store.cjs` to use `store.listEventFilenames()`
and `store.getEvent()` instead of reaching into `store.impl`.

### R8: No New Dependencies

**ID:** R8
**Priority:** P0

All implementation uses Node.js built-in modules only. No npm dependencies are
introduced.

`store-cli.cjs` uses `fs`, `path`, and the existing `store.cjs` facade.
Schema validation reuses the `validateRecord()` logic already in
`validate-store.cjs`, refactored into a shared module or duplicated inline.

---

## Out of Scope

The following are explicitly excluded from this enhancement:

- **Schema format changes** — no new fields, no removed fields, no format
  changes to the `.json` schema files themselves (only reconciliation of
  drift between embedded and standalone copies)
- **Database backend** — the FSImpl remains the only backend; no SQLite,
  LevelDB, or other store implementations
- **Event lifecycle redesign** — the sidecar pattern is formalized but not
  replaced; events remain the append-only lifecycle log
- **`update-check-cache.json`** — this file lives outside `.forge/store/` and
  is not subject to the custodian; the `update.md` command's direct write is
  acceptable
- **`.forge/config.json`** — managed by `manage-config.cjs`, not the store
  custodian
- **`.forge/generation-manifest.json`** — managed by `generation-manifest.cjs`,
  not the store custodian

---

## Acceptance Criteria

### AC1: No direct store writes from the probabilistic layer

After the change, `grep -r '.forge/store' forge/meta/workflows/ forge/commands/`
finds zero instructions that tell the LLM to write, edit, or delete store JSON
files directly. All store mutations reference the custodian skill or
`store-cli.cjs`.

### AC2: Schema validation on every write

Running `store-cli.cjs write task '{"taskId":"X"}'` (missing required fields)
exits 1 with validation errors on stderr. No file is written.

### AC3: Status transitions enforced

`store-cli.cjs update-status task T01 status committed` on a task in `draft`
state exits 1 with an illegal-transition error. `draft → planned` succeeds.

### AC4: Schema drift eliminated

The embedded schemas in `validate-store.cjs` are removed.
`validate-store.cjs` reads from `.forge/schemas/` at runtime.
`forge/schemas/*.schema.json` matches the schemas previously embedded in
`validate-store.cjs` (i.e., includes `goal`, `features`, `feature_id` for
sprint; `feature_id` for task).

### AC5: Facade gaps closed

- `collate.cjs` no longer calls `writeFile()` or `fs.rmSync()` on store paths
- `validate-store.cjs` no longer accesses `store.impl.storeRoot` or
  `store.impl._readJson()`
- `store.cjs` exposes `writeCollationState()`, `purgeEvents()`, and
  `listEventFilenames()` on the public `Store` class

### AC6: Existing tests pass

All existing test suites pass without modification. The `--fix` mode in
`validate-store.cjs` still works. `seed-store.cjs` still seeds correctly.
`collate.cjs` still generates markdown. `estimate-usage.cjs` still enriches
events.

### AC7: Store file format unchanged

No changes to the directory layout, file naming, or JSON structure of files in
`.forge/store/`. Existing projects continue to work without migration of their
store data.

---

## Affected Files

### New files

| Path | Purpose |
|------|---------|
| `forge/tools/store-cli.cjs` | Deterministic CLI gateway |
| `forge/meta/skills/meta-store-custodian.md` | Skill definition |
| `forge/meta/tool-specs/store-cli.md` | Tool spec for the CLI |

### Modified files

| Path | Change |
|------|--------|
| `forge/tools/store.cjs` | Add `writeCollationState`, `purgeEvents`, `listEventFilenames` to Store + FSImpl |
| `forge/tools/collate.cjs` | Replace direct fs writes with facade calls |
| `forge/tools/validate-store.cjs` | Remove embedded schemas, read from `.forge/schemas/`; remove `store.impl` access |
| `forge/schemas/sprint.schema.json` | Add `goal`, `features`, `feature_id` to match embedded schema |
| `forge/schemas/task.schema.json` | Add `feature_id` to match embedded schema |
| `forge/meta/workflows/meta-plan-task.md` | Replace direct-write instructions with custodian references |
| `forge/meta/workflows/meta-review-plan.md` | Same |
| `forge/meta/workflows/meta-sprint-intake.md` | Same |
| `forge/meta/workflows/meta-sprint-plan.md` | Same |
| `forge/meta/workflows/meta-orchestrate.md` | Same |
| `forge/meta/workflows/meta-retrospective.md` | Same |
| `forge/meta/workflows/meta-fix-bug.md` | Same |
| `forge/meta/workflows/meta-implement.md` | Same |
| `forge/meta/workflows/meta-validate.md` | Same |
| `forge/meta/workflows/meta-approve.md` | Same |
| `forge/meta/workflows/meta-review-implementation.md` | Same |
| `forge/meta/workflows/meta-commit.md` | Same |
| `forge/meta/workflows/meta-update-implementation.md` | Same |
| `forge/meta/workflows/meta-update-plan.md` | Same |
| `forge/meta/workflows/meta-review-sprint-completion.md` | Same |
| `forge/meta/workflows/meta-collate.md` | Same |
| `forge/commands/migrate.md` | Replace direct-write instructions with custodian references |
| `forge/.claude-plugin/plugin.json` | Version bump |

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LLM ignores the custodian and writes directly | Medium | High — undetected invalid data | `/forge:health` runs `validate-store.cjs` periodically; consider a pre-commit hook that rejects unvalidated store JSON |
| Schema files missing in installed project | Low | Medium — validation fails open | Fallback to built-in minimal schema; `/forge:update-tools` copies schema files; `store-cli.cjs` warns on stderr when using fallback |
| Status transition tables too rigid | Medium | Low — legitimate transitions rejected | Add `--force` flag to `update-status` that skips transition check (for migration/repair scenarios only); log a warning on stderr |
| Sidecar merge race condition | Low | Medium — lost token data if two processes merge simultaneously | File locking not in scope; sidecar writes are sequential in the orchestrator; document that concurrent sidecar writes are unsupported |
| Performance regression from schema reads on every write | Low | Low — schemas are small JSON files, read once and cached | `store-cli.cjs` reads schemas once at startup and caches in memory for the duration of the process |

---

## Relationship to Existing Bugs and Features

| ID | Relationship |
|----|-------------|
| FEAT-001 (Store Abstraction Layer) | This enhancement supersedes FEAT-001 by closing the remaining gaps the original feature left open. FEAT-001 established the facade but did not address probabilistic-layer access or write-time validation. |
| BUG-004 (validate-store rejects valid nulls / no event backfill) | R2 and R3 partially address BUG-004 by making schemas the source of truth and enforcing them at write time. The nullable-FK handling in `validate-store.cjs` must be preserved during refactoring. |
| BUG-002 (validate-store referential integrity incomplete) | R7.3 addresses the encapsulation breach but does not add new referential integrity checks. That remains a separate bug. |