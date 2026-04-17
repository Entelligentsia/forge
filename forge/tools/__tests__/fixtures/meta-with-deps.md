---
requirements:
  reasoning: High
  context: Medium
  speed: Low
deps:
  personas: [architect]
  skills: [architect, generic]
  templates: [PLAN_TEMPLATE, TASK_PROMPT_TEMPLATE]
  sub_workflows: [review_plan]
  kb_docs: [architecture/stack.md, MASTER_INDEX.md]
  config_fields: [commands.test, paths.engineering]
---

# Meta-Workflow: Test Fixture (meta-with-deps)

## Purpose

Used in unit tests for parseMetaDeps and computeClosure.
