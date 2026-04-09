# PLAN — FORGE-S03-T02: Introduce granular migration target format and correct migrations.json

🌱 *Forge Engineer*

**Task:** FORGE-S03-T02
**Sprint:** FORGE-S03
**Estimate:** M

---

## Objective

Replace the coarse `"workflows"` / `"knowledge-base"` regeneration targets in
migration entries with a colon-delimited sub-target format
(`"workflows:plan_task"`, `"knowledge-base:architecture"`). Update the
`/forge:update` aggregator and `/forge:regenerate` dispatcher to handle both
the new granular format and the legacy bare format. Retroactively correct
`migrations.json` to remove all `"tools"` entries and fix the 0.6.0 entry to
reflect what actually changed in FORGE-S02.

## Approach

Three files need modification. All are Markdown or JSON — no JS/CJS changes,
no syntax checks required. No schema changes.

1. **`forge/migrations.json`** — strip `"tools"` from every `regenerate` array,
   correct the 0.5.9→0.6.0 entry to `["workflows:sprint_intake", "workflows:sprint_plan"]`,
   and add the 0.6.0→0.6.1 entry with `"regenerate": []`.

2. **`forge/commands/update.md`** — extend the aggregation logic in Steps 2A/2B
   to apply the dominance rule (bare category name overrides sub-targets), and
   update Step 4 dispatch to invoke `/forge:regenerate <category> <sub-target>`
   for granular targets. Update the summary display.

3. **`forge/commands/regenerate.md`** — document the colon format in the
   Arguments section and add sub-target behaviour to the `workflows` and
   `knowledge-base` category handlers.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/migrations.json` | Strip `"tools"` from all entries; correct 0.5.9→0.6.0; add 0.6.0→0.6.1 | Accuracy + lean migration architecture |
| `forge/commands/update.md` | Extend aggregation logic (dominance rule) + Step 4 dispatch + summary display | Support granular targets in update flow |
| `forge/commands/regenerate.md` | Document colon format in Arguments; add sub-target handlers for workflows and knowledge-base | Support granular invocation |

## Plugin Impact Assessment

- **Version bump required?** No — version bump is deferred to T03 (FORGE-S03-T03 handles the 0.6.0→0.6.1 bump)
- **Migration entry required?** No — the 0.6.0→0.6.1 entry is being added in migrations.json as part of this task's content, but the actual version bump happens in T03
- **Security scan required?** Yes — any change to `forge/` requires a security scan. Deferred to T03 which handles release engineering
- **Schema change?** No — no `.forge/store/` or config schema changes

## Testing Strategy

- No JS/CJS files modified — no `node --check` needed
- No schema changes — `validate-store --dry-run` not required
- Manual verification: confirm migrations.json is valid JSON after editing
- Manual verification: confirm no entry in `migrations.json` has `"tools"` in its `regenerate` array
- Manual verification: confirm 0.5.9→0.6.0 entry has `"regenerate": ["workflows:sprint_intake", "workflows:sprint_plan"]`
- Manual verification: confirm 0.6.0→0.6.1 entry exists with `"regenerate": []`

## Acceptance Criteria

- [ ] `migrations.json` has no entry containing `"tools"` in its `regenerate` array
- [ ] The 0.5.9→0.6.0 entry `regenerate` is `["workflows:sprint_intake", "workflows:sprint_plan"]`
- [ ] A 0.6.0→0.6.1 migration entry exists with `"regenerate": []`
- [ ] `forge/commands/update.md` Steps 2A/2B describe the dominance rule for category aggregation
- [ ] `forge/commands/update.md` Step 4 dispatches `<category> <sub-target>` for granular targets
- [ ] `forge/commands/regenerate.md` Arguments section documents the colon format
- [ ] `forge/commands/regenerate.md` `workflows` handler accepts an optional sub-target argument
- [ ] `forge/commands/regenerate.md` `knowledge-base` sub-target handlers accept named sub-target argument
- [ ] `migrations.json` remains valid JSON

## Operational Impact

- **Distribution:** Users who run `/forge:update` will see the corrected migration notes. No regeneration targets require action for 0.6.1.
- **Backwards compatibility:** Legacy bare `"workflows"` and `"knowledge-base"` entries continue to trigger full rebuilds — no existing upgrade paths break.
