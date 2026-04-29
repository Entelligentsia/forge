# Store CLI Reference

`store-cli.cjs` is the deterministic interface to the Forge store. All store writes go through it. Direct file writes to `.forge/store/` are blocked by the write-boundary hook.

---

## Commands

### write

Write a full entity record. Validates against schema before writing.

```bash
node store-cli.cjs write sprint '{"sprintId":"FORGE-S01","title":"Sprint 1","status":"planning","taskIds":[],"createdAt":"2026-04-29T10:00:00.000Z"}'
```

### read

Read an entity record.

```bash
node store-cli.cjs read task FORGE-S01-T01
node store-cli.cjs read task FORGE-S01-T01 --json   # raw JSON, no pretty-print
```

### list

List entities with optional key=value filters.

```bash
node store-cli.cjs list sprint
node store-cli.cjs list task status=implementing sprintId=FORGE-S01
node store-cli.cjs list bug severity=critical
```

### delete

Delete an entity record.

```bash
node store-cli.cjs delete task FORGE-S01-T01
```

### update-status

Update a status or enum field with transition enforcement.

```bash
node store-cli.cjs update-status task FORGE-S01-T01 status implementing
node store-cli.cjs update-status task FORGE-S01-T01 status code-revision-required --force
```

Transition rules prevent illegal state changes. Use `--force` to bypass (with a warning).

### emit

Write an event (canonical or sidecar).

```bash
# Canonical event
node store-cli.cjs emit FORGE-S01 '{"eventId":"...","taskId":"FORGE-S01-T01","sprintId":"FORGE-S01","role":"Engineer","action":"/implement","phase":"implement","iteration":1,"startTimestamp":"2026-04-29T10:00:00.000Z","endTimestamp":"2026-04-29T10:15:00.000Z","durationMinutes":15,"model":"sonnet"}'

# Sidecar (token usage)
node store-cli.cjs emit FORGE-S01 '{"eventId":"...","inputTokens":50000,"outputTokens":12000,"estimatedCostUSD":0.35}' --sidecar
```

### merge-sidecar

Merge a sidecar file into its canonical event. Deletes the sidecar after merging.

```bash
node store-cli.cjs merge-sidecar FORGE-S01 20260415T141523Z_FORGE-S01-T01_engineer_implement
```

### record-usage

Write a token usage sidecar with individual flags.

```bash
node store-cli.cjs record-usage FORGE-S01 20260415T141523Z_FORGE-S01-T01_engineer_implement \
  --input-tokens 50000 \
  --output-tokens 12000 \
  --cache-read-tokens 30000 \
  --cache-write-tokens 5000 \
  --estimated-cost-usd 0.35 \
  --token-source reported
```

### purge-events

Delete all event files for a sprint.

```bash
node store-cli.cjs purge-events FORGE-S01
node store-cli.cjs purge-events FORGE-S01 --dry-run    # preview only
```

Includes a path-traversal guard. The resolved directory must stay within the events base.

### progress

Append a progress entry to the task or bug log.

```bash
node store-cli.cjs progress FORGE-S01-T01 Engineer bloom start "Beginning implementation"
node store-cli.cjs progress FORGE-S01-T01 Engineer ember done "Implementation complete"
```

Status values: `start`, `progress`, `done`, `error`.

### progress-clear

Clear (truncate) the progress log.

```bash
node store-cli.cjs progress-clear FORGE-S01-T01
```

### validate

Validate a JSON record against the entity schema without writing.

```bash
node store-cli.cjs validate task '{"taskId":"FORGE-S01-T01","sprintId":"FORGE-S01",...}'
```

### set-summary / set-bug-summary

Write a terse phase summary to a task or bug record.

```bash
node store-cli.cjs set-summary FORGE-S01-T01 plan /tmp/summary.json
node store-cli.cjs set-bug-summary FORGE-BUG-001 implementation /tmp/summary.json
```

Valid phases: `plan`, `review_plan`, `implementation`, `code_review`, `validation`.

### write-collation-state

Write the COLLATION_STATE.json record.

```bash
node store-cli.cjs write-collation-state '{"collatedAt":"2026-04-29T10:30:00.000Z","featureCount":2,"sprintCount":3,"taskCount":8,"bugCount":1}'
```

### query / nlp / schema

Delegates to `store-query.cjs` for natural language queries, exact-flag queries, and schema dumps.

```bash
node store-cli.cjs nlp "open bugs in S02"
node store-cli.cjs query --sprint FORGE-S02 --status implementing
node store-cli.cjs schema sprint
```

---

## Flags

| Flag | Applies to | Effect |
|------|-----------|--------|
| `--dry-run` | All write commands | Validate and preview without writing |
| `--force` | `update-status` | Bypass transition check (emits warning) |
| `--json` | `read` | Output raw JSON, no pretty-print |
| `--sidecar` | `emit` | Write as ephemeral sidecar file |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Failure — validation error, illegal transition, entity not found, etc. |