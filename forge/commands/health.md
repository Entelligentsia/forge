---
description: Use when you want to check if the engineering knowledge base is stale, has gaps, or has store integrity issues
---

# /forge:health

Assess the health and currency of the project's SDLC knowledge base.

## Checks

| Check | What It Detects |
|-------|----------------|
| **Stale docs** | Architecture sub-docs not updated in N sprints |
| **Orphaned entities** | Entities in code (ORM models, types) not in `engineering/business-domain/entity-model.md` |
| **Unused checklist items** | Stack-checklist items never triggered in reviews |
| **Coverage gaps** | Architecture areas with no sub-document |
| **Writeback backlog** | `[?]` items not yet confirmed by a retrospective |
| **Store integrity** | Run `node "$FORGE_ROOT/tools/validate-store.cjs" --dry-run` |
| **Skill gaps** | Marketplace skills relevant to the stack that are not installed |
| **Modified generated files** | Generated files that have been manually edited since last recorded — run `node "$FORGE_ROOT/tools/generation-manifest.cjs" list --modified` |
| **Feature Test Coverage** | Features with zero tagged tests |
| **Concepts freshness** | `docs/concepts/*.md` pages older than `forge/meta/store-schema/` updates |

## How to run

First, resolve the plugin root:
```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

1. Read `.forge/config.json` for paths and `installedSkills`
2. Read the knowledge base files in `engineering/`
3. Read the store in `.forge/store/` for sprint/task history
4. Scan the codebase for entities not in the knowledge base (Grep for model/type definitions)
5. Run store validation:
   ```sh
   node "$FORGE_ROOT/tools/validate-store.cjs" --dry-run
   ```
   Include the result in the report.
6. Check modified generated files:
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" list --modified
   ```
   If any modified or missing files are reported, include them in the health
   report under **Modified generated files** with the note:
   > These files were manually edited after generation. Regeneration will warn
   > before overwriting them. Run `/forge:regenerate` to review and update.
   If all files are pristine (or the tool is absent), omit this section.
7. Check skill gaps: run `node "$FORGE_ROOT/hooks/list-skills.js"` to get the live
   installed skill list from `~/.claude/plugins/installed_plugins.json` (source of
   truth — not the config, which can be stale). Read `$FORGE_ROOT/meta/skill-recommendations.md`,
   cross-reference the stack against live installed skills, report any uninstalled
   high-confidence recommendations with one-line install instructions. If the live
   list differs from `installedSkills` in config, update config to match.
8. Check test coverage for active features:
   - Read `.forge/store/features/` to find all features with `"status": "active"`.
   - If zero active features exist, skip this check.
   - Otherwise, scan all test directories (e.g. `test/`, `tests/`, `spec/`, `__tests__/`) and test files (`*.test.*`, `*.spec.*`) for the `FEAT-NNN` identifier of each active feature.
   - You should account for three tag forms: filename (`feat-NNN-login.test.js`), test name string (`describe('[FEAT-NNN]')`), or docblock comment (`// @feat FEAT-NNN`).
   - For each active feature, report the count of test files or names matching its ID.
   - Warn explicitly: `⚠ FEAT-NNN has 0 tagged tests` if an active feature has zero hits.
9. Check concepts freshness:
   - Compare the modification timestamps of files in `docs/concepts/*.md` against the newest schema modification in `forge/meta/store-schema/`.
   - If any concept doc is older than the newest schema change, emit a notice that it may be stale.
10. Report all findings with actionable recommendations
11. Close the report with: `If you've found a bug in Forge itself, run /forge:report-bug`

## Output

A health report to stdout — no files modified.

## Arguments

$ARGUMENTS

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
