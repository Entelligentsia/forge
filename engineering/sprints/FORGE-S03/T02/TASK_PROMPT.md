# FORGE-S03-T02: Introduce granular migration target format and correct migrations.json

**Sprint:** FORGE-S03
**Estimate:** M
**Pipeline:** default

---

## Objective

Replace the coarse `"workflows"` / `"knowledge-base"` regeneration targets in
migration entries with a colon-delimited sub-target format
(`"workflows:plan_task"`, `"knowledge-base:architecture"`). Update the
`/forge:update` aggregator and `/forge:regenerate` dispatcher to handle both
the new granular format and the legacy bare format. Retroactively correct
`migrations.json` to remove `"tools"` entries and fix the 0.6.0 entry to
reflect what actually changed.

## Acceptance Criteria

1. `/forge:update` from 0.5.9 regenerates only `sprint_intake.md` and `sprint_plan.md` (corrected 0.6.0 entry), not all workflows.
2. `/forge:update` from 0.6.0 applies zero regeneration (0.6.1 entry has empty or no regeneration targets).
3. `/forge:update` from 0.4.x: any hop with bare `"workflows"` triggers full workflow rebuild (dominance rule preserved).
4. `migrations.json` has no entry containing `"tools"` in its `regenerate` array.
5. The 0.5.9→0.6.0 entry `regenerate` is `["workflows:sprint_intake", "workflows:sprint_plan"]`.
6. A 0.6.0→0.6.1 migration entry exists with `"regenerate": []`.

## Format Specification

### Migration entry format (new)

```json
"regenerate": ["workflows:plan_task", "workflows:sprint_plan"]
```

```json
"regenerate": ["knowledge-base:architecture", "knowledge-base:stack-checklist"]
```

```json
"regenerate": ["workflows"]  // legacy — still valid, triggers full rebuild
```

### Aggregation rules (multi-hop)

When walking a migration chain from version A to version N:

1. Collect all `regenerate` arrays from every step in the path.
2. For each category (`workflows`, `knowledge-base`, `commands`):
   - If ANY step has a bare entry for this category → full rebuild for that category.
   - Otherwise → union of all sub-targets across all steps (deduplicated).
3. Each category is rebuilt at most once.

### Dispatch

After aggregation, for each category:
- **Full rebuild:** invoke `/forge:regenerate <category>` (existing behaviour)
- **Sub-target list:** invoke `/forge:regenerate <category> <sub-target>` for each sub-target

## Implementation Notes

### update.md

**Step 2A / Step 2B — Aggregation:**

Update the aggregation logic description. The current spec says:
> "Union of all `regenerate` targets (deduplicated, order preserved)"

Extend to:
> "Union of all `regenerate` targets, applying the dominance rule: for each category, if any step lists a bare category name (e.g. `'workflows'`), that category is flagged for full rebuild. If all steps for a category use sub-targets (e.g. `'workflows:plan_task'`), collect the union of those sub-targets."

**Step 4 — Dispatch:**

Update the dispatch section. Currently it says:
> "For each target in the aggregated regeneration list, invoke the equivalent of `/forge:regenerate <target>`"

Replace with:
> "For each category in the aggregated result:
> - If flagged for full rebuild: invoke `/forge:regenerate <category>`
> - If sub-targets collected: invoke `/forge:regenerate <category> <sub-target>` for each sub-target in order"

**Step 4 — Summary display:**

Update the "Regeneration targets" display in the migration summary to show granular targets when present:
```
Regeneration targets:
  • workflows: plan_task, sprint_plan
  • knowledge-base: (full rebuild)
```

### regenerate.md

**Arguments section:**

Add the colon format to the argument table:

```
/forge:regenerate workflows plan_task        # single workflow file only
/forge:regenerate knowledge-base architecture # single KB sub-target only
```

**Per-category handlers:**

For `workflows`: when a second argument (sub-target) is provided, regenerate only `.forge/workflows/<sub-target>.md` instead of the full directory. Still use the manifest check/record pattern.

For `knowledge-base`: the sub-targets (`architecture`, `business-domain`, `stack-checklist`) already exist as named sections. When a sub-target is passed as an argument, run only that section's discovery and merge steps.

### migrations.json

Make the following changes:

1. **Strip `"tools"` from all entries.** Every entry that has `"tools"` in its `regenerate` array should have it removed. If `"tools"` was the only entry, the array becomes `[]`.

   Affected entries (from `"from"` key): `"0.5.9"`, `"0.4.1"`, `"0.3.15"`, `"0.4.0"` (manual step references tools but that's in the `manual` array — leave it), `"0.3.13"`, `"0.2.0"`, `"0.3.5"`, `"0.3.6"`, `"0.3.2"`, `"0.3.7"`, `"0.3.12"`.

   Note: entry `"0.4.0"` has `"breaking": true` and a manual step that mentions `engineering/tools/manage-config.cjs` — leave the `manual` array unchanged, only strip `"tools"` from `regenerate`.

2. **Correct the 0.5.9→0.6.0 entry:**
   ```json
   "regenerate": ["workflows:sprint_intake", "workflows:sprint_plan"]
   ```
   (was `["tools", "workflows"]`)

3. **Add the 0.6.0→0.6.1 entry:**
   ```json
   "0.6.0": {
     "version": "0.6.1",
     "date": "2026-04-09",
     "notes": "Lean migration architecture: eliminate tools regenerate target (schemas now embedded in validate-store), introduce colon-delimited granular regeneration sub-targets for workflows and knowledge-base, retroactively correct 0.6.0 migration entry. No user-facing file regeneration required.",
     "regenerate": [],
     "breaking": false,
     "manual": []
   }
   ```

## Plugin Artifacts Modified

- `forge/commands/update.md`
- `forge/commands/regenerate.md`
- `forge/migrations.json`

## Operational Impact

- **Version bump:** Deferred to T03.
- **Regeneration:** None required for users (0.6.1 entry has empty regenerate).
- **Security scan:** Deferred to T03.
