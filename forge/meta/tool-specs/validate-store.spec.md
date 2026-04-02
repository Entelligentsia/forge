# Tool Spec: validate-store

## Purpose

Check store integrity: required fields present, referential integrity
between sprints/tasks/bugs/events, no orphaned records.

## Inputs

- `.forge/config.json` — paths
- `.forge/store/` — all JSON files

## Outputs

- Validation report to stdout
- Exit 0 if valid, 1 if errors found

## CLI Interface

```
<tool> validate-store              # full validation
<tool> validate-store --dry-run    # same checks, just report
<tool> validate-store --fix        # auto-fix where possible (add missing defaults)
```

## Validation Rules

### Required Fields
- Sprint: sprintId, title, status
- Task: taskId, sprintId, title, status
- Bug: bugId, title, severity, status
- Event: eventId, taskId, role, action, startTimestamp

### Referential Integrity
- Every task.sprintId references an existing sprint
- Every event.taskId references an existing task
- Every event.sprintId references an existing sprint
- Every bug.similarBugs[] references existing bugs

### Orphan Detection
- Task directories in `engineering/sprints/` without corresponding store JSON
- Store JSON without corresponding artifact directory

### Status Consistency
- Task status matches artifact presence (e.g., `committed` tasks should have all artifacts)
- Sprint status consistent with task statuses

## Error Handling

- Wrap the entire entry point in a top-level exception handler.
- On unexpected errors (missing files, JSON parse failures, unhandled
  exceptions), print a clear one-line message to stderr and exit 1.
- Never let the tool crash with an unhandled exception or stack trace visible
  to the caller — all errors are caught and reported cleanly.
- Python pattern:
  ```python
  if __name__ == "__main__":
      try:
          sys.exit(main())
      except Exception as e:
          print(f"Error: {e}", file=sys.stderr)
          sys.exit(1)
  ```
- JS/TS pattern:
  ```js
  process.on('uncaughtException', (e) => {
      process.stderr.write(`Error: ${e.message}\n`);
      process.exit(1);
  });
  ```

## Auto-Fix Rules (--fix mode)
- Add missing optional fields with defaults
- Create missing `.gitkeep` files in empty directories
- Do NOT delete orphaned records — only report them
