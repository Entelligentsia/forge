# PLAN — FORGE-S09-T01: Renumber sdlc-init.md phases to sequential integers

🌱 *Forge Engineer*

**Task:** FORGE-S09-T01
**Sprint:** FORGE-S09
**Estimate:** M

---

## Objective

Eliminate fractional phase numbering (Phase 1.5, Phase 3b) in the init command
and its orchestration document, replacing them with sequential integers. This
removes the class of checkpoint bug seen in S08 T01/T02 where string-based
phase identifiers caused lookup failures.

## Approach

Perform a systematic find-and-replace across the two primary files
(`forge/init/sdlc-init.md` and `forge/commands/init.md`) and one secondary
file (`forge/meta/skill-recommendations.md`). The renumbering follows the
mapping established in the task prompt: every fractional phase gets the next
available integer, and all subsequent phases shift up by one. Checkpoint
`lastPhase` values, banner format strings, resume mapping table entries, and
valid-input sets are all updated in lockstep.

### Numbering Map

| Old | New | Name |
|-----|-----|------|
| 1 | 1 | Discover |
| 1.5 | 2 | Marketplace Skills |
| 2 | 3 | Knowledge Base |
| 3 | 4 | Personas |
| 3b | 5 | Skills |
| 4 | 6 | Templates |
| 5 | 7 | Workflows |
| 6 | 8 | Orchestration |
| 7 | 9 | Commands |
| 8 | 10 | Tools |
| 9 | 11 | Smoke Test |

Total phase count changes from 9 (with fractional intermediates) to 11
sequential phases. Banner denominators change from `/9` to `/11`.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/init/sdlc-init.md` | Renumber all phase headings, banners, checkpoint values; update total from 9 to 11 phases; update Report section's "Phase 1.5" reference | Primary orchestration document — all phase identifiers defined here |
| `forge/commands/init.md` | Renumber resume-mapping table, pre-flight plan list, valid-input set, banner format note; update phase count from 9 to 11 | Command entry point — user-facing phase selection and resume logic |
| `forge/meta/skill-recommendations.md` | Change "Phase 1.5" header reference to "Phase 2" | Secondary reference in meta skill recommendations doc |

### Detailed changes per file

**`forge/init/sdlc-init.md`** (11 occurrences):
1. Line 3: `Execute these 9 phases` → `Execute these 11 phases`
2. Line 13: `Phase 1/9` → `Phase 1/11`
3. Line 38: `Phase 1.5` → `Phase 2`
4. Line 40: `Phase 1.5/9` → `Phase 2/11`
5. Line 88: `"lastPhase": "1.5"` → `"lastPhase": 2`
6. Line 95: `Phase 2/9` → `Phase 3/11`
7. Line 105: `"lastPhase": 2` → `"lastPhase": 3`
8. Line 113: `Phase 3/9` → `Phase 4/11`
9. Line 123: `"lastPhase": 3` → `"lastPhase": 4`
10. Line 127: `Phase 3b` → `Phase 5`
11. Line 129: `Phase 3b/9` → `Phase 5/11`
12. Line 138: `"lastPhase": "3b"` → `"lastPhase": 5`
13. Lines 145-225: Renumber phases 4-9 to 6-11, update `/9` to `/11` in banners, update checkpoint `lastPhase` values (4→6, 5→7, 6→8, 7→9, 8→10, 9→11)
14. Line 252: `Phase 1.5` → `Phase 2`

**`forge/commands/init.md`** (7 occurrences):
1. Lines 43-47: Resume mapping table — renumber all entries to new integers
2. Lines 70-71: Banner format note — remove `1.5` and `3b` special-cases
3. Line 81: `9 phases` → `11 phases`
4. Line 83: `1.5  Marketplace Skills` → `2    Marketplace Skills`
5. Line 86: `3b   Skills` → `5    Skills`
6. Lines 84-93: Renumber phases 2-9 to 3-11
7. Line 98: Valid inputs: replace `1.5`, `3b` with `2`, `5`; add `10`, `11`; update all to `1` through `11`
8. Lines 105-113: Phase description list — renumber from 1-9 to 1-11 with correct names

**`forge/meta/skill-recommendations.md`** (1 occurrence):
1. Line 4: `Phase 1.5` → `Phase 2`

## Plugin Impact Assessment

- **Version bump required?** Yes — changes to `forge/commands/init.md` and `forge/init/sdlc-init.md` alter user-visible init behavior (phase numbering, checkpoint keys, resume logic)
- **Migration entry required?** Yes — `regenerate: ["commands"]` (init command is regenerated on update)
- **Security scan required?** Yes — all three modified files are inside `forge/`
- **Schema change?** No — event schema `phase` field is a free-form string; no JSON schemas in `forge/schemas/` are affected
- **New version:** 0.9.3

## Testing Strategy

- Syntax check: `node --check` — no JS files modified (all changes are `.md` files), so no syntax check needed
- Store validation: `node forge/tools/validate-store.cjs --dry-run` — no schema changes, should pass unchanged
- Manual smoke test: Run `/forge:init` in a test project and verify:
  1. Pre-flight plan shows 11 phases numbered 1-11
  2. Banners show `Phase N/11` format with no fractional numbers
  3. Checkpoint values in `.forge/init-progress.json` use integer values only
  4. Resume from any phase works with new integer identifiers
  5. Valid phase input accepts 1-11 (no `1.5` or `3b`)

## Acceptance Criteria

- [ ] All phases in `forge/init/sdlc-init.md` are integer-numbered (no 1.5, no 3b)
- [ ] All phases in `forge/commands/init.md` are integer-numbered and match sdlc-init.md
- [ ] Checkpoint/resume references in `init.md` use integer phase identifiers only
- [ ] Progress banners use the new integer numbering (N/11 format)
- [ ] `/forge:init` still works end-to-end with the new numbering
- [ ] `node --check` passes on all modified JS/CJS files (none modified, N/A)
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0
- [ ] Version bumped to 0.9.3 with migration entry

## Operational Impact

- **Distribution:** Users must run `/forge:update` to get the updated init command
- **Backwards compatibility:** Existing `.forge/init-progress.json` files with `"1.5"` or `"3b"` checkpoint values will fail the resume mapping lookup. The init command's resume detection code treats unrecognized `lastPhase` values as corrupt and restarts from scratch, so this is a graceful degradation — no data loss, just a re-init. This is acceptable and documented in the migration notes.