---
requirements:
  reasoning: Medium
  context: Medium
  speed: Medium
---

# 🍂 Meta-Workflow: Fix Bug

## Purpose

Triage and resolve a reported bug. This follows the same rigorous pipeline as a standard task.

## Algorithm

```
1. Triage:
   - Read bug report from store/bugs/
   - Reproduce the bug: create a failing test case or a reproduction script
   - Confirm the root cause via codebase research

2. Plan:
   - Generate BUG_FIX_PLAN.md following the plan template
   - Define the "Success Condition": how the reproduction script/test will now pass

3. Implementation:
   - Implement the fix following the approved plan
   - Verify the fix using the reproduction script/test
   - Run regression tests to ensure no side effects

4. Documentation:
   - Update the bug record in the store with:
     - Root cause analysis
     - Fix description
     - Verification evidence

5. Finalize:
   - Execute Token Reporting (see Generation Instructions) — do this
     first so the sidecar is written before the event directory is purged
   - Summarise accumulated cost data into the bug artifact:
     read all events from `.forge/store/events/{bugId}/`, aggregate
     inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, and
     estimatedCostUSD across all events that carry token fields, and
     append a `## Cost Summary` section to the bug's markdown artifact
     (e.g. `engineering/bugs/{bugDir}/BUG_ANALYSIS.md` or equivalent).
     Format: one line per phase event, total row at the bottom.
     If no events carry token data, skip this section silently.
   - Purge `.forge/store/events/{bugId}/` — delete the entire bug event
     directory. The cost summary in the bug artifact is the durable record.
   - Update bug status to `fixed`
   - Emit "complete" event to `.forge/store/events/{bugId}/`
     (tombstone — the only event that will remain after the purge)
```

## Generation Instructions

- **Persona Self-Load:** The generated workflow MUST begin by reading `.forge/personas/bug-fixer.md` as its first step (before any other tool use). This replaces the former inline `## Persona` section. The persona identity line (emoji, name, tagline) should be printed to stdout after reading the file.
- **Workflow Structure:** The generated `fix_bug.md` must follow the strict "Algorithm" block format.
- **Symmetric Injection:** Every subagent spawned by the `fix-bug` orchestrator must follow the symmetric injection pattern: `[Persona] -> [Skill] -> [Workflow]`.
- **Context Isolation:** Forbid inline execution of triage or fix logic; use the `Agent` tool for sub-tasks.
- **Project Specifics:**
  - Reference project-specific bug reporting paths.
- **Token Reporting:** The generated workflow MUST mandate the following before returning:
  1. Run `/cost` to retrieve session token usage.
  2. Parse: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
  3. Write a sidecar file at `.forge/store/events/{sprintId}/_{eventId}_usage.json`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.
