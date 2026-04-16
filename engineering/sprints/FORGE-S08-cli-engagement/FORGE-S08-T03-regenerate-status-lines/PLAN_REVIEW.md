# PLAN REVIEW — FORGE-S08-T03: Regenerate per-file status lines

*Forge Supervisor*

**Task:** FORGE-S08-T03

---

**Verdict:** Approved

---

## Review Summary

The plan is well-scoped and correctly targets the single file that matters (`forge/commands/regenerate.md`). The standard emit pattern (`...` before, `O` after) is consistent across all five generation categories, and the knowledge-base exception is sensible. All five acceptance criteria are addressed. Two advisory notes below do not block approval.

## Feasibility

The approach is realistic. A single-file Markdown change with no JS/CJS modifications is the correct scope for an S-estimate task. The files-to-modify list correctly identifies `forge/commands/regenerate.md` as the sole target. Cross-referencing with `routing.md` confirms this is the right file for the regenerate command.

The plan's claim that the change "propagates to `/forge:init` (phases 3-8 call the same regeneration logic)" is **incorrect**. The init phases in `sdlc-init.md` follow their own generation prompts (`generate-personas.md`, `generate-workflows.md`, etc.) and do not invoke `/forge:regenerate`. The propagation to `/forge:update` is correct -- Step 4 of update.md explicitly reads and follows `regenerate.md` for each category. This factual error in the rationale does not affect what the plan actually delivers, but the propagation claim should be corrected before implementation to avoid confusion.

## Completeness

All five acceptance criteria from the plan are addressed:

1. Per-file emit instructions for all five generation categories -- covered in detailed changes.
2. `...` before write, `O` after hash record -- specified for each category.
3. Knowledge-base uses merge-level status -- explicitly documented with `N additions` format.
4. Category headers with file counts -- specified with "Generating <category> (<N> files)...".
5. Modified-file prompt before `...` line -- explicitly noted for workflows category.

Edge case: the plan correctly handles the manifest-check ordering for workflows (prompt first, then `...` line after user confirms or file is pristine).

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes -- deferred to T06. This is a material change (user-facing command behavior), so a version bump is required. Deferral to the release-engineering task is standard and correct for this sprint.
- **Migration entry targets correct?** Yes -- deferred to T06. The `regenerate` field should be `[]` since no generated artifacts (workflows, tools, schemas) are affected -- only the command's output behavior changes. The plan does not specify the targets, which is acceptable given the deferral, but T06 should set `regenerate: []`.
- **Security scan requirement acknowledged?** Yes -- deferred to T06. Any change to `forge/` requires a scan. Acknowledged.

## Security

No concerns. The change adds output-only emit instructions to a Markdown command file. No new JS code, no `require()` calls, no credential access, no external HTTP calls. The `...` and `O` markers are static strings, not derived from user input, so no prompt injection risk.

The security scan (deferred to T06) will cover this file as part of the full `forge/` scan.

## Architecture Alignment

- Follows existing command pattern (Markdown instruction file with numbered steps).
- No schema changes, so `additionalProperties: false` is preserved.
- No hooks involved.
- The plan does not read paths from `.forge/config.json` directly -- it doesn't need to, since the regenerate command already resolves `FORGE_ROOT` at the top.

## Testing Strategy

The testing strategy covers the critical paths: workflows (largest category), personas, and default (workflows + commands + templates + personas). Two minor gaps:

1. **Skills category not explicitly tested.** The default regeneration (`/forge:regenerate` with no args) does NOT include skills -- it runs workflows + commands + templates + personas only. Skills must be tested separately via `/forge:regenerate skills`. The plan's testing section should add this case, or note that skills follows the same pattern as personas (which it does -- both use the same emit pattern).

2. **Knowledge-base not explicitly tested.** The merge-level status format is different from the per-file format, and it has the `N additions` count. A quick test of `/forge:regenerate knowledge-base architecture` would verify this works.

These gaps are low-risk because both categories follow clearly documented patterns, but an implementer should verify them during smoke testing.

---

## If Approved

### Advisory Notes

1. **Correct the propagation claim.** The plan states the change propagates to init, but init phases follow `sdlc-init.md` and their own generation prompts -- they do not invoke `/forge:regenerate`. The propagation to update is correct. This claim should be removed or corrected in the plan text to avoid misleading implementers.

2. **Add skills and knowledge-base to testing strategy.** At minimum, note that `/forge:regenerate skills` should be verified (same pattern as personas), and `/forge:regenerate knowledge-base architecture` should verify the merge-level status format.

3. **Clarify migration `regenerate` targets for T06.** The plan defers the migration entry to T06 but does not suggest what the `regenerate` targets should be. Since only the command's output behavior changes (not any generated artifact), the targets should be `[]`. This note would help T06 avoid guessing.