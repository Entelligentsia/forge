# Generation: Commands

## Purpose

Generate standalone slash commands in `.claude/commands/` that serve as
entry points to the generated workflows.

## Inputs

- Generated workflows (from Phase 5) — their exact filenames and paths
- `.forge/config.json` — project prefix, paths

## Outputs

`.claude/commands/` with non-namespaced commands:
- `sprint-intake.md` → `/sprint-intake`
- `plan.md` → `/plan {TASK_ID}`
- `review-plan.md` → `/review-plan {TASK_ID}`
- `implement.md` → `/implement {TASK_ID}`
- `review-code.md` → `/review-code {TASK_ID}`
- `fix-bug.md` → `/fix-bug {BUG_ID}`
- `sprint-plan.md` → `/sprint-plan`
- `run-task.md` → `/run-task {TASK_ID}`
- `run-sprint.md` → `/run-sprint {SPRINT_ID} [--parallel]`
- `collate.md` → `/collate [SPRINT_ID]`
- `retrospective.md` → `/retrospective {SPRINT_ID}`
- `approve.md` → `/approve {TASK_ID}`
- `commit.md` → `/commit {TASK_ID}`

## Instructions

**Scope boundary:** Only ever read, write, or delete files in the explicit output list above.
Never touch any other file in `.claude/commands/` — custom commands, project-specific
wrappers, and unrecognised files must be left completely untouched.

**Pre-generation check (idempotency):** For each command file listed above, before writing:
1. If the file does not exist — write it fresh.
2. If the file exists — read it and extract the workflow path it references (the `.forge/workflows/` path).
   - If it does NOT reference `.forge/workflows/` — overwrite and log: `Replaced stale command: <filename>`.
   - If it references `.forge/workflows/` but that workflow file **does not exist on disk** — overwrite and log: `Replaced command pointing to missing workflow: <filename>`.
   - If it references `.forge/workflows/` and the workflow file exists — skip it (already up to date).

This ensures renamed workflows (e.g. `engineer_plan_task.md` → `plan_task.md`) cause the command wrappers to be regenerated rather than silently left pointing at a missing file.

Each command file should:
1. Set `effort:` frontmatter according to the table below
2. Load the corresponding workflow from `.forge/workflows/`
3. Load `engineering/MASTER_INDEX.md` for context
4. Pass `$ARGUMENTS` as the task/sprint/bug ID
5. Be clear, greppable, and self-contained

**Effort levels** — use `effort:` frontmatter (capability request, model-agnostic):

| Command | effort | Rationale |
|---|---|---|
| `review-plan.md` | `max` | Architectural gate — needs deepest reasoning |
| `review-code.md` | `max` | Quality gate — needs deepest reasoning |
| `approve.md` | `max` | Final approval gate |
| `plan.md` | `high` | Design work with broad codebase context |
| `implement.md` | `high` | Non-trivial code generation |
| `fix-bug.md` | `high` | Diagnosis + fix |
| `sprint-plan.md` | `high` | Decomposition and dependency analysis |
| `run-task.md` | `high` | Full task orchestration |
| `run-sprint.md` | `high` | Multi-task orchestration |
| `sprint-intake.md` | `high` | Structured requirements elicitation |
| `retrospective.md` | `medium` | Reflection and summary |
| `collate.md` | `low` | Mechanical markdown regeneration |
| `commit.md` | `low` | Staging and committing completed work |

Do **not** include `model:` frontmatter — that directive pins a specific model and is
not appropriate for user command files.

After writing each command file, record it in the generation manifest:
```sh
node "$FORGE_ROOT/tools/generation-manifest.cjs" record {paths.commands}/{filename}.md
```

(`FORGE_ROOT` is available from the parent init flow; tool invocations use `$FORGE_ROOT/tools/` throughout.)
