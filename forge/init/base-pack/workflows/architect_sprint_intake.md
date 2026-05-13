---
requirements:
  reasoning: High
  context: Medium
  speed: Low
deps:
  personas: [product-manager]
  skills: [architect, generic]
  templates: [SPRINT_REQUIREMENTS_TEMPLATE, SPRINT_MANIFEST_TEMPLATE]
  sub_workflows: []
  kb_docs: [MASTER_INDEX.md, architecture/stack.md]
  config_fields: [project.prefix, paths.engineering]
---

# Sprint Intake
## Algorithm

```
0. Project Orientation:
   - Your current working directory is the project root.
   - Forge config lives at `.forge/config.json` (relative to cwd); the `forge_config` MCP tool returns canonical values.
   - Engineering knowledge lives under `engineering/` (relative to cwd) — `MASTER_INDEX.md`, `architecture/`, `business-domain/`, `sprints/`, `features/`.
   - Paths in subsequent steps resolve against this cwd.

1. Pre-flight Gate Check:
   - Run `/cost` to verify token reporting available (Claude Code runtime only;
     on other runtimes this is a no-op and the estimate path is used).
   - If `/cost` succeeds → note for later (will use reported data)
   - If `/cost` fails or unavailable → note for later (will use estimates)

2. Load Context:
   - Read `engineering/MASTER_INDEX.md` (relative to cwd)
   - Read any pending feature requests or bug reports under `engineering/`

3. Requirements Interview:
   - Conduct a structured interview with the user
   - Capture: Objectives, Constraints, Deliverables, and Success Criteria
   - Clarify ambiguous requirements through iterative questioning

4. Document Requirements:
   - Generate `engineering/sprints/<SPRINT_ID>/SPRINT_REQUIREMENTS.md`
   - Map requirements to existing Features if applicable
   - Ensure all deliverables are measurable and testable

5. Finalize:
   - Update sprint status via `node "$FORGE_ROOT/tools/store-cli.cjs" update-status sprint {sprintId} status planning`
   - Emit the complete event via `node "$FORGE_ROOT/tools/store-cli.cjs" emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see `_fragments/finalize.md`)
```