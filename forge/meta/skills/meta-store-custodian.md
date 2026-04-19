---
id: store-custodian
name: Store Custodian
description: Delegate all store read/write operations to the deterministic store-cli.cjs gateway.
role: Shared
applies_to: [engineer, architect, bug-fixer, collator, orchestrator, product-manager, qa-engineer, supervisor]
summary: >
  Sole authorised gateway for the probabilistic layer to read and modify the
  JSON store at .forge/store/. All mutations must go through store-cli.cjs.
capabilities:
  - Write sprint, task, bug, feature, and event records via store-cli.cjs
  - Read, list, and validate entities against their JSON schemas
  - Perform atomic status transitions with transition checks
  - Emit events and manage sidecars (merge, purge)
file_ref: .forge/skills/store-custodian-skills.md
---

## Generation Instructions

When generating project-specific skills during `/forge:regenerate skills`, the
generator must include the Store Custodian skill as a standalone skill file in
`.forge/skills/store-custodian-skills.md`. Unlike role-specific skills, this skill is
cross-cutting and is invoked by any persona that needs to read or modify the
JSON store. Do NOT duplicate this content into each role's skill set.

1. Copy this skill verbatim into `.forge/skills/store-custodian-skills.md`.
2. Interpolate `FORGE_ROOT` resolution instructions if the project has a
   configured `paths.forgeRoot` in `.forge/config.json`.
3. Ensure the invocation patterns table is preserved exactly.

## Overview

**Skill invocation:** `/forge:store <command> <args>`

The Store Custodian is the **sole authorized gateway** for the probabilistic
layer (LLM-driven workflows and commands) to read and modify the JSON store at
`.forge/store/`. All store mutations must go through `store-cli.cjs`.

**Hard rule: never fall back to writing store files directly.** If the CLI
fails, read the error, fix the data, and retry. If it persists after retries,
report the error to the user and stop.

## FORGE_ROOT Resolution

Before invoking any store-cli command, resolve the plugin root path:

```
FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)")
```

This reads the `paths.forgeRoot` field from the project config, which is set
during `/forge:init` and refreshed by `/forge:update`. Do NOT hardcode the
plugin install path.

## Invocation

All commands follow this pattern:

```
node "$FORGE_ROOT/tools/store-cli.cjs" <command> <args>
```

Exit codes: **0** on success, **1** on failure (validation error, illegal
transition, entity not found, etc.).

## Invocation Patterns

| Intent | Command |
|--------|---------|
| Write a sprint | `node "$FORGE_ROOT/tools/store-cli.cjs" write sprint '{...}'` |
| Write a task | `node "$FORGE_ROOT/tools/store-cli.cjs" write task '{...}'` |
| Write a bug | `node "$FORGE_ROOT/tools/store-cli.cjs" write bug '{...}'` |
| Write a feature | `node "$FORGE_ROOT/tools/store-cli.cjs" write feature '{...}'` |
| Read a task | `node "$FORGE_ROOT/tools/store-cli.cjs" read task FORGE-S01-T01` |
| Read a task (raw JSON) | `node "$FORGE_ROOT/tools/store-cli.cjs" read task FORGE-S01-T01 --json` |
| Update task status | `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task FORGE-S01-T01 status implemented` |
| Update bug status | `node "$FORGE_ROOT/tools/store-cli.cjs" update-status bug BUG-001 status triaged` |
| Emit an event | `node "$FORGE_ROOT/tools/store-cli.cjs" emit FORGE-S01 '{...event-json...}'` |
| Write a sidecar | `node "$FORGE_ROOT/tools/store-cli.cjs" emit FORGE-S01 '{...sidecar-json...}' --sidecar` |
| Merge a sidecar | `node "$FORGE_ROOT/tools/store-cli.cjs" merge-sidecar FORGE-S01 20260415T141523Z_T01_plan_plan-task` |
| Validate before write | `node "$FORGE_ROOT/tools/store-cli.cjs" validate task '{...}'` |
| List entities | `node "$FORGE_ROOT/tools/store-cli.cjs" list task status=planned` |
| List all sprints | `node "$FORGE_ROOT/tools/store-cli.cjs" list sprint` |
| Delete an entity | `node "$FORGE_ROOT/tools/store-cli.cjs" delete task FORGE-S01-T01` |
| Purge sprint events | `node "$FORGE_ROOT/tools/store-cli.cjs" purge-events FORGE-S01` |
| Write collation state | `node "$FORGE_ROOT/tools/store-cli.cjs" write-collation-state '{...}'` |
| Force a transition | `node "$FORGE_ROOT/tools/store-cli.cjs" update-status task T01 status committed --force` |

## Entity Types

| Entity | ID Field | Directory |
|--------|----------|-----------|
| sprint | `sprintId` | `.forge/store/sprints/` |
| task | `taskId` | `.forge/store/tasks/` |
| bug | `bugId` | `.forge/store/bugs/` |
| event | `eventId` | `.forge/store/events/{sprintId}/` |
| feature | `id` | `.forge/store/features/` |

## Error Handling

On exit code 1:
1. Read stderr for the validation error message.
2. Fix the data that caused the error (missing required fields, illegal
   transition, invalid JSON, etc.).
3. Retry the command (max 2 retries).
4. If the command still fails after retries, report the validation error to
   the user and stop. Do NOT fall back to writing store files directly.

## Commands Reference

### `write <entity> '<json>'`

Write a full entity record. Validates against the schema before writing.
Rejects on validation error (exit 1 + per-field stderr messages). No partial
write on failure.

### `read <entity> <id> [--json]`

Read an entity record. Pretty-printed by default. `--json` outputs raw JSON for
parsing.

### `list <entity> [key=value ...]`

List entities with optional key=value filter pairs. Numeric values are
auto-parsed. Outputs JSON array.

### `delete <entity> <id>`

Delete an entity record. No validation needed.

### `update-status <entity> <id> <field> <value> [--force]`

Atomic status/enum field update with transition check. Reads the current
record, verifies the transition is legal, applies the update, and writes back.
Use `--force` to bypass the transition check (emits a warning on stderr).

### `emit <sprintId> '<json>' [--sidecar]`

Write an event record. With `--sidecar`, writes a `_{eventId}_usage.json`
ephemeral sidecar file instead of a canonical event. Sidecars require only an
`eventId` field; they are merged into the canonical event later.

### `merge-sidecar <sprintId> <eventId>`

Merge sidecar token fields into the canonical event, then delete the sidecar.
Fails if either file is missing.

### `purge-events <sprintId>`

Delete all event files for a sprint.

### `write-collation-state '<json>'`

Write COLLATION_STATE.json to the store root. Delegates to the store facade.

### `validate <entity> '<json>'`

Validate a record against the schema without writing. Reports errors on
stderr, exits 1 on failure, exits 0 on success with `{"ok":true,"valid":true}`.

## Flags

| Flag | Applies to | Effect |
|------|-----------|--------|
| `--dry-run` | All write commands | Validate and preview without writing |
| `--force` | `update-status` | Bypass transition check (warns on stderr) |
| `--json` | `read` | Output raw JSON (no pretty-print) |
| `--sidecar` | `emit` | Write as sidecar file (ephemeral, `_-prefixed`) |