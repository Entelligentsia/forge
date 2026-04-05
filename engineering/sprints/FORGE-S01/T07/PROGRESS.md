# PROGRESS — FORGE-S01-T07: Bug report opt-in — token data in bug reports with user prompt

**Task:** FORGE-S01-T07
**Sprint:** FORGE-S01

---

## Summary

Inserted Step 2b into `forge/commands/report-bug.md` implementing the three-path
token data opt-in logic (no sprint, config override, user prompt). Extended the
Step 4 body template with a conditional `<details>` collapsible block for cost
data. Added the optional `includeTokenDataInBugReports` boolean to the `pipeline`
object in `forge/sdlc-config.schema.json`.

## Syntax Check Results

Not applicable — only Markdown and JSON files were modified. No JS/CJS files touched.

## JSON Validity Check Results

```
$ node -e "require('./forge/sdlc-config.schema.json'); console.log('JSON valid')"
JSON valid
```

Exit code: 0

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
... 32 error(s) found.
```

The 32 errors are pre-existing store data issues from earlier tasks (malformed
event JSON records). Verified by running the same check against the unmodified
codebase (git stash) — identical 32 errors. No regression introduced by T07.

## Files Changed

| File | Change |
|---|---|
| `forge/commands/report-bug.md` | Inserted Step 2b (token data opt-in); extended Step 4 body template with conditional `<details>` cost block |
| `forge/sdlc-config.schema.json` | Added optional `pipeline.includeTokenDataInBugReports` boolean field |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `/forge:report-bug` prompts "Include token usage data…" when COST_REPORT.md exists and no config override | ✅ Pass | Step 2b item 3 |
| Opt-in appends `<details>` collapsible block with COST_REPORT.md content | ✅ Pass | Step 4 conditional block |
| Opt-out produces no cost data in issue body | ✅ Pass | Block only appended when `include_token_data = true` |
| `pipeline.includeTokenDataInBugReports: true` silently includes data without prompting | ✅ Pass | Step 2b item 2 |
| `pipeline.includeTokenDataInBugReports: false` silently excludes data without prompting | ✅ Pass | Step 2b item 2 |
| No relevant sprint / no COST_REPORT.md → Step 2b skipped entirely (silent) | ✅ Pass | Step 2b item 1 — silent skip |
| `forge/sdlc-config.schema.json` includes new `includeTokenDataInBugReports` field under `pipeline` | ✅ Pass | Field correctly placed under `pipeline`, not `pipelines` |
| `node -e "require('./forge/sdlc-config.schema.json')"` exits 0 | ✅ Pass | Verified |
| `validate-store.cjs --dry-run` — no new regressions | ✅ Pass | 32 pre-existing errors, same count before and after |
| `node --check` passes | ✅ Pass | N/A — no JS/CJS files modified |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` — **bundled with T08**
- [ ] Migration entry added to `forge/migrations.json` — **bundled with T08**
- [ ] Security scan run and report committed — **bundled with T08** (`/security-watchdog:scan-plugin forge:forge`)

## Knowledge Updates

None — no architectural discoveries during this implementation. The plan's advisory
note (use sprint store JSONs instead of directory mtime for sprint detection) was
adopted; Step 2b reads `.forge/store/sprints/` JSON files.

## Notes

- The supervisor advisory note about using store JSON for sprint detection was
  incorporated (reading `status: "active"` or `status: "in-progress"` from sprint
  JSONs rather than directory mtime).
- The `includeTokenDataInBugReports` field was placed under `pipeline` (singular),
  not `pipelines` (plural), as the supervisor confirmed is correct.
- Version bump and security scan are deferred to T08 as planned.
