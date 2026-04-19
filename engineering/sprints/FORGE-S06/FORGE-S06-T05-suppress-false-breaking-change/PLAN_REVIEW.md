# PLAN REVIEW — FORGE-S06-T05: Suppress false breaking-change confirmation in forge:update

*Forge Supervisor*

**Task:** FORGE-S06-T05

---

**Verdict:** Approved

---

## Review Summary

The plan correctly identifies the root cause and proposes a focused, single-file fix. The approach of filtering model-override manual items from the aggregated `manual` list before display/confirmation is sound and covers all three code paths (Steps 2A, 2B, Step 4). The standard-alias set (`sonnet`, `opus`, `haiku`) aligns with the orchestrator's native resolution table. No schema, hook, or tool changes are needed.

## Feasibility

The approach is realistic and correctly scoped for an S estimate. Only `forge/commands/update.md` is modified -- the false confirmation originates there and the fix belongs there. The pre-check reads `.forge/config.json` (a trusted, user-owned file already read by other steps in the same command) and inspects `config.pipelines` phase `model` fields. This is a Markdown instruction change, not a code change, so there is no syntax-check requirement for the modified file itself.

**One precision note:** In Step 2A, the breaking-change block is purely display (shown in the update summary before the `[1]/[2]` choice). There is no explicit "confirm manual steps" prompt at that point. The meaningful confirmation prompts are in Step 2B ("confirm they have completed the manual steps first") and Step 4 ("require the user to confirm they have completed the manual steps before proceeding"). The plan correctly identifies all three insertion points, but the reviewer notes that in Step 2A the fix affects what is *displayed*, while in Step 2B and Step 4 it affects whether a *confirmation prompt* appears. This distinction does not change the implementation -- the same filtering logic applies to the `manual` list in all three places before it is rendered.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes -- changes `/forge:update` command behavior (auto-skips a confirmation prompt that previously always halted). This is material per the criteria in `CLAUDE.md` and `processes.md`.
- **Migration entry targets correct?** Yes -- `regenerate: []`, `breaking: false`, `manual: []` is correct. No generated artifacts change; only the update flow behavior changes.
- **Security scan requirement acknowledged?** Yes -- the plan explicitly states the scan is required for any `forge/` change.

## Security

No new risks introduced. The pre-check reads `.forge/config.json` (already trusted and user-owned). No untrusted input is consumed. No prompt injection risk -- the standard alias check is a simple string comparison against a hardcoded set (`sonnet`, `opus`, `haiku`), not a pattern evaluated from user input. No data exfiltration vector -- the command does not transmit config contents anywhere.

## Architecture Alignment

- Follows established patterns: command files are Markdown instructions that tell the AI what to do. Adding a conditional check before a confirmation is consistent with existing conditional logic in the same file (e.g., `IS_CANARY` branching, `breaking: true` conditional blocks).
- No schema changes -- `additionalProperties: false` is irrelevant here.
- Paths read from `.forge/config.json` (via the AI reading the file), not hardcoded -- consistent with existing practice.
- No npm dependencies introduced.

## Testing Strategy

- **Syntax check:** N/A -- no JS/CJS files modified. The plan correctly identifies this.
- **Store validation:** `node forge/tools/validate-store.cjs --dry-run` is included -- correct, even though no schema changes are expected, it confirms no store regressions.
- **Manual smoke test:** Described for `/forge:update --skip-check` on this dogfooding project. Adequate for a Markdown-only command change.

---

## If Approved

### Advisory Notes

1. **Define the sub-procedure once.** The plan says "defined once as a reusable sub-procedure" -- make sure the Markdown instruction clearly labels it as a named block (e.g., "### Model-alias auto-suppression pre-check") and references it from all three points, rather than duplicating the logic three times. This keeps the command file DRY and easier to maintain.

2. **Empty manual list edge case.** The plan correctly notes that if the model-override step is removed and no other manual items remain, the entire breaking-change block should be skipped. Ensure the instruction covers: if `manual` becomes empty after filtering, set `breaking = false` for display/confirmation purposes (or equivalently, skip the breaking-change section entirely). Do not leave a "Breaking changes" heading with zero bullet items.

3. **Config absent or pipelines absent.** If `.forge/config.json` does not exist or `config.pipelines` is undefined/empty, there are no custom model overrides -- the model-override manual step should be auto-suppressed. The plan mentions "absent" model values, but the instruction should be explicit about missing config/pipelines as well.

4. **New version number.** The plan declares a version bump is required but does not name the new version. Resolve this during implementation by reading `forge/.claude-plugin/plugin.json` for the current version and bumping patch (the release engineering task FORGE-S06-T10 will handle the final consolidated bump if needed).