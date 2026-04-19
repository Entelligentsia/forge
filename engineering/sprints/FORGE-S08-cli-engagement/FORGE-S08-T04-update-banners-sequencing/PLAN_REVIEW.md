# PLAN REVIEW — FORGE-S08-T04: Update step banners and explicit sequencing

*Forge Supervisor*

**Task:** FORGE-S08-T04

---

**Verdict:** Approved

---

## Review Summary

The plan is well-scoped and correctly targets the single file that matters (`forge/commands/update.md`). The banner format is consistent with the T01 pattern already implemented in `init.md`, and the sequencing table addresses a real gap in Step 4 where the regeneration order was previously only described in prose. All five acceptance criteria are addressed. Two advisory notes below do not block approval.

## Feasibility

The approach is realistic. A single-file Markdown change with no JS/CJS modifications is the correct scope for an S-estimate task. The files-to-modify list correctly identifies `forge/commands/update.md` as the sole target. Cross-referencing with `routing.md` confirms this is the right file for the update command.

The banner format (`━━━ Step N/6 — <name> ━━━`) mirrors the T01 pattern already in `init.md` (`━━━ Phase N/9 — <name> ━━━`), ensuring consistency across commands.

## Completeness

All five acceptance criteria from the plan are addressed:

1. Progress Output Format section — specified with exact format and placement.
2. Step banner emit instructions for all steps (1, 2A, 2B, 3, 4, 5, 6) — each has explicit banner text.
3. Sequencing table in Step 4 — specified with 6 targets in correct order.
4. `commands` depends on `workflows` — explicitly noted.
5. Only targets in aggregated result are executed — explicitly noted.

Edge case: Steps 2A and 2B share "Step 2/6" numbering (different names), which correctly represents them as alternative paths within the same step. This matches the current update.md structure where 2A and 2B are conditional branches.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — deferred to T06. This is a material change (user-facing command behaviour), so a version bump is required. Deferral to the release-engineering task is standard and correct for this sprint.
- **Migration entry targets correct?** Yes — deferred to T06. The `regenerate` field should be `[]` since no generated artifacts (workflows, tools, schemas) are affected — only the command's output behaviour changes.
- **Security scan requirement acknowledged?** Yes — deferred to T06. Any change to `forge/` requires a scan. Acknowledged.

## Security

No concerns. The change adds output-only emit instructions and a sequencing table to a Markdown command file. No new JS code, no `require()` calls, no credential access, no external HTTP calls. The banner format uses static `━` characters and step names, not user-derived content, so no prompt injection risk.

The security scan (deferred to T06) will cover this file as part of the full `forge/` scan.

## Architecture Alignment

- Follows existing command pattern (Markdown instruction file with numbered steps).
- Consistent with the T01 pattern already implemented in `init.md`.
- No schema changes, so `additionalProperties: false` is preserved.
- No hooks involved.
- The `personas` category in the sequencing table is a valid regeneration category per `regenerate.md` — it is not currently mentioned in update.md's Step 4 prose but should be, so this addition is correct.

## Testing Strategy

The testing strategy is adequate for an S task: verify banners appear at each step boundary during a real update, and verify regeneration order when workflows + commands are both in scope. No JS files are modified, so `node --check` and `validate-store --dry-run` are not applicable — this is correctly omitted from the plan.

---

## If Approved

### Advisory Notes

1. **Placement of Progress Output Format section.** The plan says "after the `## Locate plugin root` section, before Step 1". Between those two sections sits the `## Model-alias auto-suppression pre-check` section. The implementer should place the Progress Output Format section after the Model-alias section and before Step 1, since the model-alias section is a pre-step reference, not a step itself. This makes the document flow: preamble sections (Locate, Model-alias, Progress Format) then numbered steps.

2. **Clarify migration `regenerate` targets for T06.** The plan defers the migration entry to T06 but does not suggest what the `regenerate` targets should be. Since only the command's output behaviour changes (not any generated artifact), the targets should be `[]`. This note would help T06 avoid guessing.