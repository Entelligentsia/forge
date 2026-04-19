# PLAN — FORGE-BUG-008: Fix subagent announcements (PERSONA_MAP + noun-based lookup + regeneration)

🍂 *Forge Bug Fixer*

**Bug ID:** FORGE-BUG-008  
**GitHub Issue:** https://github.com/Entelligentsia/forge/issues/39  
**Severity:** major  
**Estimate:** M

---

## Objective

Eliminate the three compounding causes of sporadic/missing subagent announcements by:

1. Adding a complete, verbatim `PERSONA_MAP + spawn_subagent` algorithm to `forge/meta/workflows/meta-fix-bug.md` so every future regeneration of `fix_bug.md` carries correct announcement infrastructure.
2. Regenerating `.forge/workflows/`, `.forge/personas/`, and `.forge/skills/` so the running instance picks up both the already-correct `meta-orchestrate.md` changes and the new `meta-fix-bug.md` changes.
3. Bumping the plugin version and adding a migration entry so users who run `/forge:update` get noun-based personas and the fixed `fix_bug.md` regenerated for their projects.

---

## Approach

**Root cause 1 (primary — business-rule): `meta-fix-bug.md` missing concrete algorithm.**  
`forge/meta/workflows/meta-fix-bug.md` Generation Instructions say "do symmetric injection" but supply no `PERSONA_MAP`, no `ROLE_TO_NOUN` equivalent for bug phases, and no verbatim `spawn_subagent(prompt=...)` block. The fix adds the full algorithm — mirroring the pattern at lines 168–217 of `meta-orchestrate.md` — with bug-phase-specific persona data (emoji 🍂, name "Bug Fixer", tagline "I find what has decayed and restore it.") and event store root path `.forge/store/events/bugs/`.

**Root cause 2 (secondary — regression): generated `orchestrate_task.md` is stale.**  
`meta-orchestrate.md` already has the correct `ROLE_TO_NOUN` mapping and correct announcement format (including `tagline` and `[{phase_model}]`), but the generated `.forge/workflows/orchestrate_task.md` still uses role-literal lookups and the old announcement format. Fix: regenerate.

**Root cause 3 (secondary — regression): `.forge/personas/` has stale role-based filenames.**  
`.forge/personas/` contains `plan.md`, `implement.md`, etc. instead of noun-based `engineer.md`, `supervisor.md`, etc. When the corrected orchestrator runs noun-based lookups, `read_file` returns `""`. Fix: regenerate personas and skills.

**No JS code changes required.** All three fixes are Markdown meta-workflow edits plus regeneration. A version bump is required because the generated `fix_bug.md` behaviour changes.

---

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/meta/workflows/meta-fix-bug.md` | Add `PERSONA_MAP` + `spawn_subagent` verbatim algorithm block to Generation Instructions | Root cause 1: adds concrete announcement infrastructure that survives every future regeneration |
| `forge/.claude-plugin/plugin.json` | Bump version from `0.9.4` → `0.9.5` | Material change: generated `fix_bug.md` and `orchestrate_task.md` behaviour changes |
| `forge/migrations.json` | Add migration entry `"0.9.4"` → `"0.9.5"` with `regenerate: ["workflows:fix_bug", "workflows:orchestrate_task", "personas", "skills"]` | Users need to regenerate four targets to receive the fix |

**Files to regenerate (post-source-edit, in this project's `.forge/` instance):**

| Generated File/Dir | Why stale | Regeneration target |
|---|---|---|
| `.forge/workflows/fix_bug.md` | Missing PERSONA_MAP + announce algorithm | `workflows:fix_bug` |
| `.forge/workflows/orchestrate_task.md` | Role-based lookups + missing tagline/model in announcement | `workflows:orchestrate_task` |
| `.forge/personas/` | Stale role-based filenames (`plan.md`, `implement.md`, …) | `personas` |
| `.forge/skills/` | Stale role-based filenames (`plan-skills.md`, `implement-skills.md`, …) | `skills` |

---

## Specific Edit to `forge/meta/workflows/meta-fix-bug.md`

The Generation Instructions section needs a new **Announcement Algorithm** block inserted directly after the existing `## Generation Instructions` header bullets. The algorithm must:

1. Define `PERSONA_MAP` with a single entry for all bug-fix phases:
   ```
   PERSONA_MAP = {
     "triage":    ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
     "plan-fix":  ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
     "implement": ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
     "review":    ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
     "approve":   ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
     "commit":    ("🍂", "Bug Fixer", "I find what has decayed and restore it."),
   }
   ```
   Default fallback: `("🍂", "Bug Fixer", "I find what has decayed and restore it.")`

2. Before spawning each subagent, announce to stdout:
   ```
   print(f"\n{emoji} **Forge {persona_name}** — {bug_id} · {tagline} [{phase_model}]\n")
   ```

3. Perform symmetric injection using noun `"bug-fixer"` (constant — all bug phases use the same persona):
   ```
   persona_content = read_file(".forge/personas/bug-fixer.md")
   skill_content   = read_file(".forge/skills/bug-fixer-skills.md")
   ```

4. The `spawn_subagent` prompt must begin with the "print this exact line first" instruction:
   ```
   spawn_subagent(
     prompt=(
       f"Your first output — before any tool use or file reads — print this exact line:\n\n"
       f"{emoji} **Forge {persona_name}** — {bug_id} · {tagline} [{phase_model}]\n\n"
       f"---\n\n"
       f"{persona_content}\n\n"
       f"{skill_content}\n\n"
       f"### Current Working Context\n"
       f"- Bug Root:   {bug_root_path}\n"
       f"- Store Root: {store_root_path}\n"
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

5. Event store root for bug events is `.forge/store/events/bugs/` (not `events/{sprint_id}/`).

---

## Plugin Impact Assessment

- **Version bump required?** Yes — `0.9.4` → `0.9.5`. Bug fix to a meta-workflow that alters generated workflow behaviour (`fix_bug.md`) and requires regeneration of `orchestrate_task.md`, personas, and skills.
- **Migration entry required?** Yes — `regenerate: ["workflows:fix_bug", "workflows:orchestrate_task", "personas", "skills"]`
- **Security scan required?** Yes — any change to `forge/` requires a scan before push. The scan must be run against `forge/` source (not the plugin cache).
- **Schema change?** No — no `forge/schemas/` files are modified.

---

## Migration Entry

```json
"0.9.4": {
  "version": "0.9.5",
  "date": "2026-04-15",
  "notes": "Fix BUG-008: meta-fix-bug.md gains complete PERSONA_MAP + spawn_subagent announcement algorithm with noun-based persona/skill injection; orchestrate_task.md regenerated with correct ROLE_TO_NOUN lookup and tagline+model in announcement; .forge/personas/ and .forge/skills/ regenerated with noun-based filenames (engineer.md, supervisor.md, bug-fixer.md, etc.).",
  "regenerate": [
    "workflows:fix_bug",
    "workflows:orchestrate_task",
    "personas",
    "skills"
  ],
  "breaking": false,
  "manual": []
}
```

---

## Testing Strategy

- **Syntax check:** `node --check` does not apply — no JS files are modified. All changes are Markdown.
- **Store validation:** `node forge/tools/validate-store.cjs --dry-run` — run to confirm no schema drift introduced by regeneration. Expected: 0 errors.
- **Manual smoke test (post-regeneration):**
  1. Confirm `.forge/personas/engineer.md`, `.forge/personas/supervisor.md`, `.forge/personas/bug-fixer.md` exist (noun-based).
  2. Confirm `.forge/personas/plan.md` is gone (or is the old file — regeneration should replace the directory contents).
  3. Confirm `.forge/workflows/orchestrate_task.md` contains `ROLE_TO_NOUN` dictionary and `{persona_noun}.md` lookup (not `{phase.role}.md`).
  4. Confirm `.forge/workflows/orchestrate_task.md` announcement line includes `{tagline}` and `[{phase_model}]`.
  5. Confirm `.forge/workflows/fix_bug.md` contains a `PERSONA_MAP` block and a `spawn_subagent` call with the "print this exact line first" instruction.
  6. Confirm `.forge/workflows/fix_bug.md` reads `.forge/personas/bug-fixer.md` (not `plan.md` or any role-based name).
- **Regression guard (stack checklist):** After implementation, add a checklist item to `engineering/stack-checklist.md` under `## Meta-Workflows`:
  > `- [ ] meta-fix-bug.md spawn_subagent block includes PERSONA_MAP, noun-based persona/skill injection, and "print this exact line first" instruction — changes to announcements go in forge/meta/, never in .forge/ directly`

---

## Acceptance Criteria

- [ ] `forge/meta/workflows/meta-fix-bug.md` contains a `PERSONA_MAP` covering all bug-fix phases with emoji 🍂, name "Bug Fixer", and tagline "I find what has decayed and restore it."
- [ ] `forge/meta/workflows/meta-fix-bug.md` contains a verbatim `spawn_subagent(prompt=...)` block with "print this exact line first" instruction and symmetric injection of `.forge/personas/bug-fixer.md` + `.forge/skills/bug-fixer-skills.md`
- [ ] `forge/meta/workflows/meta-fix-bug.md` specifies event store root `.forge/store/events/bugs/` for sidecar paths
- [ ] `.forge/workflows/fix_bug.md` (post-regeneration) contains `PERSONA_MAP`, announcement print, and spawn_subagent with "print this exact line first"
- [ ] `.forge/workflows/orchestrate_task.md` (post-regeneration) uses `persona_noun = ROLE_TO_NOUN.get(phase.role, phase.role)` and `read_file(f".forge/personas/{persona_noun}.md")` — no `{phase.role}.md` lookup
- [ ] `.forge/workflows/orchestrate_task.md` (post-regeneration) announcement line includes `{tagline}` and `[{phase_model}]`
- [ ] `.forge/personas/engineer.md`, `.forge/personas/supervisor.md`, `.forge/personas/qa-engineer.md`, `.forge/personas/architect.md`, `.forge/personas/collator.md`, `.forge/personas/bug-fixer.md` all exist
- [ ] `.forge/skills/engineer-skills.md`, `.forge/skills/supervisor-skills.md`, `.forge/skills/bug-fixer-skills.md` all exist
- [ ] `forge/.claude-plugin/plugin.json` version is `0.9.5`
- [ ] `forge/migrations.json` has `"0.9.4"` key pointing to version `0.9.5` with correct regenerate targets
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0 after regeneration
- [ ] Security scan completed and report saved to `docs/security/scan-v0.9.5.md`

---

## Operational Impact

- **Distribution:** Users who run `/forge:update` will be instructed to regenerate `workflows:fix_bug`, `workflows:orchestrate_task`, `personas`, and `skills`. No manual steps required — `breaking: false`.
- **Backwards compatibility:** Existing `.forge/` instances that have not yet regenerated will continue to use the stale role-based persona lookups (which return `""` silently). The announcement banners will be missing until regeneration runs. This is the pre-existing degraded behaviour — no regression introduced by the version bump alone.
- **No JS changes:** No hooks, tools, or schemas are modified. Only Markdown meta-workflows change, so there is no risk to the Node.js runtime layer.
