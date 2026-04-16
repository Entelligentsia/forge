# 🌊 Workflow: Quiz Agent (Forge Knowledge Check)

## Purpose

Verify that an agent has correctly loaded and understood the Forge knowledge
base before beginning a high-stakes task (e.g. a schema change, a
`/forge:update` path modification, a migration entry addition).

---

## Questions

1. **No-npm rule:** What is it and where is it documented? Name the four Node.js built-ins typically used in Forge tools.
2. **Version bump criteria:** When is a version bump required? Name three material-change categories from `engineering/architecture/processes.md` / `CLAUDE.md`.
3. **Shipping a `forge/` change:** What must happen before a change to any file in `forge/` can be pushed? (Hint: three artifacts.)
4. **Schema validation:** What does `node forge/tools/validate-store.cjs --dry-run` verify, and when must it be run?
5. **Repo layout:** What is the difference between `forge/` and `engineering/` / `.forge/` in this repository? Which directory is distributed to plugin users?
6. **Hook discipline:** What line must every hook include to ensure it never exits non-zero? Why does it matter?
7. **Migration entries:** What fields does a `forge/migrations.json` entry require, and what does `regenerate: ["workflows"]` signal to users?

## Pass Criteria

All 7 questions answered correctly and specifically. Vague answers
("generally security things", "some validation") fail.

## Fail Action

Re-read:
- `engineering/architecture/stack.md`
- `engineering/architecture/processes.md`
- `engineering/architecture/deployment.md`
- `engineering/architecture/routing.md`
- `engineering/stack-checklist.md`
- `CLAUDE.md` (repo root)

Then retry the quiz. If the agent fails twice, escalate to the user before
beginning the task.
