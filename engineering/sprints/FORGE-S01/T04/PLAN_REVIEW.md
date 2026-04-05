# PLAN REVIEW — FORGE-S01-T04: estimate-usage.cjs — token estimation fallback tool

**Reviewer:** Supervisor
**Task:** FORGE-S01-T04

---

**Verdict:** Approved

---

## Review Summary

The plan is well-structured, correctly scoped, and closely follows the patterns
established by `collate.cjs` and `validate-store.cjs`. It addresses all eight
acceptance criteria from the task prompt and adds sensible extras (`--dry-run`,
atomic writes via `.tmp` + `renameSync`). The heuristic tables are reasonable
starting points and are explicitly documented as estimates.

## Feasibility

- **Approach realistic?** Yes. A single new CJS file with no dependencies is
  straightforward. The plan correctly identifies that T01 (schema fields) and
  T02 (validation) are already done, so this tool only needs to read/write
  existing optional fields.
- **Right files?** Yes. Only `forge/tools/estimate-usage.cjs` is created. No
  other files need modification.
- **Scope?** Appropriate for an M estimate. The heuristic logic is simple
  arithmetic; the bulk of the work is the CLI scaffolding and file I/O pattern.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes -- correctly deferred to T08 as
  specified in the task prompt. No premature bump in this task.
- **Migration entry targets correct?** Yes -- `regenerate: ["tools"]` is the
  right target since users need `/forge:update-tools` to receive the new file.
  Correctly deferred to T08.
- **Security scan requirement acknowledged?** Yes -- explicitly stated in both
  the task prompt and the plan's Plugin Impact Assessment section.

## Security

- **New executable code risk:** Low. The tool only reads and writes JSON files
  within the project's own `.forge/store/` directory. It does not make network
  calls, spawn subprocesses, or access environment variables.
- **No Markdown command/workflow changes** -- no prompt injection surface.
- **Atomic write pattern** (`.tmp` + `renameSync`) is a good practice that
  prevents data loss on partial writes.

## Architecture Alignment

- Follows established patterns: `'use strict'`, shebang line, `readConfig()`
  from `.forge/config.json`, `process.argv` parsing, exit 0/1 convention.
- No schema changes in this task (`additionalProperties: false` is not at risk).
- Uses only `fs` and `path` built-ins -- no npm dependencies.
- Substring-based model matching with longest-match-wins is a pragmatic approach
  that handles model name variants (e.g. `claude-sonnet-4-5` matching
  `claude-sonnet-4`).

## Testing Strategy

The plan includes all required checks:

- `node --check` syntax verification
- Single-event smoke test
- Sprint-batch smoke test with verification of updated vs. skipped counts
- `--dry-run` non-destructive verification
- `validate-store.cjs --dry-run` post-run validation

This is thorough for the stack's testing approach (no test framework, manual
smoke tests plus syntax checks).

---

## If Approved

### Advisory Notes

1. **Handle missing `model` field gracefully.** Some pre-existing event records
   (created before T01 made `model` required) may lack the `model` field
   entirely. The implementation should fall back to the default tokens/min rate
   rather than crashing. The plan's skip guard only checks `inputTokens` --
   also guard against missing `durationMinutes` and `model`.

2. **Handle missing `durationMinutes` edge case.** If an event has
   `durationMinutes: 0` (e.g. near-instant operations), the tool will compute
   0 tokens. This is technically correct but worth logging as a warning so the
   user knows estimation was trivially zero.

3. **Pricing simplification is acceptable for now** but should be documented in
   the source with a TODO marker so T05 (COST_REPORT) or a future task can
   refine it with separate input/output pricing tiers.

4. **Consider adding the new tool to the `lint` command** in
   `.forge/config.json` (`commands.lint`) once the file exists, so future
   `node --check` runs include it. This can be done during implementation or
   as part of T08.
