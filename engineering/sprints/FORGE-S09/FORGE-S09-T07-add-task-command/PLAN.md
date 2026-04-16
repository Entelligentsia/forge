# PLAN — FORGE-S09-T07: Add-task mid-sprint command

🌱 *Forge Engineer*

**Task:** FORGE-S09-T07
**Sprint:** FORGE-S09
**Estimate:** M

---

## Objective

Create a `/forge:add-task` command that lets users add a new task to an existing sprint mid-flight. The command runs a mini intake interview at task scope, determines the target sprint, assigns the next sequential task ID, creates the task directory with TASK_PROMPT.md, writes the task JSON to the store, updates the sprint JSON's `taskIds` array, and runs collate.

## Approach

The command follows the same conversational interview pattern established by `/forge:add-pipeline` and the sprint-intake workflow, but scoped to a single task. The flow is:

1. **Sprint selection** — list active sprints, let the user choose (or accept a `--sprint` argument to skip the prompt)
2. **Mini-intake interview** — capture task title, objective, acceptance criteria, estimate, and pipeline
3. **ID assignment** — scan existing task IDs in the sprint to find the next sequential number (e.g. if T01-T07 exist, assign T08)
4. **Artifact creation** — create the task directory (`{TASK_ID}-{slug}/`), write TASK_PROMPT.md from the template, write the task JSON via `store-cli.cjs write task`, update the sprint JSON via `store-cli.cjs write sprint`
5. **Collate** — run collate to regenerate views
6. **Confirm** — show the user the new task ID, directory, and prompt file location

The command uses `store-cli.cjs` for all store writes (never direct file I/O) and `seed-store.cjs`'s `deriveSlug()` function for directory naming. It reads `.forge/config.json` for paths.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/commands/add-task.md` | **New file** — the `/forge:add-task` command definition | Core deliverable of the task |

No other files in `forge/` need modification. The command reuses existing tools (`store-cli.cjs`, `collate.cjs`, `manage-config.cjs`, `seed-store.cjs`'s `deriveSlug` pattern).

## Plugin Impact Assessment

- **Version bump required?** Yes — new command shipped to all users. Bump from 0.9.12 to 0.9.13.
- **Migration entry required?** Yes — `regenerate: ["commands"]` (users must run `/forge:update` to get the new command).
- **Security scan required?** Yes — new `forge/` file.
- **Schema change?** No — the command uses existing task and sprint schemas unchanged.

## Testing Strategy

- Syntax check: N/A (no JS/CJS files modified)
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (confirm no regressions)
- Manual smoke test: run `/forge:add-task` in this project, add a test task to FORGE-S09, verify directory + TASK_PROMPT.md + task JSON + sprint JSON updated, then delete the test artifacts

## Acceptance Criteria

- [ ] `/forge:add-task` creates a properly slotted task with store entry, directory, and TASK_PROMPT.md
- [ ] The mini-intake captures enough detail for immediate implementation: title, objective, acceptance criteria, and estimate
- [ ] Tasks can be added to any sprint (not just the current one) via `--sprint <ID>` argument
- [ ] The command assigns the next sequential task ID within the target sprint
- [ ] Sprint JSON is updated with the new task ID in the `taskIds` array
- [ ] Collate runs successfully after task addition
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0
- [ ] Version bump to 0.9.13 in `forge/.claude-plugin/plugin.json`
- [ ] Migration entry added to `forge/migrations.json`

## Operational Impact

- **Distribution:** Users must run `/forge:update` after upgrading to get the new command.
- **Backwards compatibility:** Fully backwards-compatible. The new command is additive — no existing commands, schemas, or workflows are altered.