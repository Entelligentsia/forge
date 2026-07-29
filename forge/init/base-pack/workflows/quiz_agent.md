---
requirements:
  reasoning: Medium
  context: High
  speed: Low
deps:
  personas: [qa-engineer]
  skills: [qa-engineer, generic]
  templates: []
  sub_workflows: []
  kb_docs: [architecture/stack.md, MASTER_INDEX.md]
  config_fields: [paths.engineering]
---
# 🍵 Workflow: Quiz Agent — Forge

## Purpose

Verify that an agent has correctly loaded and understood the Forge
knowledge base before beginning a high-stakes task.

---

## Questions

1. **[Stack]:** What is the minimum Node.js version required by Forge, and what dependency constraint applies to all hook and tool scripts?
2. **[Architecture]:** What is the file naming pattern for event records in the Forge store, and what fields make up the compound `eventId`?
3. **[Domain Entities]:** Name the four store entity types managed by Forge and identify which one uses an ephemeral sidecar convention with a leading underscore in filenames.
4. **[Process]:** Where is the authoritative version number for the Forge plugin declared, and what two files must be updated whenever a material change is made to `forge/`?
5. **[Constraints]:** What value must `additionalProperties` retain in all Forge JSON Schema files, and what must be added to `validate-store.cjs` when a new required field is introduced to a schema?
6. **[Architecture]:** How does the `check-update.js` session hook determine whether a newer version is available — does it hardcode a URL or read it from somewhere?

## Pass Criteria

All 6 questions answered correctly and specifically. Vague answers
("generally something", "I think it's...") fail.

## Fail Action

Re-read:
- `engineering/architecture/stack.md`
- `engineering/architecture/database.md`
- `engineering/architecture/processes.md`
- `engineering/architecture/routing.md`
- `engineering/architecture/deployment.md`
- `engineering/business-domain/entity-model.md`
- `engineering/stack-checklist.md`

Then retry the quiz. If the agent fails twice, escalate to the user before
beginning the task.