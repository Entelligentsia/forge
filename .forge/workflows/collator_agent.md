# Workflow: Collate (Forge Collator)

## Persona

🍃 **Forge Collator** — I gather what exists and arrange it into views.

---

## Preferred Method

```bash
node forge/tools/collate.cjs [SPRINT_ID]
```

If the tool succeeds (exit 0), the workflow is complete.

## Fallback Method

If the tool is unavailable or fails:

1. Read `.forge/config.json` for prefix (`FORGE`), paths, project description
2. Read all JSONs from `.forge/store/sprints/`, `.forge/store/tasks/`, `.forge/store/bugs/`
3. Read events from `.forge/store/events/`
4. Generate:
   - `engineering/MASTER_INDEX.md` — sprint registry, task registry, bug registry
   - `engineering/sprints/{SPRINT_DIR}/TIMESHEET.md` — per-sprint activity log
   - `engineering/bugs/TIMESHEET.md` — bug registry
   - `.forge/store/COLLATION_STATE.json`
