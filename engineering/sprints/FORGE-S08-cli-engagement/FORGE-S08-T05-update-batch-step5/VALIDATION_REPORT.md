# VALIDATION REPORT — FORGE-S08-T05: Update Step 5 collect-all-then-confirm audit

🍵 *Forge QA Engineer*

**Task:** FORGE-S08-T05

---

**Verdict:** Approved

---

## Acceptance Criteria Checklist

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Step 5 restructured into Collect + Present phases | PASS | `5b-collect` (line 499) and `5b-present` (line 695) sections replace previous sub-sections |
| 2 | All sub-checks run without prompts during Collect | PASS | 5b-pre through 5f logic preserved in 5b-collect with "accumulate items instead" approach; no prompt text in collect section |
| 3 | Pipeline gate clarified: collect always runs; pipeline-dependent sub-checks produce zero items without pipelines | PASS | Line 690-693: "All sub-checks always run. Pipeline-dependent sub-checks naturally produce zero items when no pipelines are configured." |
| 4 | If config.json absent, Step 5 skipped entirely | PASS | Line 497-498: "If `.forge/config.json` does not exist, skip this step and proceed to **Step 6**." |
| 5 | Consolidated prompt with [Y], [a], [r], [n] options | PASS | Line 719: `Apply required? [Y]  Apply all (including optional)? [a]  Review individually [r]  Skip [n]` |
| 6 | [Y] applies required items; modified items get individual confirmation; optional items skipped with summary | PASS | Lines 733-750: modified items prompt individually, optional items skipped, summary line printed |
| 7 | [a] applies required AND optional decoration items | PASS | Lines 761-768: applies add-persona-symbol items by prepending symbol line |
| 8 | [r] falls back to per-item review behavior | PASS | Lines 770-786: references original sub-check prompts (5b-pre, 5b-portability, 5b-rename, 5c, 5e, 5f) |
| 9 | [n] skips all and proceeds to Step 6 | PASS | Lines 789-806: emits summary, adds regeneration warning for legacy-model-field, proceeds to Step 6 |
| 10 | legacy-model-field items auto-acknowledged in [Y]/[a], shown in list, warning in [n] | PASS | Lines 744-746 (auto-acknowledged), line 519-520 (type classification), lines 802-804 (warning in [n]) |
| 11 | missing-command-file items always advisory; reminder at end | PASS | Line 524 (required: false, advisory only), lines 748-750 (reminder emitted at end in [Y] mode) |
| 12 | Empty audit emits "nothing to update" message | PASS | Lines 697-700: "〇 Pipeline audit complete — nothing to update." |

## Edge Case Checks

- **No-npm rule:** PASS -- No JS files modified, no `require()` calls added
- **Hook exit discipline:** N/A -- No hooks modified
- **Schema `additionalProperties: false`:** N/A -- No schemas modified
- **Backwards compatibility:** PASS -- [r] mode preserves exact original per-item behavior; existing users who prefer sequential prompts can use [r]

## Regression Check

- `node --check` on modified JS/CJS files: N/A (no JS files modified)
- `validate-store --dry-run`: N/A (no schema changes; pre-existing errors from FORGE-S01 through S08 legacy data)
- Version bump: Deferred to T06
- Migration entry: Deferred to T06
- Security scan: Deferred to T06

## Validation Summary

All 12 acceptance criteria pass. The implementation correctly restructures Step 5 from sequential per-item prompts to a collect-then-confirm model. The `[r]` mode preserves backward compatibility. The four review items from the plan revision (pipeline gate, legacy-model-field handling, [a] option, config.json-absent gate) are all addressed in the implementation.