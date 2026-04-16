# PLAN REVIEW — FORGE-S09-T01: Renumber sdlc-init.md phases to sequential integers

🌿 *Forge Supervisor*

**Task:** FORGE-S09-T01

---

**Verdict:** Approved

---

## Review Summary

The plan is well-scoped and accurately addresses all acceptance criteria from the task prompt. It correctly identifies all three files containing fractional phase references, provides a complete numbering map, and acknowledges the version bump, migration, and security scan requirements. Two minor advisory items are noted below.

## Feasibility

The approach is realistic and correctly scoped for an M estimate. Find-and-replace across three Markdown files is straightforward. The numbering map is complete and internally consistent (old 1-9 with fractions maps cleanly to new 1-11).

The files identified are correct per `engineering/architecture/routing.md`:
- `forge/commands/init.md` — command entry point
- `forge/init/sdlc-init.md` — orchestration document
- `forge/meta/skill-recommendations.md` — secondary reference

## Completeness

All six acceptance criteria from the task prompt are addressed:
1. All phases in `sdlc-init.md` renumbered (no 1.5, no 3b) — covered
2. All phases in `init.md` renumbered and matching — covered
3. Checkpoint/resume references use integers only — covered
4. Progress banners use new numbering — covered (N/11 format)
5. `/forge:init` still works end-to-end — covered in manual smoke test
6. `node --check` passes — N/A (no JS files modified), correctly noted

Edge case: the plan correctly identifies that existing `.forge/init-progress.json` files with `"1.5"` or `"3b"` checkpoint values will be treated as unrecognized by the new code, triggering a restart. The init.md resume detection logic (lines 29-56) falls back gracefully when `lastPhase` is not in the valid set.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — 0.9.2 to 0.9.3 is appropriate for command/init behavior changes.
- **Migration entry targets correct?** Yes — `regenerate: ["commands"]` follows the precedent from 0.9.1 to 0.9.2 (which also changed init.md). The `commands` target regenerates `.claude/commands/` wrappers, ensuring users refresh their local command cache after the plugin update.
- **Security scan requirement acknowledged?** Yes — explicitly stated as required.
- **Schema change?** Correctly noted as no — the `phase` field in event schema is free-form string.

## Security

No new security risks introduced:
- Changes are purely to Markdown documentation files (no JS, no hooks, no tool specs)
- No prompt injection risk — renumbering existing phases does not introduce new user-influenced content
- No credential or env-var access changes
- No new external calls

Security scan is still required per policy (any `forge/` change triggers a scan), and the plan correctly acknowledges this.

## Architecture Alignment

- Follows established patterns (Markdown command files, no code changes)
- No `additionalProperties` concerns (no schema changes)
- No path hardcoding introduced
- No hooks modified (no `process.on('uncaughtException')` concern)
- No npm dependencies introduced

## Testing Strategy

- `node --check` — correctly noted as N/A (no JS files)
- `validate-store --dry-run` — correctly noted (should still pass, no schema changes)
- Manual smoke test — described with specific verification steps (11-phase plan, N/11 banners, integer checkpoints, resume logic)

**Advisory:** The smoke test could be more specific about testing the resume-from-checkpoint path. After running init through a few phases, interrupting, and re-running `/forge:init` to verify that the new integer `lastPhase` values resume correctly. This is non-blocking — the current test description is adequate.

## Rationalization Check

| Plan claims | Verification |
|---|---|
| Version bump to 0.9.3 | Correct — changes to `forge/commands/init.md` and `forge/init/sdlc-init.md` alter user-visible init behavior |
| Security scan required | Correct — all three files are in `forge/` |
| `regenerate: ["commands"]` | Acceptable — follows 0.9.2 precedent; conservative approach ensures local command wrappers are refreshed |
| Backwards compatible (graceful degradation) | Correct — unrecognized `lastPhase` values trigger restart, not crash |
| No schema change | Correct — `phase` field in event schema is free-form string |

---

## If Approved

### Advisory Notes

1. **Smoke test for resume path:** Consider verifying that `/forge:init` resume detection works with the new integer phase IDs by testing: (a) start init, complete Phase 2, (b) interrupt, (c) re-run init and confirm it offers to resume from Phase 3. Non-blocking.

2. **`forge/meta/skill-recommendations.md` scope check:** The plan correctly identifies this file as having one "Phase 1.5" reference on line 4. During implementation, verify there are no other fractional references in this file or in other meta files that the grep might have missed (e.g., in `forge/init/generation/` subfiles). Non-blocking.