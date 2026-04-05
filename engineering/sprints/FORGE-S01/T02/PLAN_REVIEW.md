# PLAN REVIEW — FORGE-S01-T02: validate-store — handle new event token fields

**Reviewer:** Supervisor
**Task:** FORGE-S01-T02

---

**Verdict:** Approved

---

## Review Summary

The plan is well-researched and honest. The engineer traced through `validateRecord`
(lines 51-69 of `validate-store.cjs`) and correctly concluded that the existing generic
type+minimum loop already covers the five new optional token fields without any code
change. The plan scope is appropriately minimal: one clarifying comment and verification
runs.

## Feasibility

The approach is realistic and correctly scoped. I verified the claims against the actual
code:

- `validateRecord` does skip `undefined` fields (line 53) — absence of optional token
  fields will not trigger errors.
- Integer check via `Number.isInteger(val)` (line 57) correctly covers `inputTokens`,
  `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`.
- Number check via `typeof val === 'number'` (line 58) covers `estimatedCostUSD`.
- Minimum check (line 66-68) enforces `minimum: 0` for all five fields.
- `FALLBACK.event` (line 78) does not list token fields, so the fallback path also
  passes.

The file identified (`forge/tools/validate-store.cjs`) is the correct and only file
that needs attention.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — the plan correctly defers the bump to T08
  since this task produces no functional change (comment-only).
- **Migration entry targets correct?** N/A — no migration entry needed for a comment.
- **Security scan requirement acknowledged?** Yes — the plan correctly states no scan is
  needed for this task alone since no executable logic changes. The task prompt also
  confirms this.

## Security

No security concerns. The only planned change is an inline comment in a CJS file. No
new Markdown instruction files, no hook changes, no data flow modifications.

## Architecture Alignment

- The approach follows established patterns: no npm dependencies, no new files, tool
  reads config paths from `.forge/config.json` (already in place).
- No schema changes in this task (schema was updated in T01).
- `additionalProperties: false` is preserved in the event schema (verified).

## Testing Strategy

Testing is adequate:
- `node --check` syntax verification is included.
- `--dry-run` against the existing store is included.
- The plan correctly documents 5 pre-existing errors as out of scope, which avoids
  confusion during acceptance. This is honest and appropriate.

One minor note: the plan mentions "construct a synthetic event JSON... mentally" which is
not a real test, but given that this is a zero-logic-change task, it is acceptable.

---

## If Approved

### Advisory Notes

1. The clarifying comment should be brief — a one-liner near the token fields in the
   schema or near the generic loop is sufficient. Avoid over-documenting.
2. When running `--dry-run`, capture the output to confirm the pre-existing error count
   matches the expected 5. If it differs, investigate before claiming acceptance.
