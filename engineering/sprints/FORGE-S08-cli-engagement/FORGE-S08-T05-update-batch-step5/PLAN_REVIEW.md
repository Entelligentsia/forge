# PLAN REVIEW — FORGE-S08-T05: Update Step 5 collect-all-then-confirm audit

🌿 *Forge Supervisor*

**Task:** FORGE-S08-T05

---

**Verdict:** Approved

---

## Review Summary

The revised plan addresses all four items from the prior review: (1) pipeline gate behavior is now explicitly documented with each sub-check's independence clarified, (2) legacy-model-field items have a clear auto-acknowledged classification, (3) the `[a]` option resolves the contradiction between excluding optional items from `[Y]` and having no way to include them, and (4) the config.json-absent vs. no-pipelines distinction is explicit. The approach is well-scoped to a single file change and preserves backward compatibility via the `[r]` individual review mode.

## Feasibility

The approach is realistic and correctly scoped to a single file (`forge/commands/update.md`). The collect-then-confirm pattern is achievable within the Markdown command format. The dependency on T04 (step banners) is satisfied -- T04 is committed and the step banner format is already in place.

The item classification table (type, required, modified) is well-defined and maps every sub-check output to a clear behavioral rule. This eliminates ambiguity during implementation.

One feasibility note: the `[r]` fallback mode requires that the per-item logic from the current 5b-pre through 5f sections is preserved verbatim in the new command file. The plan explicitly states this, which is correct, but the implementation should be careful not to paraphrase -- the exact prompt text from the current sections must be replicated inside the `[r]` branch.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes -- deferred to T06, which is appropriate since this is a material user-facing command behavior change.
- **Migration entry targets correct?** Yes -- deferred to T06. The change is to command behavior only (fewer prompts, same outcomes), so `regenerate: []` is correct.
- **Security scan requirement acknowledged?** Yes -- deferred to T06.

## Security

The change is to a Markdown command file. No new hooks, tools, or JS files are introduced. The consolidated prompt presents findings derived from the project's own config files -- no untrusted external input is presented. No prompt injection risk is introduced.

The `[r]` fallback preserves the current per-item prompts exactly, so no new user-facing text patterns are introduced that could be exploited.

## Architecture Alignment

- The approach follows existing command file patterns (Markdown instructions for Claude Code).
- No schema changes.
- The command reads from `.forge/config.json` via `manage-config.cjs` as expected.
- `generation-manifest.cjs` usage for modified-file detection is preserved.
- No hooks involved.
- The `required` / `modified` item classification is a clean abstraction that maps well to the existing per-check logic.

## Testing Strategy

The testing strategy covers the key scenarios: no config (skip), no pipelines with findings, empty audit, mixed items, modified files with `△`, optional items with `[Y]` vs `[a]`, and legacy-model-field auto-acknowledgment.

An end-to-end `/forge:update` smoke test is specified, which is important since this is a command file change affecting interactive flow.

No JS files are modified, so `node --check` and `validate-store --dry-run` are correctly N/A.

---

## Advisory Notes

1. **Preserve exact prompt text for `[r]` mode.** When implementing the `[r]` individual review branch, copy the exact prompt text from the current 5b-pre through 5f sections. Paraphrasing these prompts risks subtle behavioral changes that the acceptance criteria require to be identical.

2. **Banner alignment.** The plan uses `-- Pipeline and configuration audit` in the step header but the current command uses `-- Pipeline audit` in the banner from T04. Verify the header text matches the banner format T04 already established.

3. **5a section unchanged.** The plan correctly marks 5a as unchanged. During implementation, verify that the `FORGE_ROOT` detection and `manage-config.cjs` / `generation-manifest.cjs` tool location logic in 5a remains intact -- it is needed by the collect phase.