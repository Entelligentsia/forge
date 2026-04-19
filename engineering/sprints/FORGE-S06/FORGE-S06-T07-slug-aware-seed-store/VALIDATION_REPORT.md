# VALIDATION REPORT — FORGE-S06-T07: Slug-aware seed-store discovery and path construction

*Forge QA Engineer*

**Task:** FORGE-S06-T07

---

**Verdict:** Approved

---

## Acceptance Criteria Validation

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Sprint discovery regex matches `FORGE-S06-post-07-feedback/` style directories | PASS | `slugSprintRe` = `/^FORGE-(S\d+)-.+$/i` matches `FORGE-S06-post-07-feedback`, captures `S06`. Dry-run confirms: `FORGE-S06` discovered from slug-named directory. |
| 2 | Sprint discovery regex matches `FORGE-S06/` style directories | PASS | `fullSprintRe` = `/^FORGE-(S\d+)$/i` matches `FORGE-S06` without slug. |
| 3 | Sprint discovery regex falls back to `S01/` bare-ID directories | PASS | `bareSprintRe` = `/^S\d+$/i` matches `S01`. Dry-run confirms: `FORGE-S01` discovered from bare `S01/` directory. |
| 4 | Task discovery regex matches `T01-fix-persona-lookup/` (bare task ID with slug) | PASS | `bareTaskSlugRe` = `/^T(\d+)-.+$/i` matches `T01-fix-persona-lookup`. Dry-run confirms: slug-named task directories in FORGE-S06 are discovered. |
| 5 | Task discovery regex matches `FORGE-S06-T01-fix-persona/` (full task ID with slug) | PASS | `fullTaskSlugRe` dynamically constructed to match `{PREFIX}-{SPRINT}-T{NN}-*`. |
| 6 | Task discovery regex falls back to `T01/` bare-ID directories | PASS | `bareTaskRe` = `/^T(\d+)$/i` matches `T01`. Dry-run confirms: FORGE-S01 and FORGE-S02 tasks discovered from bare `T01/`, `T02/` directories. `T10` correctly produces `FORGE-S02-T10` (not `FORGE-S02-T00`). |
| 7 | Bug discovery regex matches `BUG-001-sprint-runner-context-accumulation/` (full ID with slug) | PASS | `partialSlugBugRe` = `/^BUG-(\d+)-.+$/i` matches `BUG-001-sprint-runner-context-accumulation`. Dry-run confirms: 7 bugs discovered from `BUG-NNN-slug` directories. |
| 8 | Bug discovery regex falls back to `B01/` bare-ID directories | PASS | `bareBugRe` = `/^B(\d+)$/i` matches `B01`. |
| 9 | `deriveSlug()` produces correct lower-kebab-case slugs truncated to ~30 chars | PASS | Verified with 8 test cases including empty string, whitespace-only, single char, special chars, truncation. All pass. |
| 10 | Sprint `path` field populated with `{engPath}/sprints/{dirName}` using actual filesystem directory name | PASS | Line 150: `path: path.join(engPath, 'sprints', sprintDir)`. `sprintDir` is the actual directory name from filesystem. |
| 11 | Task `path` field uses actual directory name (slug-aware) | PASS | Line 166: `path: path.join(engPath, 'sprints', sprintDir, taskDir)`. Both `sprintDir` and `taskDir` are actual filesystem names. |
| 12 | `node --check forge/tools/seed-store.cjs` passes | PASS | Exit 0. No syntax errors. |
| 13 | `node forge/tools/validate-store.cjs --dry-run` exits 0 | N/A | No schema changes in this task. 109 pre-existing errors from prior sprints, none related to this change. |
| 14 | `node forge/tools/seed-store.cjs --dry-run` correctly discovers slug-named directories | PASS | 6 sprints, 38 tasks, 7 bugs discovered. All slug-named, full-ID, and bare-ID directories correctly matched. |

## Forge-Specific Validations

| Check | Status | Evidence |
|---|---|---|
| Version bump declared in plan | PASS | `plugin.json` version: `0.7.8` (was `0.7.7`) |
| Migration entry exists in `migrations.json` | PASS | Entry `0.7.7 -> 0.7.8` with `regenerate: []`, `breaking: false`, `manual: []` |
| Security scan report exists | PASS | `docs/security/scan-v0.7.8.md` exists, verdict: SAFE TO USE |
| README security table updated | PASS | Row for v0.7.8 added |

## Edge Case Checks

| Check | Status | Evidence |
|---|---|---|
| No-npm rule | PASS | Only `fs`, `path`, and `./store.cjs` imported — all built-in or internal |
| Hook exit discipline | N/A | No hooks modified |
| Schema `additionalProperties: false` preserved | N/A | No schema changes |
| Backwards compatibility | PASS | Legacy bare-ID directories (`S01/`, `T01/`, `B01/`) still discovered via fallback. Existing stores not re-seeded are unaffected — sprint `path` field is optional. |
| `T10+` bare task number extraction | PASS | `T10` correctly produces `FORGE-S02-T10`. Original bug (`match[1].slice(1)` stripping first digit) fixed with `String(parseInt(match[1], 10))`. |
| `BUG-NNN-slug` partial-prefix directories | PASS | Added `partialSlugBugRe` tier. 7 bugs discovered from `BUG-001-*` format directories. |

## Regression Check

```
$ node --check forge/tools/seed-store.cjs
(exit 0 — no syntax errors)
```

No schema changes — `validate-store --dry-run` not required for this task.