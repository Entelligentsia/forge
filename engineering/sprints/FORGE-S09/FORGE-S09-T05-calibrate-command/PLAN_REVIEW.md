# PLAN REVIEW — FORGE-S09-T05: Calibrate command — drift detection, categories, surgical patches

🌿 *Forge Supervisor*

**Task:** FORGE-S09-T05

---

**Verdict:** Approved

---

## Review Summary

The plan is well-structured, correctly scoped for an L estimate, and follows established command patterns. It correctly identifies all files that need modification, properly addresses the four-category drift mapping, and preserves the Architect-approval gate as an iron law. The schema addition is additive and backwards-compatible. A few minor gaps in error handling and AC format alignment are noted below as advisory items.

## Feasibility

The approach is realistic and correctly scoped. The plan creates a single new Markdown command file and makes an additive schema change — no new JS/CJS tools are needed. The file targets are correct:

- `forge/commands/calibrate.md` — correct per routing.md command table
- `forge/sdlc-config.schema.json` — correct, this is where `calibrationBaseline` already lives
- `forge/.claude-plugin/plugin.json` — correct for version bump (current version is 0.9.11)
- `forge/migrations.json` — correct for migration entry

The plan correctly reuses existing infrastructure (MASTER_INDEX.md hash from init Phase 5, drift categories from health, regeneration from `/forge:regenerate`) rather than building new tooling. The scope fits an L estimate.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes. New command in `forge/commands/` is material per CLAUDE.md criteria. Bump from 0.9.11 to 0.9.12 is correct.
- **Migration entry targets correct?** Yes. `regenerate: ["commands"]` ensures users get the new command wrapper via `/forge:update`. This matches the pattern established by the health command migration (0.9.10 to 0.9.11).
- **Security scan requirement acknowledged?** Yes. The plan explicitly states the scan is required for the new `forge/` file.

## Security

The calibrate command reads project files (MASTER_INDEX.md, config.json) and presents drift information to the user for approval. This follows the same pattern as `/forge:health` and does not introduce new attack surface beyond what existing commands already provide. The `--path` argument follows the same pattern as health.md. No prompt injection risk beyond baseline — the command does not execute arbitrary content from scanned files; it only presents structured information and asks for approval.

## Architecture Alignment

- **Established patterns followed?** Yes. YAML frontmatter with `name` and `description`, structured steps with `$FORGE_ROOT` resolution, argument parsing, and on-error footer.
- **`additionalProperties: false` preserved?** Yes. Both the `calibrationHistory` items and the nested `patches` items have `"additionalProperties": false`.
- **Paths from config?** Yes. Step 3 shell command reads the engineering path from `.forge/config.json`. `$FORGE_ROOT` is resolved from `$CLAUDE_PLUGIN_ROOT`.
- **No npm?** Yes. All shell commands use only Node.js built-ins (`crypto`, `fs`). No new `require()` of non-built-in modules.
- **`manage-config.cjs` exists?** Yes, confirmed at `forge/tools/manage-config.cjs`. The plan references it as an option for config writes.

## Testing Strategy

- **`node --check`**: Correctly identified as not applicable — no JS/CJS files are created or modified.
- **`validate-store --dry-run`**: Correctly identified as expected to pass since only `sdlc-config.schema.json` (a config schema, not a store schema) is modified.
- **Schema validation**: Plan includes verifying `forge/sdlc-config.schema.json` is valid JSON after the addition.
- **Manual smoke test**: Comprehensive 6-point test plan covering drift detection, categorization, patch proposal, approval gate, regeneration, and state updates.

---

## Advisory Notes

1. **Regeneration failure handling (Step 7):** The plan does not specify what happens if `/forge:regenerate` fails for a target during execution. Should remaining patches continue? Should partial results be recorded in `calibrationHistory`? The baseline should not be updated if regeneration failed for approved patches. Recommend adding an error-handling note in the command: on regeneration failure, record the patch as `applied: false` in the history, skip baseline update, and inform the user.

2. **AC #2 format deviation:** Task prompt AC #2 specifies "structured migration entries (target, type, patch, optional fields) per the #32 format." The plan's proposed patches use `{ category, detectedAt, targets, evidence }` and the history entries use `{ target, type, applied }`. The `patch` field from the AC is absent. The plan's structure is arguably more useful (the `applied` boolean tracks execution status), but the Engineer should verify this satisfies the intent of AC #2.

3. **Drift section detection (Step 4):** The plan says "identify which sections changed by comparing content areas against the calibration baseline's `sprintsCovered`." This relies on knowing the section structure of MASTER_INDEX.md and correlating sprint outcomes. The implementation should account for the fact that MASTER_INDEX.md is a generated file whose section structure may evolve. Consider reading the sprint task records from the store to determine what changed, rather than relying solely on MASTER_INDEX.md section parsing.

4. **`check-structure.cjs` in Step 7:** Good addition for verifying generated output after regeneration. Ensure this runs after all regeneration targets are applied, not after each individual target.