# PROGRESS — FORGE-S08-T03: Regenerate per-file status lines

*Forge Engineer*

**Task:** FORGE-S08-T03
**Sprint:** FORGE-S08

---

## Summary

Added per-file status line emit instructions to `forge/commands/regenerate.md` for all five generation categories (personas, skills, workflows, commands, templates). Each category now emits a header with file count, a `... <filename>.md...` line before each file write, and a `O <filename>.md` line after hash recording. Knowledge-base sub-targets use merge-level status lines instead. The manifest check for workflows is ordered before the `...` line.

## Syntax Check Results

No JS/CJS files modified. Markdown-only change.

## Store Validation Results

No schema changes. N/A.

## Files Changed

| File | Change |
|---|---|
| `forge/commands/regenerate.md` | Added category headers with file counts, per-file `...`/`O` emit instructions for personas, skills, workflows, commands, templates; added merge-level status lines for knowledge-base |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| Per-file `...`/`O` emit instructions for all five generation categories | Pass | personas, skills, workflows, commands, templates all covered |
| `...` line appears before each write, `O` line appears after each hash record | Pass | Consistent pattern across all five categories |
| Knowledge-base uses merge-level status line instead of per-file | Pass | `... merging <sub-target> docs...` / `O <sub-target> -- N additions` |
| Each category emits a header line with file count | Pass | `Generating <category> (<N> files)...` for all categories |
| Modified-file prompt (manifest check) happens before `...` line | Pass | Workflows category: manifest check listed before emit in step 7 |
| `node --check` passes | Pass | No JS/CJS files modified |
| `validate-store --dry-run` exits 0 | Pass | No schema changes |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` (deferred to T06)
- [ ] Migration entry added to `forge/migrations.json` (deferred to T06)
- [ ] Security scan run and report committed (deferred to T06)

## Knowledge Updates

None.

## Notes

- The plan review identified that the plan's claim about propagation to `/forge:init` was incorrect. Init phases follow `sdlc-init.md` and their own generation prompts, not `/forge:regenerate`. The propagation to `/forge:update` (Step 4 calls regenerate) is correct. This does not affect the implementation, only the plan's rationale.
- The commands category does not have a manifest check step (no `generation-manifest.cjs check` call) because the existing regenerate.md did not have one. This is consistent with the plan.
- Security scan and version bump are deferred to FORGE-S08-T06 per the sprint plan.