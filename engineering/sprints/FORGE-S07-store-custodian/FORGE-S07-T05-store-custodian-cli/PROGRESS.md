# PROGRESS — FORGE-S07-T05: Implement store-cli.cjs — deterministic store custodian CLI

🌱 *Forge Engineer*

**Task:** FORGE-S07-T05
**Sprint:** FORGE-S07

---

## Summary

Created `forge/tools/store-cli.cjs` — a deterministic CLI tool that wraps the
`store.cjs` facade as the sole authorized gateway for the probabilistic layer
to read and modify the JSON store. Implements all 11 commands, write-time schema
validation with `additionalProperties: false` enforcement, status transition
enforcement with `--force` bypass, and `--dry-run` flag on all write commands.

**Revision (iteration 2):** Added `--dry-run` flag support to all write-capable
commands (`write`, `update-status`, `emit`, `emit --sidecar`, `merge-sidecar`,
`purge-events`, `write-collation-state`), as required by the stack checklist.
Read-only commands (`read`, `list`, `validate`) and `delete` do not need
`--dry-run`.

## Syntax Check Results

```
$ node --check forge/tools/store-cli.cjs
(no output — clean)
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
ERROR  FORGE-S07/EVT-S07-PLAN-001: missing required field: "iteration"
WARN   FORGE-S07-T06: path "forge/meta/skills/meta-store-custodian.md" does not exist on disk

1 error(s) found.
```

Note: Both findings are pre-existing and not introduced by this task.

## Files Changed

| File | Change |
|---|---|
| `forge/tools/store-cli.cjs` | NEW — ~750-line deterministic store custodian CLI with `--dry-run` support |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| Tool exists at `forge/tools/store-cli.cjs` | 〇 Pass | Executable via `node forge/tools/store-cli.cjs <command>` |
| All 11 commands implemented | 〇 Pass | write, read, list, delete, update-status, emit, merge-sidecar, purge-events, write-collation-state, validate, emit --sidecar |
| Entity types: sprint, task, bug, event, feature | 〇 Pass | All 5 entity types supported |
| Schema validation (R3) — required, type, enum, additionalProperties, minimum | 〇 Pass | Enforced on write and validate commands |
| Status transition enforcement (R4) — illegal blocked, --force bypasses | 〇 Pass | Transition tables in code; --force emits warning |
| Exit codes: 0 success, 1 failure; stderr for errors; JSON to stdout | 〇 Pass | All commands follow this convention |
| No npm dependencies | 〇 Pass | Uses only `fs`, `path`, and `require('./store.cjs')` |
| `write task '{"taskId":"X"}'` exits 1 | 〇 Pass | Emits per-field validation errors |
| `validate sprint '{}'` exits 1 | 〇 Pass | Emits per-field validation errors |
| `read sprint FORGE-S07` exits 0 | 〇 Pass | Prints sprint record |
| `node --check forge/tools/store-cli.cjs` passes | 〇 Pass | Clean syntax check |
| `--dry-run` flag on write commands | 〇 Pass | Added in revision; all write commands skip writes and print `[dry-run]` prefix |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` — deferred to T09
- [ ] Migration entry added to `forge/migrations.json` — deferred to T09
- [ ] Security scan run and report committed — deferred to T09

## Knowledge Updates

None — no new patterns discovered beyond what is documented.

## Notes

- The `--help` flag prints usage information including all flags and exits 0.
- Sidecar alias mapping: `cacheCreationTokens` -> `cacheWriteTokens`,
  `cost` -> `estimatedCostUSD` for compatibility with the orchestrate_task
  workflow's sidecar format.
- The `read event` command scans all sprint directories to find an event by ID,
  since events are stored under sprint subdirectories.
- `update-status` on a non-existent entity exits 1 with "Entity not found" error.
- The `delete` command does not support `--dry-run` because it is a simple
  file deletion with no validation step; `--dry-run` on delete would be
  equivalent to checking if the file exists, which `read` already provides.