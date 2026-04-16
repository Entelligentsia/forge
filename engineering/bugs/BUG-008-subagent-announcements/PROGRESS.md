# PROGRESS — FORGE-BUG-008: Fix subagent announcements

🍂 *Forge Bug Fixer*

**Bug ID:** FORGE-BUG-008
**Sprint:** FORGE-S09 (active)

---

## Summary

Implemented the approved BUG_FIX_PLAN.md in full. Added a complete `PERSONA_MAP` + `spawn_subagent` announcement algorithm to `forge/meta/workflows/meta-fix-bug.md` to eliminate the missing-announcements bug (root cause 1). Regenerated `.forge/workflows/orchestrate_task.md` with the correct `ROLE_TO_NOUN` dict and tagline/model in announcements (root cause 2). Regenerated `.forge/personas/` and `.forge/skills/` with noun-based filenames (`engineer.md`, `supervisor.md`, `bug-fixer.md`, etc.) to replace the stale role-based files that caused `read_file` to return empty strings (root cause 3). Version bumped to `0.9.5` with migration entry and security scan completed.

## Syntax Check Results

No JS/CJS files were modified. All changes are Markdown meta-workflow edits.
The plan declared this explicitly: "No JS code changes required."

```
(no node --check commands applicable — Markdown-only changes)
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run

ERROR  FORGE-S01: undeclared field: "path"
... (9 sprint path errors, 1 bug field error, 19 event errors in FORGE-S09)
29 error(s) found.
```

These 29 errors are pre-existing — they were present before this fix and are tracked under BUG-002, BUG-003, and are scheduled for closure in FORGE-S09-T08. None of the errors were introduced by this implementation. No schemas were modified by this fix.

## Files Changed

| File | Change |
|---|---|
| `forge/meta/workflows/meta-fix-bug.md` | Added `## Announcement Algorithm` block with complete `PERSONA_MAP`, noun-based persona/skill injection (`"bug-fixer"` noun constant), and verbatim `spawn_subagent` prompt with "print this exact line first" instruction |
| `forge/.claude-plugin/plugin.json` | Version bumped `0.9.4` → `0.9.5` |
| `forge/migrations.json` | Added migration entry `"0.9.4"` → `"0.9.5"` with `regenerate: ["workflows:fix_bug", "workflows:orchestrate_task", "personas", "skills"]` |
| `.forge/workflows/orchestrate_task.md` | Added `ROLE_TO_NOUN` dict; updated announcement to include `{tagline}` and `[{phase_model}]`; updated persona/skill lookups to use `persona_noun` (noun-based) |
| `.forge/workflows/fix_bug.md` | Added `PERSONA_MAP` (all 6 phases); added `print()` announcement before each spawn; replaced bare announcement with full symmetric injection (`read_file(".forge/personas/bug-fixer.md")`, `read_file(".forge/skills/bug-fixer-skills.md")`); added "print this exact line first" instruction to spawn_subagent prompt; updated Agent Announcement Banner section |
| `.forge/personas/engineer.md` | New noun-based persona file (replaces stale `plan.md`/`implement.md` etc.) |
| `.forge/personas/supervisor.md` | New noun-based persona file (replaces stale `review-plan.md`/`review-code.md`) |
| `.forge/personas/qa-engineer.md` | New noun-based persona file (replaces stale `validate.md`) |
| `.forge/personas/architect.md` | New noun-based persona file (replaces stale `approve.md`) |
| `.forge/personas/collator.md` | New noun-based persona file |
| `.forge/personas/bug-fixer.md` | New noun-based persona file |
| `.forge/skills/engineer-skills.md` | New noun-based skill file |
| `.forge/skills/supervisor-skills.md` | New noun-based skill file |
| `.forge/skills/qa-engineer-skills.md` | New noun-based skill file |
| `.forge/skills/architect-skills.md` | New noun-based skill file |
| `.forge/skills/collator-skills.md` | New noun-based skill file |
| `.forge/skills/bug-fixer-skills.md` | New noun-based skill file |
| `engineering/stack-checklist.md` | Added checklist item under `## Meta-Workflows` for BUG-008 regression guard |
| `docs/security/scan-v0.9.5.md` | Security scan report for v0.9.5 |
| `README.md` | Added v0.9.5 row to Security Scan History table |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `meta-fix-bug.md` contains `PERSONA_MAP` covering all 6 phases | 〇 Pass | All 6 phases mapped to 🍂 Bug Fixer |
| `meta-fix-bug.md` contains verbatim `spawn_subagent` with "print this exact line first" | 〇 Pass | Full algorithm block added |
| `meta-fix-bug.md` specifies `.forge/store/events/bugs/` sidecar path | 〇 Pass | Explicit in algorithm block |
| `.forge/workflows/fix_bug.md` contains `PERSONA_MAP` and announcement print | 〇 Pass | Regenerated with full algorithm |
| `.forge/workflows/orchestrate_task.md` uses `ROLE_TO_NOUN` dict | 〇 Pass | Dict added; `persona_noun` lookups confirmed |
| `.forge/workflows/orchestrate_task.md` announcement includes `{tagline}` and `[{phase_model}]` | 〇 Pass | Line 164 confirmed |
| `.forge/personas/engineer.md`, `supervisor.md`, `qa-engineer.md`, `architect.md`, `collator.md`, `bug-fixer.md` exist | 〇 Pass | All 6 files created |
| `.forge/skills/engineer-skills.md`, `supervisor-skills.md`, `bug-fixer-skills.md` exist | 〇 Pass | All 7 skill files created |
| `forge/.claude-plugin/plugin.json` version is `0.9.5` | 〇 Pass | |
| `forge/migrations.json` has `"0.9.4"` → `"0.9.5"` with correct regenerate targets | 〇 Pass | 4 targets: fix_bug, orchestrate_task, personas, skills |
| Security scan completed and report at `docs/security/scan-v0.9.5.md` | 〇 Pass | SAFE TO USE — 0 critical |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.9.4 → 0.9.5)
- [x] Migration entry added to `forge/migrations.json` with correct `regenerate` targets
- [x] Security scan run and report committed (`docs/security/scan-v0.9.5.md`)

## Knowledge Updates

- Added stack-checklist item under `## Meta-Workflows`: guards against future omission of `PERSONA_MAP` / noun-based injection / "print this exact line first" instruction in `meta-fix-bug.md`.

## Notes

- The old role-based persona files (`plan.md`, `implement.md`, `approve.md`, etc.) remain in `.forge/personas/` alongside the new noun-based files. They are not deleted by this fix — they are stale but harmless since the orchestrator now uses `ROLE_TO_NOUN.get(phase.role, phase.role)` which resolves to the noun-based files. Cleanup of the stale files can be done in a future maintenance pass.
- The 29 pre-existing `validate-store --dry-run` errors are tracked as BUG-002/003 and scheduled for FORGE-S09-T08 — not in scope for this bug fix.
- No deviations from `BUG_FIX_PLAN.md`.
