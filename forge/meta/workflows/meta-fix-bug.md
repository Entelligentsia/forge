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
   - Run `node "$FORGE_ROOT/tools/collate.cjs" {bugId} --purge-events`
     This purges `.forge/store/events/{bugId}/` deterministically.
     The cost summary written to the bug artifact above is the durable
     record; no COST_REPORT.md is generated for bug IDs (collate skips
     sprint processing when the ID is not a known sprint).
   - Update bug status via `/forge:store update-status bug {bugId} status fixed`
   - Emit the complete event via `/forge:store emit {bugId} '{event-json}'`
     (tombstone — written after the purge; the only event that will remain)
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
  3. Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar`.
- **Event Emission:** Ensure the "complete" event includes the `eventId` passed by the orchestrator.

## Announcement Algorithm

The generated `fix_bug.md` MUST include the following verbatim algorithm for phase announcements and symmetric persona/skill injection. This mirrors the pattern from `meta-orchestrate.md`.

```
# --- Persona symbol lookup (emoji, name, tagline) ---
# All bug-fix phases map to the same Bug Fixer persona.
PERSONA_MAP = {
  "plan-fix":    ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
  "review-plan": ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
  "implement":   ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
  "review-code": ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
  "approve":     ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
  "commit":      ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
}
# Default fallback (covers any custom phases):
# ("🍂", "Bug Fixer", "I find what has decayed and restore it.")

# --- Before each spawn_subagent call ---
emoji, persona_name, tagline = PERSONA_MAP.get(phase.role, ("🍂", "Bug Fixer", "I find what has decayed and restore it."))
print(f"\n{emoji} **Forge {persona_name}** — {bug_id} · {tagline} [{phase_model}]\n")

# --- Symmetric Injection: noun "bug-fixer" is constant for all bug phases ---
persona_content = read_file(".forge/personas/bug-fixer.md")
skill_content   = read_file(".forge/skills/bug-fixer-skills.md")

# --- Spawn subagent with "print this exact line first" instruction ---
spawn_subagent(
  prompt=(
    f"Your first output — before any tool use or file reads — print this exact line:\n\n"
    f"{emoji} **Forge {persona_name}** — {bug_id} · {tagline} [{phase_model}]\n\n"
    f"---\n\n"
    f"{persona_content}\n\n"
    f"{skill_content}\n\n"
    f"### Current Working Context\n"
    f"- Bug Root:    {bug_root_path}\n"
    f"- Store Root:  {store_root_path}\n"
    f"- Events Root: .forge/store/events/bugs/\n\n"
    f"Read `{phase.workflow}` and follow it. Bug ID: {bug_id}. "
    f"Also read `engineering/MASTER_INDEX.md` for project state. "
    f"Before returning: run /cost, parse token usage, and write sidecar "
    f"`.forge/store/events/bugs/_{event_id}_usage.json` with fields: "
    f"inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, estimatedCostUSD."
  ),
  description=f"{emoji} {persona_name} — {phase.name} for {bug_id}",
  model=phase_model
)
```

**Key rules for the generated `fix_bug.md`:**
- `PERSONA_MAP` MUST cover all six phases: `plan-fix`, `review-plan`, `implement`, `review-code`, `approve`, `commit`.
- The persona noun is always `"bug-fixer"` — never `{phase.role}`. Do not use `{phase.role}.md` lookups.
- The sidecar path uses `.forge/store/events/bugs/_{event_id}_usage.json` (not `events/{sprint_id}/`).
- The announcement `print()` line MUST include `{tagline}` and `[{phase_model}]`.
- The `spawn_subagent` prompt MUST open with the "Your first output — before any tool use or file reads — print this exact line:" instruction.
