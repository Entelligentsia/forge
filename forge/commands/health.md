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

First, resolve the plugin root and project root:
```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

Parse `$ARGUMENTS` for a `--path <dir>` argument:
- If present, `PROJECT_ROOT = <dir>` (absolute or relative to the current working directory — resolve to absolute).
- If absent, `PROJECT_ROOT = .` (current working directory).

All file paths below are relative to `PROJECT_ROOT`. All shell tool invocations must be run from `PROJECT_ROOT`:
```sh
cd "$PROJECT_ROOT" && node "$FORGE_ROOT/tools/..."
```

1. Read `$PROJECT_ROOT/.forge/config.json` for paths and `installedSkills`.
   If it does not exist, stop and tell the user to run `/forge:init` in that directory first.
2. Read the knowledge base files in `$PROJECT_ROOT/engineering/`
3. Read the store in `$PROJECT_ROOT/.forge/store/` for sprint/task history
4. Scan the codebase for entities not in the knowledge base (Grep for model/type definitions)
5. Run store validation:
   ```sh
   cd "$PROJECT_ROOT" && node "$FORGE_ROOT/tools/validate-store.cjs" --dry-run
   ```
   Include the result in the report.
6. Check modified generated files:
   ```sh
   cd "$PROJECT_ROOT" && node "$FORGE_ROOT/tools/generation-manifest.cjs" list --modified
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
   - Read `$PROJECT_ROOT/.forge/store/features/` to find all features with `"status": "active"`.
   - If zero active features exist, skip this check.
   - Otherwise, scan all test directories under `$PROJECT_ROOT` (e.g. `test/`, `tests/`, `spec/`, `__tests__/`) and test files (`*.test.*`, `*.spec.*`) for the `FEAT-NNN` identifier of each active feature.
   - You should account for three tag forms: filename (`feat-NNN-login.test.js`), test name string (`describe('[FEAT-NNN]')`), or docblock comment (`// @feat FEAT-NNN`).
   - For each active feature, report the count of test files or names matching its ID.
   - Warn explicitly: `⚠ FEAT-NNN has 0 tagged tests` if an active feature has zero hits.
9. Check concepts freshness:
   - Compare the modification timestamps of files in `$PROJECT_ROOT/docs/concepts/*.md` against the newest schema modification in `$FORGE_ROOT/meta/store-schema/`.
   - If any concept doc is older than the newest schema change, emit a notice that it may be stale.
10. Report all findings with actionable recommendations.
    If `--path` was used, open the report with: `Health report for: $PROJECT_ROOT`
11. Close the report with: `If you've found a bug in Forge itself, run /forge:report-bug`

## Output

A health report to stdout — no files modified.

## Arguments

$ARGUMENTS

| Argument | Purpose |
|----------|---------|
| `--path <dir>` | Run health check against a different project directory instead of the current working directory. Accepts an absolute path or a path relative to the current directory. |

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
