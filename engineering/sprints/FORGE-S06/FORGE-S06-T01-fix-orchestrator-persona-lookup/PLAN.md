# PLAN — FORGE-S06-T01: Fix orchestrator persona lookup + model announcement

🌱 *Forge Engineer*

**Task:** FORGE-S06-T01
**Sprint:** FORGE-S06
**Estimate:** M

---

## Objective

Fix the orchestrator meta-workflow (`meta-orchestrate.md`) to use noun-based persona file lookups derived from PERSONA_MAP instead of role-based filenames, and include the resolved model in the agent identity announcement line. This closes SPRINT_REQUIREMENTS items 1b and 1e.

## Approach

The PERSONA_MAP already maps roles (e.g. `plan`) to nouns (e.g. `Engineer`). The fix introduces a `ROLE_TO_NOUN` lookup table alongside `PERSONA_MAP` and rewrites the two file-read lines (`persona_content`, `skill_content`) and the announcement `print()` line in the Execution Algorithm. A corresponding Generation Instructions section is added so that generated project orchestrators inherit the same pattern. The change is confined to a single file: `forge/meta/workflows/meta-orchestrate.md`.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/meta/workflows/meta-orchestrate.md` | Add `ROLE_TO_NOUN` mapping table; rewrite `persona_content` and `skill_content` lookups to use noun-based filenames; update announcement line to include `{task_id}`, `{tagline}`, and `[{resolved_model}]`; add Generation Instructions section for role-to-noun mapping | Task prompt acceptance criteria 1-4 |

## Plugin Impact Assessment

- **Version bump required?** Yes -- changes how generated orchestrators resolve persona files and format announcements, which is user-visible behaviour in generated workflow output.
- **Migration entry required?** Yes -- `regenerate` list must include `workflows:orchestrate_task` so users regenerate their orchestrator after updating.
- **Security scan required?** Yes -- the modified file is inside `forge/`.
- **Schema change?** No -- no JSON schemas are affected.

## Detailed Changes

### 1. Add ROLE_TO_NOUN mapping table

Insert before the Execution Algorithm, adjacent to PERSONA_MAP:

```
ROLE_TO_NOUN = {
  "plan":        "engineer",
  "implement":   "engineer",
  "update-plan": "engineer",
  "update-impl": "engineer",
  "commit":      "engineer",
  "review-plan": "supervisor",
  "review-code": "supervisor",
  "validate":    "qa-engineer",
  "approve":     "architect",
  "writeback":   "collator",
}
```

This table is the single source of truth for translating a `phase.role` (which may include compound roles like `update-plan`) into the persona noun used for file lookups. It aligns with the existing meta-persona filenames in `forge/meta/personas/` (`meta-engineer.md`, `meta-supervisor.md`, `meta-architect.md`, `meta-qa-engineer.md`, `meta-collator.md`).

### 2. Rewrite persona and skill file lookups

**Before (current):**
```python
persona_content = read_file(f".forge/personas/{phase.role}.md")
skill_content   = read_file(f".forge/skills/{phase.role}-skills.md")
```

**After (fixed):**
```python
persona_noun    = ROLE_TO_NOUN.get(phase.role, phase.role)
persona_content = read_file(f".forge/personas/{persona_noun}.md")
skill_content   = read_file(f".forge/skills/{persona_noun}-skills.md")
```

The `.get()` fallback preserves the old role-literal behaviour for any role not yet in the table, which is a safe degradation path.

### 3. Update the announcement line

**Before (current):**
```python
print(f"\n{emoji} **Forge {persona_name}** — {phase.name} · {task_id}\n")
```

**After (fixed):**
```python
print(f"\n{emoji} **Forge {persona_name}** — {task_id} · {tagline} [{phase_model}]\n")
```

Changes:
- `{phase.name}` replaced with `{task_id}` -- the task ID is more useful than the phase name for identification.
- `{tagline}` added -- already available from `PERSONA_MAP`, just not used in the current print line.
- `[{phase_model}]` added -- shows the resolved model (e.g. `sonnet`, `opus`, `haiku`) so the user can see which model is executing each phase.

### 4. Add Generation Instructions section for role-to-noun mapping

Add a new subsection under Generation Instructions:

```markdown
- **Include the role-to-noun mapping table.** The generated orchestrator MUST include
  a `ROLE_TO_NOUN` dictionary (or equivalent in the host language) that maps every
  pipeline phase role to a noun-based persona identifier. This table is used for
  persona and skill file lookups, not for display. Example:
  | Role | Noun | Persona File | Skill File |
  |------|------|-------------|------------|
  | `plan` | `engineer` | `.forge/personas/engineer.md` | `.forge/skills/engineer-skills.md` |
  | `implement` | `engineer` | `.forge/personas/engineer.md` | `.forge/skills/engineer-skills.md` |
  | `review-plan` | `supervisor` | `.forge/personas/supervisor.md` | `.forge/skills/supervisor-skills.md` |
  | `review-code` | `supervisor` | `.forge/personas/supervisor.md` | `.forge/skills/supervisor-skills.md` |
  | `validate` | `qa-engineer` | `.forge/personas/qa-engineer.md` | `.forge/skills/qa-engineer-skills.md` |
  | `approve` | `architect` | `.forge/personas/architect.md` | `.forge/skills/architect-skills.md` |
  | `commit` | `engineer` | `.forge/personas/engineer.md` | `.forge/skills/engineer-skills.md` |
  | `writeback` | `collator` | `.forge/personas/collator.md` | `.forge/skills/collator-skills.md` |
  Generated lookups must use `{persona_noun}.md` and `{persona_noun}-skills.md`,
  never `{phase.role}.md` or `{phase.role}-skills.md`.
```

### 5. Update the spawn_subagent prompt announcement instruction

The announcement instruction in the subagent prompt must also reflect the new format. Currently:

```
f"Your first output — before any tool use or file reads — print this exact line:\n\n"
f"{emoji} **Forge {persona_name}** — {tagline}\n\n"
```

This is already partially correct (uses tagline), but should include the model:

```
f"Your first output — before any tool use or file reads — print this exact line:\n\n"
f"{emoji} **Forge {persona_name}** — {task_id} · {tagline} [{phase_model}]\n\n"
```

Note: the orchestrator's own `print()` and the subagent's announcement line should use the same format.

## Testing Strategy

- Syntax check: N/A -- `meta-orchestrate.md` is Markdown, not JS.
- Store validation: `node forge/tools/validate-store.cjs --dry-run` -- no schema changes, should exit 0.
- Manual verification:
  1. Read the modified `meta-orchestrate.md` and confirm all four acceptance criteria from the task prompt are satisfied.
  2. Confirm `ROLE_TO_NOUN` covers every role in `PERSONA_MAP`.
  3. Confirm no `read_file(f".forge/personas/{phase.role}.md")` pattern remains.
  4. Confirm the announcement line includes `{task_id}`, `{tagline}`, and `[{phase_model}]`.

## Acceptance Criteria

- [ ] Execution Algorithm uses noun-based persona file lookup via `ROLE_TO_NOUN` (e.g. `phase.role = "plan"` resolves to `engineer.md`, not `plan.md`)
- [ ] An explicit role-to-noun mapping table is added to the Generation Instructions
- [ ] `skill_content` lookup also uses noun-based filenames consistently
- [ ] Announcement line format: `{emoji} **Forge {persona_name}** — {task_id} · {tagline} [{phase_model}]`
- [ ] `node --check` passes on all modified JS/CJS files (none in this task -- Markdown only)
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users must run `/forge:update` to regenerate `orchestrate_task.md`. The migration entry will list `workflows:orchestrate_task` in `regenerate`.
- **Backwards compatibility:** The change is additive in effect -- noun-based lookups will work once personas are regenerated with noun filenames (FORGE-S06-T03 adds `personas` to the regenerate defaults). Until then, the `ROLE_TO_NOUN.get(phase.role, phase.role)` fallback means a missing mapping degrades to the current role-literal behaviour, which will find the existing role-named files (`plan.md`, `approve.md`, etc.) as a fallback. This is a safe transition path.

## Version Bump Decision

**Material change.** New version: `0.7.3`.

Rationale: the change alters how generated orchestrators resolve persona files and format announcements -- this is user-visible behaviour in the generated `orchestrate_task.md` workflow.

## Migration Entry

```json
"0.7.2": {
  "version": "0.7.3",
  "date": "2026-04-14",
  "notes": "Fix orchestrator persona lookup: noun-based filenames via ROLE_TO_NOUN (plan→engineer, approve→architect, etc.) instead of role-based; announcement line includes task ID, tagline, and resolved model.",
  "regenerate": [
    {
      "target": "workflows:orchestrate_task",
      "type": "functional",
      "patch": "Replace role-based persona/skill file lookups with noun-based lookups via ROLE_TO_NOUN map. Update announcement line to include task ID, tagline, and resolved model."
    }
  ],
  "breaking": false,
  "manual": []
}
```

## Security Scan

Required. Any change to `forge/` requires a scan. Run after implementation:
```
/security-watchdog:scan-plugin forge:forge --source-path forge/
```
Save report to `docs/security/scan-v0.7.3.md`.