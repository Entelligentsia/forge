# PLAN REVIEW — FORGE-S09-T07: Add-task mid-sprint command

🌿 *Forge Supervisor*

**Task:** FORGE-S09-T07

---

**Verdict:** Approved

---

## Review Summary

The plan is correctly scoped, realistic, and well-aligned with the task prompt. It identifies the right file to create, the right tools to reuse, and the correct plugin impact (version bump, migration, security scan). All seven acceptance criteria from the task prompt are addressed.

## Feasibility

The approach is realistic. A single new Markdown command file is the correct scope. The conversational interview pattern is proven (`/forge:add-pipeline` follows the same style). Reuse of `store-cli.cjs` for store writes and `collate.cjs` for view regeneration is the right approach. The directory slug derivation via `seed-store.cjs`'s `deriveSlug()` export is accessible via `node -e` from the command's bash steps.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — 0.9.12 to 0.9.13, new command is material.
- **Migration entry targets correct?** Yes — `regenerate: ["commands"]` is correct for a new command file.
- **Security scan requirement acknowledged?** Yes — new `forge/` file requires scan.

## Security

Low risk. The command is Markdown that runs in the user's own Claude Code session. User input (title, objective, etc.) is written into TASK_PROMPT.md in the user's own project directory. No data exfiltration paths. No hooks or tools that could be exploited by external input. Prompt injection risk is minimal since the user is providing their own content.

## Architecture Alignment

- Follows established patterns: Markdown command file, store-cli.cjs for writes, manage-config.cjs for config reads, collate.cjs for view regeneration.
- No schema changes, so `additionalProperties: false` is preserved.
- Reads paths from `.forge/config.json` via `manage-config.cjs` — no hardcoded paths.
- No hooks or tools created, so hook/tool exit discipline is not applicable.

## Testing Strategy

Adequate for the stack. Syntax check is N/A (no JS/CJS files). `validate-store --dry-run` is specified. Manual smoke test is described. Correct approach.

---

## If Approved

### Advisory Notes

1. **Sprint validation:** The implementation should validate that the target sprint exists before performing any writes. If `--sprint <ID>` points to a non-existent sprint, the command should list available sprints and re-prompt rather than failing.
2. **Empty sprint list:** If no sprints exist in the store, the command should inform the user and suggest running `/plan` or the sprint-intake first, rather than showing an empty selection.
3. **deriveSlug invocation:** The `deriveSlug` function is exported from `seed-store.cjs` as a CommonJS module. The command's bash step should invoke it as `node -e "const {deriveSlug} = require('$FORGE_ROOT/tools/seed-store.cjs'); console.log(deriveSlug('TITLE'))"`. Verify this works before relying on it.
4. **Feature linkage:** The task prompt template includes a `feature_id` field (nullable). The mini-intake could optionally ask whether the task belongs to a feature, but this is not required by the acceptance criteria and can be left as a future enhancement.
5. **On-error footer:** As with all Forge command files, include the standard on-error footer suggesting `/forge:report-bug` on unexpected failures.