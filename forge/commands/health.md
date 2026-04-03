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
| **Store integrity** | Run `node engineering/tools/validate-store.cjs --dry-run` if the tool exists |
| **Skill gaps** | Marketplace skills relevant to the stack that are not installed |

## How to run

First, resolve the plugin root:
```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

1. Read `.forge/config.json` for paths and `installedSkills`
2. Read the knowledge base files in `engineering/`
3. Read the store in `.forge/store/` for sprint/task history
4. Scan the codebase for entities not in the knowledge base (Grep for model/type definitions)
5. If `engineering/tools/validate-store.cjs` exists, run `node engineering/tools/validate-store.cjs --dry-run` and include the result in the report
6. Check skill gaps: run `node "$FORGE_ROOT/hooks/list-skills.js"` to get the live
   installed skill list from `~/.claude/plugins/installed_plugins.json` (source of
   truth — not the config, which can be stale). Read `$FORGE_ROOT/meta/skill-recommendations.md`,
   cross-reference the stack against live installed skills, report any uninstalled
   high-confidence recommendations with one-line install instructions. If the live
   list differs from `installedSkills` in config, update config to match.
7. Report all findings with actionable recommendations
8. Close the report with: `If you've found a bug in Forge itself, run /forge:report-bug`

## Output

A health report to stdout — no files modified.

## Arguments

$ARGUMENTS

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
