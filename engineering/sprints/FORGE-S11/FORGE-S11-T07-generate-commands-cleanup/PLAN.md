# PLAN — FORGE-S11-T07: Update generate-commands: add quiz-agent + post-generation flat-file cleanup (#48/#50)

🌱 *Forge Engineer*

**Task:** FORGE-S11-T07
**Sprint:** FORGE-S11
**Estimate:** S

---

## Objective

Two gaps in `forge/init/generation/generate-commands.md` need closing:

1. **#50 — Missing quiz-agent:** `quiz-agent.md` is absent from the explicit output list, so `/{prefix}:quiz-agent` is never installed for users during init or regeneration.
2. **#48 — No flat-file cleanup:** After writing all namespaced command files, the generator does not scan for orphaned flat-path command files (pre-v0.13.0 names). The `rm -f` step from the v0.13.0 migration manual is never automated.

This plan adds `quiz-agent.md` to the known output list and appends a post-generation step that scans `.claude/commands/` for the 13 known flat filenames and interactively prompts the user to remove them.

## Approach

Single file edit to `forge/init/generation/generate-commands.md`:

1. Add `quiz-agent.md` to the **Outputs** list with its argument line, description, effort, and workflow reference.
2. Add `quiz-agent.md` to the **Per-command descriptions** table.
3. Add `quiz-agent.md` to the **Effort levels** table.
4. Add a new **Post-generation flat-file cleanup** section after the manifest recording step, following the interactive pattern described in the acceptance criteria.

The 13 known flat filenames (from v0.13.0 migration notes in `forge/migrations.json`):
`sprint-intake`, `sprint-plan`, `run-task`, `run-sprint`, `plan`, `review-plan`, `implement`, `review-code`, `fix-bug`, `approve`, `commit`, `collate`, `retrospective` — all `.md` suffixed under `.claude/commands/`.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/init/generation/generate-commands.md` | Add quiz-agent to output list, descriptions table, effort table; add post-generation flat-file cleanup step | Closes #50 (missing command) and #48 (no cleanup automation) |

## Plugin Impact Assessment

- **Version bump required?** Yes — command generation behaviour changes (material: new command added to generator, new post-generation step). Version bump is handled in T08.
- **Migration entry required?** Yes — `regenerate: ["commands"]` so users get the updated generator on `/forge:update`. Handled in T08.
- **Security scan required?** Yes — any change to `forge/` requires scan. Handled in T08.
- **Schema change?** No — no store schemas affected.

## Testing Strategy

- No CJS files are modified — `node --check` not applicable.
- `node forge/tools/validate-store.cjs --dry-run` — run to confirm store integrity unchanged.
- Manual review: confirm quiz-agent entry appears in all three tables (Outputs, Descriptions, Effort), workflow reference is `quiz_agent.md`, effort is `medium`, description matches.
- Manual review: confirm post-generation cleanup section covers all 13 flat filenames, implements the yes/skip/none-found logic described in the task prompt.

## Acceptance Criteria

- [ ] `generate-commands.md` Outputs list includes `quiz-agent.md → /{PREFIX}:quiz-agent $ARGUMENTS`
- [ ] Per-command descriptions table includes `quiz-agent.md` with accurate description
- [ ] Effort levels table includes `quiz-agent.md` with `medium` effort
- [ ] Workflow reference in all three places is `.forge/workflows/quiz_agent.md`
- [ ] Post-generation step scans for exactly 13 flat filenames at `.claude/commands/`
- [ ] On `yes`: removes found flat files, confirms each removal
- [ ] On `skip`: reminds user to delete manually
- [ ] If no flat files found: no prompt shown
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users must run `/forge:update` after installing to get the updated command generator. The migration `regenerate: ["commands"]` entry (added in T08) drives this automatically.
- **Backwards compatibility:** Fully backwards compatible. Existing user projects with already-namespaced commands are unaffected. The flat-file cleanup only removes pre-v0.13.0 orphans. If no flat files exist, no prompt is shown.
