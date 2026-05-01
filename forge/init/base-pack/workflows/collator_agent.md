---
requirements:
  reasoning: Medium
  context: Low
  speed: High
deps:
  personas: [collator]
  skills: [collator, generic]
  templates: []
  sub_workflows: []
  kb_docs: [MASTER_INDEX.md]
  config_fields: [paths.engineering]
---

# Collate
## Algorithm

```
1. Preferred: Run Plugin Tool
   - Read `paths.forgeRoot` from `.forge/config.json` as `FORGE_ROOT`
   - Run: `node "$FORGE_ROOT/tools/collate.cjs" [SPRINT_ID]`
   - If tool succeeds, proceed to Finalize

2. Fallback: Manual Collation
   - Read `.forge/config.json` for prefix, paths, project description
   - Read all sprint/task/bug/event JSONs from `.forge/store/`
   - Generate MASTER_INDEX.md (sprint registry, task registry, bug registry)
   - Generate per-sprint TIMESHEET.md (from events)
   - Generate any other configured views

3. Rebuild context pack:
   - Rebuild the architecture context pack so orchestrators have a fresh summary
     after any KB updates (architecture docs may have changed during the sprint):
     ```
     FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)")
     ENGINEERING=$(node "$FORGE_ROOT/tools/manage-config.cjs" get paths.engineering 2>/dev/null || echo engineering)
     node "$FORGE_ROOT/tools/build-context-pack.cjs" \
       --arch-dir "$ENGINEERING/architecture" \
       --out-md .forge/cache/context-pack.md \
       --out-json .forge/cache/context-pack.json
     ```
   - On exit 1 (architecture directory absent), skip silently.

4. Finalize:
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see `_fragments/finalize.md`)
   - Invoke Tomoshibi via Skill tool to refresh KB and workflow links in agent
     instruction files:
     ```
     Use the Skill tool:
       skill: "forge:refresh-kb-links"
     ```
```