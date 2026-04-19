# VALIDATION REPORT — FORGE-S08-T04: Update step banners and explicit sequencing

*Forge QA Engineer*

**Task:** FORGE-S08-T04

---

**Verdict:** Approved

---

## Acceptance Criteria Checklist

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | `forge/commands/update.md` contains a "Progress Output Format" section defining the `━━━ Step N/6` banner format | PASS | Section present at line 86-94, between Model-alias pre-check and Step 1. Format matches `━━━ Step N/6 — <Step Name> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`. |
| 2 | Each of Steps 1, 2A, 2B, 3, 4, 5, 6 has an emit instruction for its banner | PASS | Verified each step: Step 1 (line 100), Step 2A (line 178), Step 2B (line 271), Step 3 (line 329), Step 4 (line 350), Step 5 (line 482), Step 6 (line 853). All have `Emit:` line. |
| 3 | Step 4 contains a sequencing table listing the correct order of regeneration targets | PASS | Table present at lines 400-411 with 6 rows: tools, workflows, templates, personas, commands, knowledge-base. |
| 4 | The sequencing table notes that `commands` must follow `workflows` | PASS | Row 5: `Must run after \`workflows\``. Explanatory text also states: "`commands` depends on `workflows` because command wrappers reference workflow filenames." |
| 5 | The table notes that only targets present in the aggregated result are executed | PASS | Line 417: "Only execute targets that appear in the aggregated result — skip absent ones." |

## Edge Case Checks

- **No-npm rule:** No JS files modified. N/A.
- **Backwards compatibility:** Banners are output-only additions. No existing behaviour is altered. No new disk-write sites. PASS.
- **Consistency with init.md:** Banner format uses `━━━ Step N/6` (vs `━━━ Phase N/9` in init). Consistent pattern, different numbering. PASS.

## Regression Check

No JS/CJS files were modified, so `node --check` and `validate-store --dry-run` are not applicable.

## Notes

All criteria validated against the actual file content on disk. No gaps found.