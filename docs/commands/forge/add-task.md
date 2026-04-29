# /forge:add-task

Add a task to an existing sprint without re-running the full sprint planner.

## What it does

Adds a new task to an active or planning sprint. Conducts a focused mini-intake interview, assigns a sequential task ID, writes the task to the store, and collates the knowledge base views.

## Invocation

```
/forge:add-task
/forge:add-task --sprint S01 --title "Add health-check" --estimate M
```

## Flags

| Flag | Purpose |
|------|---------|
| `--sprint <ID>` | Skip sprint selection, use this sprint directly |
| `--title <title>` | Skip title prompt, use this title directly |
| `--estimate <S\|M\|L\|XL>` | Skip estimate prompt, use this estimate directly |

## What happens

1. **Sprint selection.** Lists active and planning sprints. If only one exists, auto-selects it. If you provide `--sprint`, verifies it exists.
2. **Mini-intake interview.** Asks for: title, objective, acceptance criteria, estimate (S/M/L/XL), and pipeline (default or named).
3. **Task ID assignment.** Reads the sprint's task list, finds the highest T-number, increments by one.
4. **Directory creation.** Derives a slug from the title, creates the task directory under the sprint folder.
5. **TASK_PROMPT.md.** Writes the task prompt from the project's template, filling in all interview answers.
6. **Store write.** Writes the task record to `.forge/store/tasks/`.
7. **Sprint update.** Appends the new task ID to the sprint's `taskIds` array.
8. **Collate.** Regenerates knowledge base views (MASTER_INDEX.md, etc.).
9. **Confirm.** Displays the task ID, directory, and next steps.

## Outputs

- Task record in `.forge/store/tasks/`
- `TASK_PROMPT.md` in the task directory
- Updated sprint record
- Regenerated KB views

## Related

- [`/sprint-plan`](../sprint/plan.md) — plan an entire sprint from requirements
- [`/run-task`](../task-pipeline/run-task.md) — execute the task through the pipeline