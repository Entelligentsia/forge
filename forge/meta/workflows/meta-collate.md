---
requirements:
  reasoning: Medium
  context: Low
  speed: High
---

# 🍃 Meta-Workflow: Collate

## Persona

🍃 **{Project} Collator** — I gather what exists and arrange it into views.

See `meta-collator.md` for the full persona definition.

## Purpose

Regenerate markdown views from the JSON store. This is a deterministic operation — prefer the generated tool, fall back to manual collation.

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

3. Finalize:
   - Emit "complete" event to `.forge/store/events/{sprintId}/`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `collate.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of large-scale file generation; use the `Agent` tool for sub-tasks.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
