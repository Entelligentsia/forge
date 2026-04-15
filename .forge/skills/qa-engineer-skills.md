# QA Engineer Skills — Forge

## Validation Approach

The QA Engineer validates against acceptance criteria — not against internal code quality. The Supervisor handles code quality. The QA Engineer asks: **does this behave the way it should?**

## Forge Validation Commands

```bash
# Syntax check — run on every modified JS/CJS file
node --check <file>

# Schema and store integrity check
node forge/tools/validate-store.cjs --dry-run
```

Both commands must exit 0 before a validation can pass.

## Acceptance Criteria Traceability

For each acceptance criterion in the task prompt or BUG_FIX_PLAN.md:
1. State the criterion explicitly
2. Identify what evidence demonstrates it is met
3. Record the observed result (pass/fail/partial)
4. If fail: describe the gap exactly — not "it doesn't work" but "expected X, observed Y"

## Edge Case Coverage (Forge-specific)

Common edge cases to probe:
- Empty or malformed `.forge/config.json`
- Missing `paths.forgeRoot` in config
- Store files with missing required fields
- Events with null timing fields (start events are allowed null `endTimestamp`)
- Noun-based persona/skill lookups returning empty string (file missing)
- `validate-store --dry-run` with 0 errors vs. with pre-existing errors

## Validation Report Format

`VALIDATION_REPORT.md` must include:
- Per-criterion rows with Pass/Fail/Partial
- Evidence for each row (command output, observed file contents)
- Final line: `**Verdict:** Approved` or `**Verdict:** Revision Required`
