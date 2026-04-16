# PLAN REVIEW — FORGE-S10-T01: Tomoshibi Agent + KB Path Configurability + Workflow Links

🌿 *Forge Supervisor*

**Task:** FORGE-S10-T01

---

**Verdict:** Approved

---

## Review Summary

Both blocking issues from the first review have been correctly resolved. The migration from-key is now `"0.9.18"` (confirmed against `forge/.claude-plugin/plugin.json` — current version is `0.9.18`, latest migration entry is `"0.9.17" → "0.9.18"`). The `update.md` renumbering is now explicitly scoped: all seven `N/6` banner emit lines (including the duplicate Step 2 for paths 2A and 2B) plus the Progress Output Format note must change to `N/7`, and this is captured in both the Files to Modify table and the acceptance criteria. The plan is architecturally sound and ready for implementation.

---

## Feasibility

The approach is realistic and correctly scoped. Cross-referencing files to modify against the actual codebase confirms all targets are correct: `forge/agents/` does not yet exist (creation required); `paths.engineering` exists in `forge/sdlc-config.schema.json` with `"default": "engineering"` (no schema change needed); the 7 banner emit lines in `update.md` plus the Progress Output Format note are the complete set of `N/6` references to update. The `engineering/` hardcoding counts in the plan match actual file state.

One implementation note: `update.md` has **7** banner `Emit:` lines — Steps 1, 2A, 2B, 3, 4, 5, and 6 — because Step 2 splits into two branches (2A and 2B). The plan says "six existing banners", which refers to the six step numbers (1–6), but all 7 `Emit:` lines contain `N/6` and must be updated. The acceptance criteria correctly covers this ("All six existing step banners in `update.md` renumbered from `N/6` to `N/7`") — the implementer should update all 7 `Emit:` lines.

---

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — `0.10.0` is appropriate (first agent in the plugin; new init phase; new update step; collate workflow change). Minor version bump is correct.
- **Migration entry targets correct?** Yes — `from: "0.9.18"`, `version: "0.10.0"`, `regenerate: ["workflows:collator_agent"]`, `breaking: false`. The `collator_agent` sub-target is consistent with prior sub-target patterns in the migration chain.
- **Security scan requirement acknowledged?** Yes — explicitly acknowledged in the Plugin Impact Assessment section.
- **`breaking: false` correct?** Yes — Tomoshibi is advisory/opt-in; `paths.engineering` defaults preserve existing behaviour; no manual steps required.

---

## No-npm Rule

No new `require()` calls to non-built-in modules are introduced. `forge/agents/tomoshibi.md` is a Markdown file. No JS/CJS files are modified. Rule satisfied.

---

## Architecture Alignment

- Tomoshibi follows the `agents/` directory convention documented in `routing.md` — Claude Code auto-discovers `.md` files in `agents/`. Valid YAML frontmatter with `description:` required (plan acknowledges this in acceptance criteria).
- The invocation pattern (Agent tool with `description:` and `prompt:` referencing `$FORGE_ROOT/agents/tomoshibi.md`) matches established pattern used for other Agent tool subagents.
- `KB_PATH` read pattern uses `manage-config.cjs get paths.engineering 2>/dev/null || echo "engineering"` — correct safe-fallback form consistent with how other config values are read in init phases.
- `paths.engineering` already exists in `sdlc-config.schema.json` — no schema drift risk.
- No hook exit-discipline issue — no `.js` or `.cjs` files modified.
- `init-progress.json` deletion moves to Phase 12 — preserves resumability correctly.
- The implementation order (10 steps) is logical and avoids forward dependencies.

---

## Security

Tomoshibi reads agent instruction files from disk and presents their status (read-only analysis). It writes only managed sections with fixed templates — no interpolation of user-provided file content into marker bodies. This is safe.

The pre-flight KB path question accepts free-text input passed to `manage-config.cjs set paths.engineering`. The plan includes an implementation note to verify the tool correctly quotes the value (Implementation Notes: manage-config.cjs path sanitisation). This advisory finding is non-blocking — the risk is local-only.

---

## Testing Strategy

The testing strategy is adequate for a Markdown-only change:
- `node --check forge/hooks/check-update.js` and `triage-error.js` — correct baseline verification.
- `node forge/tools/validate-store.cjs --dry-run` — correct (no schema changes, but baseline verification).
- Manual smoke test covers the key scenarios: default path, custom path, idempotency, forge:update Step 7, collate Finalize, and (in implementation notes) forge:remove with custom path.

---

## Advisory Notes for Implementation

1. **Seven banner lines, not six.** `update.md` contains 7 `Emit:` lines with `N/6` (Steps 1, 2A, 2B, 3, 4, 5, 6). All 7 must be updated to `N/7`. The acceptance criteria covers this correctly — just be aware of the 7th line (Step 2B path).

2. **Phase 5 calibration baseline.** The implementation note correctly calls out the mid-block `engineering/MASTER_INDEX.md` reference in Phase 5's hash computation (sdlc-init.md line 180 approx). Verify this is included in the `engineering/` replacement pass — it is easy to miss as it is inside a shell heredoc, not a heading or output line.

3. **collator_agent.md Finalize verification.** After adding Tomoshibi invocation to `meta-collate.md`, verify the generated `collator_agent.md` gains a correctly structured Finalize step with the Agent tool invocation pattern. The current `collator_agent.md` goes directly from Step 2 (Fallback) to Output Files — the new Finalize block must be cleanly inserted.

4. **manage-config.cjs path sanitisation.** Before shipping, run: `node forge/tools/manage-config.cjs set paths.engineering "name with spaces"` and verify the tool either quotes it correctly or returns an error. If it doesn't handle spaces, add a validation note to the pre-flight question per the implementation note.

5. **init.md resume mapping table.** The Files to Modify entry for `forge/commands/init.md` says "extend resume mapping table (Phase 11→12)". Confirm this means adding a row `| 11 | Phase 12 |` to the resume mapping table AND updating the `Valid inputs are: 1 through 11` line to `1 through 12` AND updating the `11 phases will run in this session:` count to `12`. Check all hardcoded `11` references in `init.md`.
