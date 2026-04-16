# BUG-008 Analysis — Subagent Announcements Sporadic and Lost on Regeneration

**GitHub Issue:** https://github.com/Entelligentsia/forge/issues/39  
**Severity:** major  
**Status:** in-progress

## Root Causes

Three compounding root causes identified:

### 1. `meta-fix-bug.md` lacks complete verbatim algorithm (primary — `business-rule`)

`forge/meta/workflows/meta-fix-bug.md` Generation Instructions only say "do symmetric injection" but provide no concrete algorithm. There is no `PERSONA_MAP`, no `ROLE_TO_NOUN` equivalent, and no verbatim `spawn_subagent(prompt=...)` block showing the "print this exact line first" instruction. Compare with `meta-orchestrate.md` lines 168–217 which have the full algorithm.

**Fix:** Add a complete verbatim `PERSONA_MAP + spawn_subagent` block to `meta-fix-bug.md`'s Algorithm section, matching the pattern in `meta-orchestrate.md`.

### 2. Generated `orchestrate_task.md` is stale (secondary — `regression`)

`meta-orchestrate.md` already has the correct `ROLE_TO_NOUN` mapping (lines 144–156) and correct announcement format (line 203), but the generated `.forge/workflows/orchestrate_task.md` still uses:
- `read_file(f".forge/personas/{phase.role}.md")` (role-based) instead of `read_file(f".forge/personas/{persona_noun}.md")` (noun-based)  
- `print(f"\n{emoji} **Forge {persona_name}** — {phase.name} · {task_id}\n")` — missing `tagline` and `[{phase_model}]`
- Subagent announcement prompt missing `{task_id}` and `[{phase_model}]`

**Fix:** Regenerate `.forge/workflows/orchestrate_task.md` from the already-correct meta.

### 3. `.forge/personas/` has stale role-based filenames (secondary — `regression`)

`.forge/personas/` contains: `plan.md`, `implement.md`, `review-code.md`, etc.  
`forge/meta/personas/` already generates noun-based names: `meta-engineer.md`, `meta-supervisor.md`, etc.  
When noun-based lookups run (`engineer.md`, `supervisor.md`, etc.), files are missing → `read_file` returns `""` → persona/skill context silently dropped.

**Fix:** Regenerate `.forge/personas/` and `.forge/skills/` to produce noun-based files.

### 4. Fix-in-generated-file anti-pattern (process — `configuration`)

Previous rounds of announcement fixes were applied directly to `.forge/workflows/*.md`, which CLAUDE.md explicitly prohibits. These fixes are silently wiped by `/forge:regenerate`.

**Fix:** All fixes go in `forge/meta/` only. Document in checklist.

## Files to Change

| File | Change |
|------|--------|
| `forge/meta/workflows/meta-fix-bug.md` | Add complete PERSONA_MAP + spawn_subagent algorithm |

## Files to Regenerate (after source fix)

| File | Via |
|------|-----|
| `.forge/workflows/fix_bug.md` | `/forge:regenerate` |
| `.forge/workflows/orchestrate_task.md` | `/forge:regenerate` |
| `.forge/personas/engineer.md` + others | `/forge:regenerate` |
| `.forge/skills/engineer-skills.md` + others | `/forge:regenerate` |
