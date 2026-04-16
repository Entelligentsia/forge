# PLAN REVIEW — BUG-007: collate COST_REPORT.md path fallback + (unknown) attribution

🌿 *Forge Supervisor*

**Task:** BUG-007

---

**Verdict:** Approved

---

## Review Summary

The plan is well-scoped, accurately identifies both root causes, and proposes
targeted fixes to a single file (`forge/tools/collate.cjs`) with no schema
impact. The `resolveDir` numeric glob fallback and `loadSprintEvents`
attribution backfill are both backwards-compatible. Plugin impact assessment,
migration entry, and security scan requirements are all correctly addressed.

## Feasibility

The approach is realistic and correctly scoped. Both fixes are self-contained
within `collate.cjs` and modify exactly the right functions (`resolveDir` at
lines 57-66, `loadSprintEvents` at lines 272-279). The plan's line number
references match the actual source code. The `resolveDir` enhancement applies
uniformly to all four call sites (lines 167, 176, 194, 318-322) without
per-site changes. Estimate of S (small) is appropriate for ~22 lines of net
change.

I verified that the existing directory structure confirms the fix is needed:
bug directories use the pattern `BUG-NNN-slug/` (e.g.
`BUG-007-collate-cost-report-attribution/`), not bare IDs, so the numeric
fallback would correctly resolve `BUG-007` to
`BUG-007-collate-cost-report-attribution/`.

## Completeness

All acceptance criteria from the bug description are addressed:

- Bug 1 (resolveDir fallback) is fixed by numeric glob scan
- Bug 2 ((unknown) attribution) is fixed by filename backfill
- Edge cases named: non-matching filenames silently skipped, existing fields
  never overwritten, regex guard prevents misinterpreting malformed names
- Backwards compatibility explicitly preserved: fallback to last candidate
  unchanged, backfill conditional on absent fields

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — `0.6.11` to `0.6.12`, correctly
  identified as material (bug fix to a Forge tool)
- **Migration entry targets correct?** Yes — `regenerate: []` is correct since
  collate output is regenerated on demand, not cached. `breaking: false` and
  `manual: []` are correct.
- **Security scan requirement acknowledged?** Yes — Step 5 explicitly requires
  the scan with report saved to `docs/security/scan-v0.6.12.md` and README
  table update.

## No-npm Rule

No new `require()` calls introduced. Both fixes use only `fs`, `path` (already
imported). Passes.

## Security

No security risks introduced. The fixes operate on local filesystem paths and
JSON files already under Forge's control. The regex guard on sidecar filenames
prevents injection of arbitrary values through crafted filenames. No new
Markdown command/workflow files are created. No untrusted user input is
consumed without validation.

## Architecture Alignment

- Follows existing patterns: uses `fs.existsSync`, `fs.readdirSync`,
  `path.join` (built-ins only)
- No schema changes, so `additionalProperties: false` is not relevant
- Reads paths from `.forge/config.json` via existing `storeRoot`/`engRoot`
  variables (no hardcoding introduced)
- No new hooks, so exit discipline is not relevant

## Testing Strategy

Adequate. The plan includes:

- `node --check forge/tools/collate.cjs` — syntax verification
- `node forge/tools/validate-store.cjs --dry-run` — store integrity
- Security scan via `/security-watchdog:scan-plugin`
- Step 6 describes a manual smoke test covering both bug fixes with specific
  verification steps

---

## If Approved

### Advisory Notes

1. **Stack checklist update:** The existing checklist item for BUG-006
   (`collate.cjs` line 47 in `stack-checklist.md`) should be updated or
   supplemented to mention that `resolveDir` now has a numeric fallback, so
   future call sites do not need to worry about the hyphen-free ID edge case.

2. **`parseInt` leading zeros:** `parseInt('007', 10)` yields `7`, which
   correctly matches directory `007/` (whose first `/\d+/` match is also
   `'007'`, yielding `7`). This is correct but worth a brief inline comment
   if the implementer wants to be explicit about the leading-zero behavior.

3. **Multiple numeric matches:** If two directories share the same first
   integer (e.g. `sprint_31_foo/` and `sprint_31_bar/`), the alphabetically
   first one is returned. This is acceptable for current naming conventions
   but worth documenting in a code comment.
