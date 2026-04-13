---
requirements:
  reasoning: High
  context: Medium
  speed: Low
---

# Meta-Workflow: Plan Task

## Persona

🌱 **{Project} Engineer** — I plan and build. I do not move forward until the code is clean.

See `meta-engineer.md` for the full persona definition.

## Purpose

The Engineer reads the task prompt, researches the codebase, and produces an implementation plan.

## Algorithm

```
1. Load Context:
   - Read task prompt (source of truth)
   - Read architecture docs and business domain docs relevant to the task
   - Read stack checklist

2. Research:
   - Identify files for modification (Glob, Grep, Read)
   - Map existing patterns in the target area
   - Identify existing tests to be maintained or expanded
   - Identify whether the change is **material** (triggers version bump) or not:
     - Bug fixes to any command, hook, tool spec, or workflow → material
     - Tool-spec changes that alter generated tool behaviour → material
     - Command-file changes that alter behaviour → material
     - Hook changes → material
     - Schema changes to `.forge/store/` or `.forge/config.json` → material
     - Docs-only changes → NOT material

3. Plan:
   - Generate PLAN.md using the project plan template
   - Ensure inclusion of: Objective, Approach, Files to Modify, Data Model Changes, Testing Strategy, Acceptance Criteria, and Operational Impact

4. Knowledge Writeback:
   - If new patterns were discovered, update architecture or business domain docs

5. Finalize:
   - Update task status to `planned`
   - Emit "complete" event to `.forge/store/events/{sprintId}/`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Workflow Structure:** The generated `plan_task.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** The generated workflow must explicitly forbid inline execution. All complex sub-tasks must be delegated via the `Agent` tool.
- **Project Specifics:**
  - Replace architecture/domain doc placeholders with actual project file paths.
  - Embed the project's specific PLAN template path.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
