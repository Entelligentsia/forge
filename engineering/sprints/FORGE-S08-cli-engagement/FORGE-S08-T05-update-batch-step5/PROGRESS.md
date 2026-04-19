# PROGRESS — FORGE-S08-T05: Update Step 5 collect-all-then-confirm audit

**Task:** FORGE-S08-T05
**Sprint:** FORGE-S08

---

## Summary

Restructured `/forge:update` Step 5 from per-file sequential prompts to a
collect-then-confirm model. All sub-checks (5b-pre, 5b-portability, 5b-rename,
5c, 5d/5e, 5f) now run silently and accumulate findings into a consolidated
list. The user is presented with a single prompt offering four choices:
[Y] apply required, [a] apply all including optional, [r] review individually
(preserving original behavior), or [n] skip all. Legacy model field items are
auto-acknowledged, optional decoration items are excluded from [Y] but included
in [a], and modified files still get individual confirmation even in bulk mode.

## Syntax Check Results

No JS/CJS files modified. Markdown file only.

N/A -- `node --check` applies only to JS/CJS files.

## Store Validation Results

No schema changes in this task.

N/A -- `validate-store --dry-run` not required.

## Files Changed

| File | Change |
|---|---|
| `forge/commands/update.md` | Restructured Step 5 into 5b-collect and 5b-present phases; replaced sequential per-item prompts with consolidated audit list and four-choice prompt |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| Step 5 restructured into Collect + Present phases | 〇 Pass | 5b-collect accumulates AUDIT_ITEMS, 5b-present shows consolidated prompt |
| All sub-checks run without prompts during Collect | 〇 Pass | 5b-pre through 5f logic preserved but runs silently |
| Pipeline gate clarified: collect always runs | 〇 Pass | Documented that pipeline-dependent sub-checks produce zero items without pipelines |
| If config.json absent, Step 5 skipped entirely | 〇 Pass | 5a handles this gate |
| Consolidated prompt with [Y], [a], [r], [n] | 〇 Pass | Four-choice prompt specified with full behavior for each |
| [Y] applies required, skips optional with summary | 〇 Pass | `△` items still get individual confirmation |
| [a] applies required AND optional | 〇 Pass | Decoration items included |
| [r] falls back to per-item behavior | 〇 Pass | Original prompt text preserved for [r] mode |
| [n] skips all with summary | 〇 Pass | Includes regeneration warning for legacy-model-field items |
| legacy-model-field auto-acknowledged | 〇 Pass | Shown in list for transparency, auto-acknowledged in [Y]/[a], warning in [n] |
| missing-command-file always advisory | 〇 Pass | Listed as `required: false`, reminder at end |
| Empty audit shows "nothing to update" | 〇 Pass | 5b-present handles this case |
| `node --check` passes | 〇 Pass | No JS files modified |
| `validate-store --dry-run` exits 0 | 〇 Pass | No schema changes |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` -- deferred to T06
- [ ] Migration entry added to `forge/migrations.json` -- deferred to T06
- [ ] Security scan run and report committed -- deferred to T06

## Knowledge Updates

None required.

## Notes

- The original per-item prompt text from 5b-pre, 5b-portability, 5b-rename, 5c,
  5e, and 5f is preserved inside the [r] individual review mode description. The
  implementation must copy this text verbatim when building the [r] fallback.
- The step header changed from "Custom pipeline command audit" to "Pipeline and
  configuration audit" to reflect the broader scope (retired files and portability
  checks are not pipeline-specific).
- The [r] mode description references the original sub-check section names
  (5b-pre, 5b-portability, etc.) for traceability, even though those sections
  have been removed. The prompts themselves are preserved inline.