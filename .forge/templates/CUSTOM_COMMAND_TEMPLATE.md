---
description: {DESCRIPTION}
---

# {COMMAND_NAME}

## Persona

{PERSONA_SYMBOL} **{PROJECT} {PERSONA_NAME}** — {ANNOUNCEMENT}

---

I am running the **{COMMAND_NAME}** workflow for **{TASK_ID}**.

## Step 1 — Load Context

- Read the task from `.forge/store/tasks/{TASK_ID}.json`
- Read the task prompt from `engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/`
- Read `engineering/MASTER_INDEX.md` for overall project state
{ADDITIONAL_CONTEXT}

## Step 2 — {MAIN_ACTION_TITLE}

{MAIN_ACTION_DESCRIPTION}

## Step 3 — Output

{OUTPUT_DESCRIPTION}

**Verdict line** (for review-role phases) must be exactly:
```
**Verdict:** Approved
```
or
```
**Verdict:** Revision Required
```

Write the output artifact to:
`engineering/sprints/{SPRINT_DIR}/{TASK_DIR}/{ARTIFACT_NAME}.md`

## Step 4 — Emit Event + Update State

Write event to `.forge/store/events/{SPRINT_ID}/`:
```json
{
  "eventId": "{ISO_TIMESTAMP}_{TASK_ID}_{COMMAND_NAME}_{action}",
  "taskId": "{TASK_ID}",
  "sprintId": "{SPRINT_ID}",
  "role": "{ROLE}",
  "action": "{COMMAND_NAME}",
  "phase": "{PHASE_NAME}",
  "iteration": 1,
  "startTimestamp": "{START}",
  "endTimestamp": "{END}",
  "durationMinutes": {N},
  "model": "{MODEL_ID}",
  "verdict": "{VERDICT_IF_APPLICABLE}"
}
```

Update task `status` to `{NEXT_STATUS}` in `.forge/store/tasks/{TASK_ID}.json`.
