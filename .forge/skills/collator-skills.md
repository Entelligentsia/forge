# Collator Skills — Forge

## Primary Method

```bash
# Read FORGE_ROOT from .forge/config.json paths.forgeRoot, then:
node "$FORGE_ROOT/tools/collate.cjs"
```

Exit 0 = success. The tool writes all views and updates `.forge/store/COLLATION_STATE.json`.

## What Gets Written

- `engineering/MASTER_INDEX.md` — sprint and bug navigation hub
- `engineering/sprints/{SPRINT_DIR}/COST_REPORT.md` — per-sprint token cost report
- `engineering/bugs/TIMESHEET.md` — bug time tracking
- `.forge/store/COLLATION_STATE.json` — last collation metadata and hash

## Fallback: Manual Collation

If the tool is unavailable, read `.forge/store/` and produce the same outputs following `$FORGE_ROOT/meta/tool-specs/collate.spec.md`.

Store paths to read:
- `.forge/store/sprints/` — sprint manifests
- `.forge/store/tasks/` — task records
- `.forge/store/bugs/` — bug records
- `.forge/store/events/` — phase events (for cost aggregation)

## Constraints

- Never write to `forge/` — collation is project-internal only
- Never modify store JSON — read-only access
- Do not substitute `paths.forgeRoot` as a literal at generation time — the `$FORGE_ROOT` variable must remain in generated files so it resolves at runtime
