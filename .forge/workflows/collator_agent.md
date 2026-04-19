---
requirements:
  reasoning: Medium
  context: Low
  speed: High
---

# 🍃 Workflow: Collate (Forge Collator)

## Persona Self-Load

As first action (before any other tool use), read `.forge/personas/collator.md`
and print the opening identity line to stdout.

🍃 **Forge Collator** — I gather what exists and arrange it into views.

**Store path:** `.forge/store/`
**Engineering path:** `engineering/`
**Project prefix:** `FORGE`

---

## Step 1 — Preferred: Run the Plugin Tool

Read `paths.forgeRoot` from `.forge/config.json` and set it as `FORGE_ROOT`, then run:

```bash
FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)")
node "$FORGE_ROOT/tools/collate.cjs" [SPRINT_ID]
```

Because this repository **is** Forge, the in-tree tool is equivalent and may
be used directly when `paths.forgeRoot` is not set or when developing the
collate tool itself:

```bash
node forge/tools/collate.cjs [SPRINT_ID]
```

If the tool exits 0, the workflow is complete.

## Step 2 — Fallback: Manual Collation

If the tool is unavailable or fails:

1. Read `.forge/config.json` for `project.prefix` (`FORGE`), `paths`, and project description.
2. Read all sprint JSONs from `.forge/store/sprints/`.
3. Read all task JSONs from `.forge/store/tasks/`.
4. Read all bug JSONs from `.forge/store/bugs/`.
5. Read all event JSONs from `.forge/store/events/` (recurse through sprint-ID subdirectories and the `bugs/` subdirectory).
6. Generate:
   - `engineering/MASTER_INDEX.md` — sprint registry, task registry, bug registry
   - `engineering/sprints/{SPRINT_DIR}/TIMESHEET.md` — per-sprint activity log (from events)
   - `engineering/sprints/{SPRINT_DIR}/COST_REPORT.md` — per-sprint cost view (if any events have token data)
   - `engineering/bugs/TIMESHEET.md` — bug registry
   - Per-directory `INDEX.md` navigation hubs in `engineering/sprints/*/` and `engineering/bugs/*/`
7. Write `.forge/store/COLLATION_STATE.json` with the timestamp and file list.

## Output Files

- `engineering/MASTER_INDEX.md`
- `engineering/sprints/{SPRINT_ID}/TIMESHEET.md`
- `engineering/sprints/{SPRINT_ID}/COST_REPORT.md` (when token data present)
- `engineering/bugs/TIMESHEET.md`
- `INDEX.md` in each sprint/task/bug directory
- `.forge/store/COLLATION_STATE.json`

## Notes

- `validate-store.cjs` skips files prefixed with `_` — do not rename ephemeral sidecars during collation.
- Do NOT modify any file under `.forge/store/` except `COLLATION_STATE.json`.
- Do NOT write emoji or decorated status strings into JSON — only into Markdown output.
