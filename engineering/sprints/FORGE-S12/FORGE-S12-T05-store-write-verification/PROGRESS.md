# PROGRESS — FORGE-S12-T05: Sprint Planning Store-Write Verification Loop

## Summary of Changes

Added a "Store-Write Verification" section to `forge/meta/workflows/meta-sprint-plan.md` that instructs agents executing the sprint-plan workflow to verify every store write succeeds and retry on schema violations.

## Files Changed

| File | Change |
|------|--------|
| `forge/meta/workflows/meta-sprint-plan.md` | Added Store-Write Verification section, updated Algorithm steps 4 and 5 with inline retry instructions, added Generation Instruction for verification section |

## Detailed Changes

### 1. Store-Write Verification Section (new)

Added a new top-level section between "Anti-Pattern Guard" and "Generation Instructions" that establishes the verification principle:

- Every store write MUST succeed before proceeding
- On failure (store-cli non-zero exit or PreToolUse hook exit 2): parse error, correct JSON, retry
- Maximum 3 retries before escalation
- FORGE_SKIP_WRITE_VALIDATION=1 is for operator repair only — agents MUST NOT use it

### 2. Algorithm Step 4 (Documentation) — Updated

Each store-write operation now includes inline retry instructions:

- `store write task`: "If the command exits non-zero or the PreToolUse hook blocks the write: parse the error, correct the JSON, and retry (see Store-Write Verification). Do not proceed to the next task until this write succeeds."
- `store write sprint`: Same retry instruction
- `store update-status`: Same retry instruction

### 3. Algorithm Step 5 (Finalize) — Updated

- `store emit`: Same retry instruction for event writes

### 4. Generation Instructions — Updated

Added a new instruction requiring the generated workflow to include the Store-Write Verification section verbatim and annotate every `store-cli` command with the parse-correct-retry instruction.

## Test Evidence

All 565 existing tests pass:
```
ℹ tests 565
ℹ suites 92
ℹ pass 565
ℹ fail 0
```

Build manifest updated successfully.

## Acceptance Criteria

1. The meta-workflow includes a "Store-Write Verification" section that specifies the parse-correct-retry pattern -- DONE
2. Algorithm steps 4 and 5 reference the verification loop at each store-write point -- DONE
3. Generation Instructions require the verification section in generated workflows -- DONE
4. Existing tests still pass -- VERIFIED
5. The workflow content is consistent with the Write-Boundary Contract in orchestrate_task.md -- VERIFIED (same principles: parse error, correct data, retry; same prohibition on FORGE_SKIP_WRITE_VALIDATION)