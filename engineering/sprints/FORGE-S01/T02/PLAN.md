# PLAN — FORGE-S01-T02: validate-store — handle new event token fields

**Task:** FORGE-S01-T02
**Sprint:** FORGE-S01
**Estimate:** S

---

## Objective

Confirm (and if necessary extend) `validate-store.cjs` to correctly validate the five
optional token fields added to `event.schema.json` in T01. Events with valid token
fields must pass; events without them must pass; events with invalid token fields must
fail with clear messages.

## Approach

**Research finding:** The existing `validateRecord` function is already fully generic.
For every field in `schema.properties`, if the field is present in the record it checks:
- `type` (integer via `Number.isInteger`, number via `typeof === 'number'`, etc.)
- `minimum` (for any numeric field where `def.minimum !== undefined`)
- `enum` (where applicable)

The five new token fields are:
- `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens` — `integer, minimum: 0`
- `estimatedCostUSD` — `number, minimum: 0`

Because none of these appear in `required`, absence passes. When present, the generic
loop in `validateRecord` (lines 51–69 of `validate-store.cjs`) already:
1. Skips `undefined` (field absent) — passes
2. Checks `integer` type via `Number.isInteger(val)`
3. Checks `number` type via `typeof val === 'number'`
4. Enforces `minimum: 0` via the minimum guard

**Conclusion:** No functional code change is strictly required. However, the
`FALLBACK.event` list (used when no schema is installed) should be reviewed and
confirmed to not include the new fields (they must stay optional in the fallback path
too). This is already the case — `FALLBACK.event` only lists the original seven fields.

The implementation step is therefore:
1. Verify the analysis above by running `node --check` and `--dry-run`
2. Add a clarifying comment in `validate-store.cjs` near the token fields section of
   the schema loop to make the intent explicit for future maintainers
3. Confirm the `--dry-run` result (pre-existing errors in the store are unrelated to
   token fields and were present before this sprint)

### Pre-existing store errors (out of scope)
Running `--dry-run` currently shows 5 errors, all pre-dating this sprint:
- Two "in-flight" event records written with `endTimestamp: null` and
  `durationMinutes: null` (events captured at start before completion)
- One event record missing `model` field (written before model was required)

These are not caused by token fields and are out of scope for T02.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/validate-store.cjs` | Add inline comment documenting token field validation coverage | Makes the zero-code-change intent explicit; prevents future accidental "fix" |

## Plugin Impact Assessment

- **Version bump required?** No — this task produces no functional change to the
  validator. Version bump is bundled with T08 for the sprint.
- **Migration entry required?** No — no schema or logic change.
- **Security scan required?** No — no executable code logic is changed.
- **Schema change?** No — schema was already updated in T01.

## Testing Strategy

- Syntax check: `node --check forge/tools/validate-store.cjs`
- Store validation: `node forge/tools/validate-store.cjs --dry-run`
  (5 pre-existing errors unrelated to token fields are expected and acceptable)
- Manual: Construct a synthetic event JSON with valid token fields and pass it through
  the validator mentally (or via a one-off test invocation) to confirm pass/fail
  behaviour

## Acceptance Criteria

- [x] Events with valid token fields (integer ≥ 0, number ≥ 0) pass — covered by
      existing generic type+minimum loop in `validateRecord`
- [x] Events without any token fields pass — fields absent → `val === undefined` →
      `continue` in the loop
- [x] Events with invalid token fields (negative, wrong type) fail with clear messages
      — covered by existing type and minimum checks
- [ ] `node --check forge/tools/validate-store.cjs` exits 0
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0 against existing store
      _(note: pre-existing 5 errors are out of scope; acceptance is that no new errors
      are introduced by token field handling)_

## Operational Impact

- **Distribution:** No regeneration required for this task alone. Users will need
  `/forge:update-tools` at the T08 version bump to receive the updated schema (T01).
- **Backwards compatibility:** Fully preserved. No logic changes, only a comment.
