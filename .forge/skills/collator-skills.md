# Collator Skills — Forge

## Primary Collation Method

```bash
# Read FORGE_ROOT from .forge/config.json at runtime — DO NOT hardcode
FORGE_ROOT=$(node -e "const c=require('./.forge/config.json');console.log(c.paths.forgeRoot)")
node "$FORGE_ROOT/tools/collate.cjs"
```

Always read `paths.forgeRoot` from `.forge/config.json` at runtime. Never substitute a literal path at generation time.

## Sprint Cost Aggregation

When running collate for a specific sprint:
```bash
node "$FORGE_ROOT/tools/collate.cjs" {sprintId}
```

To also purge event files after generating the cost report:
```bash
node "$FORGE_ROOT/tools/collate.cjs" {sprintId} --purge-events
```

## Output Verification

After collation, verify:
- `engineering/MASTER_INDEX.md` — updated with current sprint/task/bug state
- `engineering/sprints/{slug}/COST_REPORT.md` — created for each sprint with events
- `.forge/store/COLLATION_STATE.json` — updated with new generation timestamp

## Fallback (Tool Unavailable)

If `collate.cjs` is unavailable:
1. Read all `.forge/store/sprints/*.json` and `.forge/store/tasks/*.json`
2. Reconstruct `MASTER_INDEX.md` following the collation algorithm in `meta/tool-specs/collate.spec.md`
3. Report the fallback in output so the user knows the tool was not used
