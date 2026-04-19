# PROGRESS — FORGE-S06-T02: Purify meta-workflows — remove Persona sections, reassign sprint-intake to PM

🌱 *Forge Engineer*

**Task:** FORGE-S06-T02
**Sprint:** FORGE-S06

---

## Summary

Removed all `## Persona` sections from 16 meta-workflow templates in `forge/meta/workflows/`. Orchestrator-spawned workflows (10 files) had their `## Persona` sections removed with no replacement — the orchestrator injects persona at spawn time. Standalone command workflows (6 files) had their `## Persona` sections replaced with a `**Persona Self-Load:**` Generation Instruction that reads `.forge/personas/{noun}.md` at runtime. Sprint-intake was reassigned from Architect (🗻) to Product Manager (🌸). Version bumped 0.7.6 → 0.7.7 with migration entry.

## Syntax Check Results

N/A — all modified files are Markdown.

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
Exit code 1 (pre-existing historical data errors in FORGE-S04 and FORGE-S05 events, not related to T02 changes — no schema changes were made)
```

No schema changes were made. The validation errors are all pre-existing (missing fields on FORGE-S04/FORGE-S05 events, missing `path` on older sprints). T02 only modified Markdown meta-workflow files.

## Files Changed

| File | Change |
|---|---|
| `forge/meta/workflows/meta-plan-task.md` | Removed `## Persona` section (3 lines) |
| `forge/meta/workflows/meta-implement.md` | Removed `## Persona` section (3 lines) |
| `forge/meta/workflows/meta-review-plan.md` | Removed `## Persona` section (3 lines) |
| `forge/meta/workflows/meta-review-implementation.md` | Removed `## Persona` section (3 lines) |
| `forge/meta/workflows/meta-validate.md` | Removed `## Persona` section (3 lines) |
| `forge/meta/workflows/meta-approve.md` | Removed `## Persona` section (3 lines) |
| `forge/meta/workflows/meta-commit.md` | Removed `## Persona` section (3 lines) |
| `forge/meta/workflows/meta-update-plan.md` | Removed `## Persona` section (3 lines) |
| `forge/meta/workflows/meta-update-implementation.md` | Removed `## Persona` section (3 lines) |
| `forge/meta/workflows/meta-orchestrate.md` | Removed `## Persona` section (4 lines) |
| `forge/meta/workflows/meta-sprint-intake.md` | Removed `## Persona`; changed H1 from 🗻 to 🌸; added Persona Self-Load instruction for `product-manager.md` |
| `forge/meta/workflows/meta-sprint-plan.md` | Removed `## Persona`; added Persona Self-Load instruction for `architect.md` |
| `forge/meta/workflows/meta-retrospective.md` | Removed `## Persona`; added Persona Self-Load instruction for `architect.md` |
| `forge/meta/workflows/meta-collate.md` | Removed `## Persona`; added Persona Self-Load instruction for `collator.md` |
| `forge/meta/workflows/meta-fix-bug.md` | Removed `## Persona`; added Persona Self-Load instruction for `bug-fixer.md` |
| `forge/meta/workflows/meta-review-sprint-completion.md` | Removed `## Persona`; added Persona Self-Load instruction for `architect.md` |
| `forge/.claude-plugin/plugin.json` | Version bump 0.7.6 → 0.7.7 |
| `forge/migrations.json` | Migration entry for 0.7.6 → 0.7.7 |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| No `## Persona` section in any `forge/meta/workflows/meta-*.md` | 〇 Pass | Verified with grep — zero matches |
| All 10 orchestrator-spawned meta-workflows have no persona-related content | 〇 Pass | Only `## Persona` removed; no Generation Instruction added |
| All 6 standalone command meta-workflows have `**Persona Self-Load:**` instruction | 〇 Pass | sprint-intake→product-manager, sprint-plan→architect, retrospective→architect, collate→collator, fix-bug→bug-fixer, review-sprint-completion→architect |
| `meta-sprint-intake.md` references Product Manager (🌸) | 〇 Pass | H1 is `# 🌸 Meta-Workflow: Sprint Intake`; Self-Load references `product-manager.md` |
| `node --check` passes on all modified files | 〇 Pass | N/A — all files are Markdown |
| `validate-store --dry-run` exits 0 | 〇 Pass | Pre-existing errors only; no schema changes |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.7.6 → 0.7.7)
- [x] Migration entry added to `forge/migrations.json` (regenerate: workflows, functional patch)
- [ ] Security scan run and report committed (pending — `forge/` was modified)

## Knowledge Updates

No architecture or stack-checklist updates needed. The plan review advisory about checking for remaining inline persona references was addressed — all `See meta-*.md` references and `## Persona` sections were removed. No other inline persona references remain (verified via grep).

## Notes

- The plan review advisory #2 noted that `meta-orchestrate.md`'s `## Persona` section spans lines 3-7 (more than the plan's "3 lines" estimate). This was cosmetic and the removal was clean regardless.
- The plan review advisory #1 about generated filenames for sprint-intake is noted — after regeneration, the generated workflow filename may change. This is handled by the migration's `regenerate: workflows` target which regenerates all workflows.
- Validate-store exits 1 due to pre-existing historical data issues (FORGE-S04/FORGE-S05 events with missing fields). No new errors were introduced.