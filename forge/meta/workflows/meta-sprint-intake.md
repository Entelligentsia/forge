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

# 🌸 Meta-Workflow: Sprint Intake

## Purpose

Capture sprint requirements via a structured interview and document them for planning.

## Algorithm

```
0. Pre-flight Gate Check:
   - Run `/cost` to verify token reporting available
   - If `/cost` succeeds → note for later (will use reported data)
   - If `/cost` fails or unavailable → note for later (will use estimates)

1. Load Context:
   - Read project vision and current MASTER_INDEX.md
   - Read any pending feature requests or bug reports

2. Requirements Interview:
   - Conduct a structured interview with the user
   - Capture: Objectives, Constraints, Deliverables, and Success Criteria
   - Clarify ambiguous requirements through iterative questioning

3. Document Requirements:
   - Generate SPRINT_REQUIREMENTS.md
   - Map requirements to existing Features if applicable
   - Ensure all deliverables are measurable and testable

4. Finalize:
   - Update sprint status via `/forge:store update-status sprint {sprintId} status planning`
   - Emit the complete event via `/forge:store emit {sprintId} '{event-json}'`
   - Execute Token Reporting (see Generation Instructions)
```

## Generation Instructions

- **Persona Self-Load:** The generated workflow MUST begin by reading `.forge/personas/product-manager.md` as its first step (before any other tool use). This replaces the former inline `## Persona` section. The persona identity line (emoji, name, tagline) should be printed to stdout after reading the file.
- **Workflow Structure:** The generated `sprint_intake.md` must follow the strict "Algorithm" block format.
- **Context Isolation:** Forbid inline execution of requirement analysis; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference project-specific requirement templates.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. If `/cost` succeeds:
     - Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
     - Add `"source": "reported"` to sidecar JSON.
  3. If `/cost` fails or unavailable:
     - Set token fields to `null`: `"inputTokens": null, "outputTokens": null, "estimatedCostUSD": null`.
     - Add `"source": "missing"` to sidecar JSON.
     - Log: "Token data unavailable (/cost failed). Backfill later via estimate-usage.cjs."
  4. Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`.
  5. **NEVER skip sidecar write.** Always emit (reported or placeholder with nulls).
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
