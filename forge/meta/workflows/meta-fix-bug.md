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
   - Locate or create the bug record (MANDATORY — do this before anything else):
     a. Determine the bug ID: if $ARGUMENTS is an existing FORGE-BUG-NNN ID, use it.
        Otherwise derive the next available ID by listing .forge/store/bugs/.
     b. If .forge/store/bugs/{BUG_ID}.json does NOT exist:
        - Derive a short slug from the bug title (kebab-case, ≤ 5 words)
        - Create the engineering folder:
            mkdir -p engineering/bugs/{BUG_ID}-{slug}
        - Write the bug record via store-cli — NEVER write the file directly:
            node "$FORGE_ROOT/tools/store-cli.cjs" write bug '{
              "bugId":       "{BUG_ID}",
              "title":       "<from input>",
              "description": "<from input>",
              "severity":    "<assessed: critical|major|minor>",
              "status":      "reported",
              "path":        "engineering/bugs/{BUG_ID}-{slug}",
              "reportedAt":  "<current ISO timestamp>"
            }'
        - If $ARGUMENTS contains a GitHub issue URL, include it as "githubIssue"
          in the JSON above — it is a valid schema field.
     c. Read the now-guaranteed record:
            node "$FORGE_ROOT/tools/store-cli.cjs" read bug {BUG_ID} --json
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

- **Persona Self-Load:** The generated workflow MUST begin with these two actions (in order):
  1. Run the identity banner using the Bash tool:
     ```bash
     FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)") && node "$FORGE_ROOT/tools/banners.cjs" rift
     ```
  2. Read `.forge/personas/bug-fixer.md`.
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
# --- Role-to-noun mapping (persona and skill file lookups) ---
ROLE_TO_NOUN = {
  "plan-fix":    "bug-fixer",
  "review-plan": "supervisor",
  "implement":   "bug-fixer",
  "review-code": "supervisor",
  "approve":     "architect",
  "commit":      "engineer",
}
# Default fallback: "bug-fixer"

# --- Persona symbol lookup (emoji, name, tagline) ---
PERSONA_MAP = {
  "plan-fix":    ("🍂", "Bug Fixer",  "I find what has decayed and restore it."),
  "review-plan": ("🌿", "Supervisor", "I review before things move forward. I read the actual fix, not just the plan."),
  "implement":   ("🍂", "Bug Fixer",  "I find what has decayed and restore it."),
  "review-code": ("🌿", "Supervisor", "I review before things move forward. I read the actual code, not the report."),
  "approve":     ("🗻", "Architect",  "I hold the shape of the whole. I give final sign-off before commit."),
  "commit":      ("🌱", "Engineer",   "I close out completed work with a clean, honest commit."),
}
# Default fallback: ("🍂", "Bug Fixer", "I find what has decayed and restore it.")

# --- Banner identity map (banner name per phase role) ---
BANNER_MAP = {
  "plan-fix":    "rift",
  "review-plan": "oracle",
  "implement":   "rift",
  "review-code": "oracle",
  "approve":     "north",
  "commit":      "forge",
}
# Default fallback: "rift"

# --- Announce phase with identity banner (badge) + bug context ---
emoji, persona_name, tagline = PERSONA_MAP.get(phase.role, ("🍂", "Bug Fixer", "I find what has decayed and restore it."))
banner_name = BANNER_MAP.get(phase.role, "rift")
run_bash(f'FORGE_ROOT=$(node -e "console.log(require(\\'./.forge/config.json\\').paths.forgeRoot)") && node "$FORGE_ROOT/tools/banners.cjs" --badge {banner_name}')
print(f"  → {bug_id}  [{phase_model}]\n")

# --- Symmetric Injection: noun resolved from ROLE_TO_NOUN ---
persona_noun    = ROLE_TO_NOUN.get(phase.role, "bug-fixer")
persona_content = read_file(f".forge/personas/{persona_noun}.md")
skill_content   = read_file(f".forge/skills/{persona_noun}-skills.md")

# --- Spawn subagent with "print this exact line first" instruction ---
spawn_subagent(
  prompt=(
    f"Your first action — before any file reads or tool use — run this command using the Bash tool to display your identity:\n\n"
    f"FORGE_ROOT=$(node -e \"console.log(require('./.forge/config.json').paths.forgeRoot)\") && node \"$FORGE_ROOT/tools/banners.cjs\" {banner_name}\n\n"
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
- `ROLE_TO_NOUN` MUST cover all six phases: `plan-fix`, `review-plan`, `implement`, `review-code`, `approve`, `commit`.
- `PERSONA_MAP` MUST cover the same six phases with the correct emoji/name/tagline per persona (bug-fixer, supervisor, architect, engineer — not all bug-fixer).
- Persona and skill file lookups MUST use `{persona_noun}.md` and `{persona_noun}-skills.md` from `ROLE_TO_NOUN`, never `{phase.role}.md` or a hardcoded `"bug-fixer"` noun for all phases.
- The sidecar path uses `.forge/store/events/bugs/_{event_id}_usage.json` (not `events/{sprint_id}/`).
- The announcement `print()` line MUST include `{tagline}` and `[{phase_model}]`.
- The `spawn_subagent` prompt MUST open with the "Your first output — before any tool use or file reads — print this exact line:" instruction.
