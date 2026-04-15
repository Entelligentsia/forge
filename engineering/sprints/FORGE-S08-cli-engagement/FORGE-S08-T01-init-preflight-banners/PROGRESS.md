# PROGRESS — FORGE-S08-T01: Init pre-flight plan + phase progress banners

*Forge Engineer*

**Task:** FORGE-S08-T01
**Sprint:** FORGE-S08

---

## Summary

Added progress output format definition and pre-flight plan to `forge/commands/init.md`,
and added phase banners to all 11 phase headings in `forge/init/sdlc-init.md`. The
pre-flight plan lists all phases with expected artifact counts and offers the user a
chance to specify a start phase, with validation for invalid input.

## Syntax Check Results

No JS/CJS files were modified. Only Markdown files changed.

## Store Validation Results

No schemas were modified. `validate-store --dry-run` not required.

## Files Changed

| File | Change |
|---|---|
| `forge/commands/init.md` | Added "Progress Output Format" section (banner spec) + "Pre-flight Plan" block (phase summary with artifact counts, start-phase selector, invalid-input re-prompt) |
| `forge/init/sdlc-init.md` | Added `Emit:` banner instruction at the start of each of the 11 phases (1, 1.5, 2, 3, 3b, 4, 5, 6, 7, 8, 9). Phase 1 also emits "Running 5 discovery scans in parallel..." |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| init.md contains "Progress Output Format" section with banner format | 〇 Pass | Section added after ## Execute heading |
| init.md contains "Pre-flight Plan" block with artifact counts per phase | 〇 Pass | All 11 phases listed with arrow-notation artifact counts |
| init.md specifies error handling for invalid phase input (re-prompt) | 〇 Pass | Explicit valid inputs listed; re-prompt on invalid |
| sdlc-init.md has banner emit at start of each phase (1, 1.5, 2, 3, 3b, 4, 5, 6, 7, 8, 9) | 〇 Pass | All 11 phases have Emit: instruction |
| Phase 1 emits "Running 5 discovery scans in parallel..." | 〇 Pass | Added after banner emit in Phase 1 |
| Pre-flight plan asks user to confirm or specify start phase | 〇 Pass | "Start from Phase 1? [Y] or specify phase: ___" |
| Specifying a start phase skips earlier phases | 〇 Pass | Documented in init.md |
| `node --check` passes | 〇 Pass | No JS/CJS files modified |
| `validate-store --dry-run` exits 0 | 〇 Pass | No schemas modified; N/A |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` — deferred to T06
- [ ] Migration entry added to `forge/migrations.json` — deferred to T06
- [ ] Security scan run and report committed — deferred to T06

## Knowledge Updates

None required. No new patterns discovered.

## Notes

- Phase numbering in banners: 1.5 and 3b are sub-phases. The banner format uses
  `Phase 1.5/9` and `Phase 3b/9` respectively, which matches the numbering in
  the pre-flight plan table.
- Version bump, migration entry, and security scan are deferred to T06 (release
  engineering task) as specified in the plan.
- Prompt-injection scan of new Markdown content found no issues.