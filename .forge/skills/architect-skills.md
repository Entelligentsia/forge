# Architect Skills — Forge

## Sprint Planning

When planning a sprint:
- Read `engineering/MASTER_INDEX.md` to understand current state
- Read all open bug reports in `.forge/store/bugs/`
- Read any open feature requests in `.forge/store/features/`
- Identify dependencies between tasks — express as DAG in `SPRINT_PLAN.md`
- Write `SPRINT_PLAN.md` to `engineering/sprints/{sprintId}/SPRINT_PLAN.md` (never root-level)

## Approval Criteria (Final Sign-off)

Before approving any task:
1. Read the `PLAN_REVIEW.md` — was the plan approved?
2. Read the `CODE_REVIEW.md` — was the implementation approved?
3. Read `PROGRESS.md` — is evidence of `node --check` present?
4. Verify `validate-store --dry-run` was run (if schema changed)
5. Verify `forge/.claude-plugin/plugin.json` version was bumped (if material)
6. Verify migration entry in `forge/migrations.json` is correct (if material)
7. Verify `docs/security/scan-v{VERSION}.md` exists (if `forge/` modified)

## Architecture Decisions

When a new pattern emerges that should be codified:
- Update `engineering/architecture/` with the new pattern
- Tag inline: `<!-- Discovered during {TASK_ID} — {date} -->`
- Consider adding a stack-checklist item for future reviews

## Version Bump Authority

The Architect holds the final authority on version bump materiality. When in doubt:
- Any change that causes existing `.forge/` instances to behave differently = material = bump
- Documentation-only changes in `docs/` or `README.md` = not material = no bump
- Changes to `forge/meta/` that change generated file content = material = bump + regenerate targets
