# PROGRESS — BUG-005: fix-bug is not an orchestrator

🍂 *Forge Bug Fixer*

**Bug:** BUG-005
**Sprint:** bugs (combined fix with BUG-006)
**Version:** 0.5.5 → 0.5.6

---

## Summary

Rewrote `forge/meta/workflows/meta-fix-bug.md` from a prose step-list into a
true orchestrator meta-workflow, matching the pattern established by
`meta-orchestrate.md`. The generated `engineer_fix_bug.md` will now chain
sub-agent invocations via the Agent tool, loop back on revision-required
verdicts (up to 3 iterations per review phase), escalate to the human on
exhaustion, enforce plain machine-readable status codes in all JSON fields, and
emit decorated agent announcement banners consistent with `/run-task` and
`/run-sprint`.

## Syntax Check Results

No JavaScript files were modified for BUG-005 (meta-workflow is Markdown).

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (2 sprint(s), 8 task(s), 6 bug(s)).
```

## Files Changed

| File | Change |
|---|---|
| `forge/meta/workflows/meta-fix-bug.md` | Full rewrite — orchestrator algorithm, pipeline definition, verdict detection, status code table, announcement banner, generation instructions |
| `forge/.claude-plugin/plugin.json` | Version bump 0.5.5 → 0.5.6 |
| `forge/migrations.json` | Migration entry 0.5.5 → 0.5.6 with `regenerate: ["workflows"]` |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| Generated workflow chains sub-agent invocations | 〇 Pass | Execution Algorithm section added; `spawn_subagent` = Agent tool call |
| Loop-back on Revision Required | 〇 Pass | Algorithm routes back to `plan-fix` or `implement` on revision verdict |
| Max iterations → escalation | 〇 Pass | `maxIterations` default 3; escalation procedure defined |
| Plain status codes in JSON fields | 〇 Pass | Status Codes section + Iron Law added; emoji banned from machine-readable fields |
| Decorated agent announcement banners | 〇 Pass | Agent Announcement Banner section added; banner is first line of every subagent prompt |
| Verdict read from artifact, not inferred | 〇 Pass | Verdict Detection table references `PLAN_REVIEW.md` / `CODE_REVIEW.md` |
| `validate-store --dry-run` exits 0 | 〇 Pass | |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json`
- [x] Migration entry added to `forge/migrations.json` (`regenerate: ["workflows"]`)
- [ ] Security scan — pending (run before commit)

## Knowledge Updates

None — no architecture docs or stack-checklist items required for this fix.
The pattern to check for: any meta-workflow that describes pipeline steps in
prose should be reviewed against `meta-orchestrate.md` to ensure it generates
a true orchestrator.

## Notes

Users upgrading from 0.5.5 must regenerate workflows (`/forge:update` will
prompt this). Existing projects using the old prose workflow continue to
function — they just require manual step invocations until regenerated.
