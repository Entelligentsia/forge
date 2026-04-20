# PLAN REVIEW — FORGE-S12-T06: Deterministic model discovery for event records

*Forge Supervisor*

**Task:** FORGE-S12-T06

---

**Verdict:** Approved

---

## Review Summary

The plan is well-scoped, realistic, and correctly identifies the problem: event records currently hardcode or fall back to incorrect Anthropic model identifiers on non-Anthropic runtimes. The proposed `discoverModel()` function with env var priority probing and auto-population in `cmdEmit()`/`cmdRecordUsage()` addresses the root cause at the right layer. Test coverage is already in place (TDD -- tests written, implementation pending).

## Feasibility

The approach is straightforward and low-risk:

- Adding a pure function (`discoverModel()`) with no side effects beyond reading `process.env`
- Auto-populating a missing field before validation in two existing command handlers
- Priority order (`CLAUDE_CODE_SUBAGENT_MODEL` > `ANTHROPIC_MODEL` > `CLAUDE_MODEL` > `"unknown"`) matches the orchestrator's model resolution hierarchy documented in `orchestrate_task.md`
- No new dependencies, no schema changes, no cross-module coupling

One minor gap: the plan does not explicitly address the `undefined` vs `""` vs missing-key distinction for the model field. The test suite covers this (empty string and missing key both trigger auto-population), but the plan text should have called this out. Not blocking.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes -- changes store-cli.cjs tool behavior (model auto-population on emit/record-usage) is a material change.
- **Migration entry targets correct?** Yes -- `regenerate: ["tools"]` is correct since store-cli.cjs is a shipped tool.
- **Security scan requirement acknowledged?** Yes -- plan states security scan is required.

## Security

No new dependencies. No credential access patterns. No prompt injection surface (this is a CJS tool, not Markdown). The only data read is `process.env` model identifiers, which are not secrets. No security concerns.

## Architecture Alignment

- Uses only Node.js built-ins (`process.env`) -- no npm
- `'use strict';` already present in store-cli.cjs
- Top-level try/catch with `process.exit(1)` already present
- Follows existing patterns: env var reading, field auto-population before validation (same pattern as `_normalizeEventTimestamps` and `_normalizeBugTimestamps`)
- `additionalProperties: false` in event schema is preserved (no schema changes)
- Export of `discoverModel` follows existing export pattern in `module.exports`

## Testing Strategy

Tests are already written and present in the unstaged modifications to `forge/tools/__tests__/store-cli.test.cjs`. Coverage includes:

- `discoverModel()` env var priority (6 tests)
- `cmdEmit()` model auto-population when missing/empty (4 tests)
- `cmdEmit()` model preservation when explicitly provided (1 test)
- `cmdRecordUsage()` model auto-population when `--model` absent (1 test)
- `cmdRecordUsage()` model preservation when `--model` provided (1 test)

The plan correctly identifies the need for `node --check`, `validate-store --dry-run`, and the full test suite. All standard checks apply.

## Advisory Notes

1. **Whitespace trimming:** The test for trimming (line 1271) is a good addition. Make sure `discoverModel()` trims env var values before returning them.
2. **Module export:** `discoverModel` must be added to `module.exports` at line 229 of store-cli.cjs. The test file already imports it from there.
3. **Placement:** `discoverModel()` should be placed in the module-level exports section (before the CLI block), near the existing `_normalizeEventTimestamps` helper, since it's used at the CLI level by both `cmdEmit()` and `cmdRecordUsage()`.
4. **Dry-run interaction:** Auto-population should apply in dry-run mode too (the output should reflect the auto-populated model for transparency). The existing pattern for `_normalizeEventTimestamps` does this correctly -- follow the same approach.