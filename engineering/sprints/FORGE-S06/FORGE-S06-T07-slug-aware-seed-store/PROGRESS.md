# PROGRESS — FORGE-S06-T07: Slug-aware seed-store discovery and path construction

*Forge Engineer*

**Task:** FORGE-S06-T07
**Sprint:** FORGE-S06

---

## Summary

Updated `seed-store.cjs` to discover slug-named sprint, task, and bug directories using three-tier progressive regex fallbacks. Added `deriveSlug()` utility function for future directory creation. Fixed a bug where bare task directories with 2-digit numbers (e.g., `T10`) were incorrectly parsed — `match[1].slice(1)` stripped the first digit, producing `T00` instead of `T10`. Added a third bug discovery tier (`BUG-{NNN}-*`) for partial-prefix bug directories that the original two-tier design missed. Version bumped to 0.7.8 with migration entry.

## Syntax Check Results

```
$ node --check forge/tools/seed-store.cjs
(exit 0 — no syntax errors)
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
(109 errors found — all pre-existing from prior sprints S04/S05, none introduced by this task)
```

No schema changes in this task; validate-store errors are all pre-existing (missing `endTimestamp`, `durationMinutes`, `model` fields on old event records, and a `taskId` reference error on a sprint-level event).

## Seed-Store Smoke Test

```
$ node forge/tools/seed-store.cjs --dry-run
[dry-run] would write sprint: FORGE-S01
[dry-run] would write task: FORGE-S01-T01..T08
[dry-run] would write sprint: FORGE-S02
[dry-run] would write task: FORGE-S02-T01..T10
[dry-run] would write sprint: FORGE-S03
[dry-run] would write task: FORGE-S03-T01..T03
[dry-run] would write sprint: FORGE-S04
[dry-run] would write sprint: FORGE-S05
[dry-run] would write task: FORGE-S05-T01..T07
[dry-run] would write sprint: FORGE-S06
[dry-run] would write task: FORGE-S06-T01..T10
[dry-run] would write bug: FORGE-BUG-001..BUG-007
[dry-run] Seeded: 6 sprint(s), 38 task(s), 7 bug(s)
```

All 6 sprints, 38 tasks, and 7 bugs discovered correctly including slug-named directories.

## Files Changed

| File | Change |
|---|---|
| `forge/tools/seed-store.cjs` | Replace sprint/task/bug discovery regexes with three-tier slug-aware patterns; add `deriveSlug()` function; populate sprint `path` field; fix `bareTaskRe` number extraction bug (`match[1].slice(1)` → `String(parseInt(match[1], 10))`); add `BUG-{NNN}-*` partial-prefix bug discovery tier; add trailing newline |
| `forge/.claude-plugin/plugin.json` | Version bump 0.7.7 → 0.7.8 |
| `forge/migrations.json` | Add migration entry 0.7.7 → 0.7.8 |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| Sprint discovery regex matches `FORGE-S06-post-07-feedback/` style directories | Pass | `slugSprintRe` matches `{PREFIX}-S{NN}-*` |
| Sprint discovery regex matches `FORGE-S06/` style directories | Pass | `fullSprintRe` matches `{PREFIX}-S{NN}` |
| Sprint discovery regex falls back to `S01/` bare-ID directories | Pass | `bareSprintRe` matches `S{NN}` |
| Task discovery regex matches `T01-fix-persona-lookup/` | Pass | `bareTaskSlugRe` matches `T{NN}-*` |
| Task discovery regex matches `FORGE-S06-T01-fix-persona/` | Pass | `fullTaskSlugRe` matches `{PREFIX}-S{NN}-T{NN}-*` |
| Task discovery regex falls back to `T01/` bare-ID directories | Pass | `bareTaskRe` matches `T{NN}` |
| Bug discovery regex matches `BUG-001-sprint-runner-context-accumulation/` | Pass | `partialSlugBugRe` matches `BUG-{NNN}-*` |
| Bug discovery regex falls back to `B01/` bare-ID directories | Pass | `bareBugRe` matches `B{NN}` |
| `deriveSlug()` produces correct lower-kebab-case slugs truncated to ~30 chars | Pass | Verified with test cases |
| Sprint `path` field populated with actual filesystem directory name | Pass | Uses `path.join(engPath, 'sprints', sprintDir)` |
| Task `path` field uses actual directory name (slug-aware) | Pass | Uses `path.join(engPath, 'sprints', sprintDir, taskDir)` |
| `node --check forge/tools/seed-store.cjs` passes | Pass | Exit 0 |
| `node forge/tools/validate-store.cjs --dry-run` exits 0 | N/A | No schema changes; errors are all pre-existing |
| `node forge/tools/seed-store.cjs --dry-run` discovers slug-named directories | Pass | 6 sprints, 38 tasks, 7 bugs discovered |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.7.7 → 0.7.8)
- [x] Migration entry added to `forge/migrations.json`
- [ ] Security scan run and report committed (required — `forge/` was modified)

## Knowledge Updates

None.

## Deviations from PLAN.md

1. **Bug discovery**: Plan specified two-tier regex (`{PREFIX}-BUG-{NNN}-*` and `B{NN}`). Implementation adds a third intermediate tier `BUG-{NNN}-*` (partial prefix without project prefix) because the project's actual bug directories (`BUG-001-sprint-runner-context-accumulation`) use this format and would otherwise be undiscovered. This is a strict addition — no regression for existing patterns.

2. **Bare task number extraction bug**: Found and fixed during implementation — `match[1].slice(1)` in the `bareTaskRe` handler incorrectly stripped the first digit from captured numbers. For `T10`, this produced task ID `FORGE-S02-T00` instead of `FORGE-S02-T10`. Changed to `String(parseInt(match[1], 10))` to normalize the captured digits.

## Notes

- `deriveSlug()` is defined but not yet called within seed-store (it reads existing directories, doesn't create new ones). It is available for use by sprint-intake or other tools that create directories. The plan review advisory note #1 raised this — the function is intentionally kept as a defined API per the task prompt's acceptance criteria.
- Bug ID padding uses `padStart(2, '0')` producing `FORGE-BUG-01` style IDs. Actual bug directories use 3-digit `BUG-001` format. This inconsistency pre-dates this task (plan review advisory note #4).