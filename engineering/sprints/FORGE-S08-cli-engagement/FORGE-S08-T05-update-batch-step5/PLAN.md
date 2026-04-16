# PLAN — FORGE-S08-T05: Update Step 5 collect-all-then-confirm audit

**Task:** FORGE-S08-T05
**Sprint:** FORGE-S08
**Estimate:** M
**Depends on:** FORGE-S08-T04

---

## Objective

Replace the current per-file sequential prompts in `/forge:update` Step 5 with a
single consolidated "review list" that shows all findings at once and asks for bulk
confirmation, with an optional individual-review mode for users who want fine-grained
control.

## Problem

Step 5 currently has 6 sub-steps (5b-pre, 5b-portability, 5b-rename, 5b, 5c, 5d,
5e, 5f) each running independently and asking per-file questions. On a project with
3 custom pipelines and 5 custom command files, this produces 8-12 sequential prompts.
Each prompt interrupts the LLM mid-step, forcing the user to context-switch repeatedly.

## Approach

Restructure Step 5 into two phases:

**Phase A -- Collect:** Run all sub-checks silently (no prompts). Accumulate all
findings into a numbered item list. Each item has a type, label, proposed action,
and a flag for whether it requires individual confirmation.

**Phase B -- Confirm:** Present the full list and ask once:
- `[Y]` -- apply all required items; optional items are listed but not applied
- `[a]` -- apply all including optional decoration items
- `[r]` -- review individually (falls back to current per-item behavior)
- `[n]` -- skip all and proceed to Step 6

The individual review mode (r) preserves the current behavior exactly for users
who want it.

## Pipeline gate clarification (review item 1 & 4)

The current Step 5 has mixed gating:

- **5b-pre** (retired files) runs on every update, regardless of pipelines
- **5b-portability** (legacy model fields) runs on every update, regardless of pipelines
- **5b-rename** (retired command names) runs on every update, but produces no findings
  when no pipelines exist
- **5c, 5d, 5e, 5f** only produce findings when pipelines exist

In the new collect-then-confirm model:

1. The collect phase **always runs**. Every sub-check executes. Pipeline-dependent
   sub-checks simply produce zero items when no pipelines are configured.
2. If `AUDIT_ITEMS` is empty after collection, print `〇 Pipeline audit complete —
   nothing to update.` and skip to Step 6.
3. If `AUDIT_ITEMS` has entries, present the consolidated prompt regardless of
   whether pipelines exist. This means 5b-pre and 5b-portability findings will
   appear even on projects without pipelines.

This replaces the current 5b gate ("if no pipelines, skip to Step 6") with a
smarter check: the collect phase runs unconditionally, and the skip decision is
based on whether any items were found at all.

## Legacy model field handling (review item 2)

`legacy-model-field` items are informational -- they tell the user that files will
be auto-migrated by `/forge:regenerate workflows`. In the new model, these items
appear in the consolidated list with type `legacy-model-field` and are marked as
**auto-applied** (not requiring user confirmation). The presentation is:

```
[2] 〇 .forge/workflows/architect_sprint_plan.md — legacy model: field detected.
       Will be auto-migrated by /forge:regenerate workflows. No action needed.
```

When `[Y]` or `[a]` is chosen, legacy-model-field items are acknowledged
automatically and printed as `  〇 acknowledged: <label>`. When `[r]` is chosen,
the current per-item acknowledgment prompt is shown. When `[n]` is chosen, a
warning is printed that some workflows may not resolve models correctly until
regenerated.

## Optional decoration items mechanism (review item 3)

The original plan had a contradiction: `[Y]` applied all items but optional
decoration items were excluded from bulk-apply, and there was no way to include
them. The revised model has four choices:

| Choice | Action on required items | Action on optional items |
|--------|--------------------------|--------------------------|
| `[Y]`  | Apply all               | List but skip            |
| `[a]`  | Apply all               | Apply all                |
| `[r]`  | Review each one at a time (original Step 5 behavior) | Review each one at a time |
| `[n]`  | Skip all                | Skip all                 |

Optional items (type `add-persona-symbol`) are shown in the consolidated list
marked `(optional)` so the user knows they exist. After `[Y]` processes
required items, a brief summary of skipped optional items is printed:

```
  ── 2 optional decoration items skipped (re-run with [a] to include, or [r] for individual review)
```

This resolves the contradiction: `[Y]` does not silently drop information, the
user can see what was skipped, and `[a]` provides an explicit way to include
optional items without requiring individual review.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/commands/update.md` | Restructure Step 5 into Collect + Present phases | Reduces prompt overhead from N prompts to 1 |

## Plugin Impact Assessment

- **Version bump required?** Yes -- deferred to T06.
- **Migration entry required?** Yes -- deferred to T06.
- **Security scan required?** Yes -- deferred to T06.
- **Schema change?** No.

## Detailed Changes

### Replace the current Step 5 with:

```markdown
## Step 5 -- Pipeline and configuration audit

Emit: `━━━ Step 5/6 — Pipeline audit ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Runs on every update. Collects all findings first, then presents a single
consolidated prompt.

### 5a -- Locate tools

[unchanged from current]

### 5b-collect -- Run all sub-checks silently

Run each sub-check without prompting. Accumulate findings into `AUDIT_ITEMS` list.
Each item:

```
{
  "type":     "delete-command" | "delete-workflow" | "update-pipeline-cmd"
            | "legacy-model-field" | "add-workflow-field" | "add-persona-symbol"
            | "add-paths-key" | "missing-command-file",
  "label":    <human-readable one-line description>,
  "action":   <what will be done if approved>,
  "path":     <file or pipeline affected>,
  "modified": true | false,   # from manifest check, if applicable
  "required": true | false    # true for items that need confirmation; false for auto-applied
}
```

**Item classification:**

| Type | `required` | `modified` can be true? | Notes |
|------|-----------|------------------------|-------|
| `delete-command` | true | yes (△) | Retired command file |
| `delete-workflow` | true | yes (△) | Retired workflow file |
| `update-pipeline-cmd` | true | no | Retired command name in pipeline config |
| `legacy-model-field` | false | no | Auto-migrated by regeneration |
| `add-workflow-field` | true | no | Missing workflow field in pipeline phase |
| `add-persona-symbol` | false | no | Optional decoration |
| `add-paths-key` | true | no | Missing config key |
| `missing-command-file` | false | no | Advisory only |

Sub-checks to run silently (logic unchanged from current Step 5, just no prompts):

- **5b-pre** -- retired command and workflow files
- **5b-portability** -- legacy `model:` fields in workflows
- **5b-rename** -- retired command names in pipeline config
- **5c** -- missing `paths.customCommands` key
- **5d/5e** -- custom phase workflow field audit
- **5f** -- persona decoration

Items where `modified: true` must be flagged with `△` in the label.

**Pipeline gate behavior:** All sub-checks always run. Pipeline-dependent
sub-checks (5b-rename, 5c, 5d, 5e, 5f) naturally produce zero items when
no pipelines are configured. If `.forge/config.json` does not exist,
skip Step 5 entirely and proceed to Step 6.

### 5b-present -- Present consolidated prompt

If `AUDIT_ITEMS` is empty:
> 〇 Pipeline audit complete -- nothing to update.

Skip to Step 6.

If `AUDIT_ITEMS` has entries, separate them into required and optional groups
and emit:

```
## Step 5 — Audit (N items)

  [1] △ .claude/commands/supervisor.md — retired name, user edits detected.
         Merge into review-plan.md before deleting. Delete old file?
  [2] 〇 .forge/workflows/architect_sprint_plan.md — legacy model: field detected.
         Will be auto-migrated by /forge:regenerate workflows.
  [3] 〇 pipeline "main" phase 3 — no workflow field.
         Add: "workflow": "engineering/commands/qa.md"
  [4] 〇 pipeline "main" phase 4 — command file missing.
         No file found for command "security-check". Create via /forge:add-pipeline.
  [5] 〇 engineering/commands/qa.md — Persona section, no symbol line. (optional)
         Add: 🌿 **QA Engineer** — I validate implementations...

  Apply required? [Y]  Apply all (including optional)? [a]  Review individually [r]  Skip [n]
```

**Ordering within the list:**

1. Deletion items (`delete-command`, `delete-workflow`) first -- highest urgency
2. Pipeline config updates (`update-pipeline-cmd`, `add-paths-key`) second
3. Workflow field additions (`add-workflow-field`) third
4. Missing file warnings (`missing-command-file`) fourth -- always advisory
5. Legacy model field items (`legacy-model-field`) fifth -- auto-applied
6. Optional decoration items (`add-persona-symbol`) last -- marked `(optional)`

**Behavior for each choice:**

**[Y] -- Apply required items:**

For each item where `required: true`:
- If `modified: true` (△): prompt individually for that specific item before
  acting ("This file has user edits. Confirm deletion?" yes/no)
- If `modified: false`: apply automatically, emit `  〇 applied: <label>`

For `legacy-model-field` items (`required: false`): acknowledge automatically,
emit `  〇 acknowledged: <label>`

For `add-persona-symbol` items: skip, emit
`  ── skipped: <label> (optional)`

After processing, if any optional items were skipped:
```
  ── N optional decoration item(s) skipped (re-run with [a] to include, or [r] for individual review)
```

**[a] -- Apply all including optional:**

Same as [Y] for all required items, plus apply `add-persona-symbol` items.
Each decoration is applied by prepending the symbol line after the `## Persona`
heading in the target file.

**[r] -- Review individually:**

Fall back to the original per-item behavior from the current Step 5 sub-steps.
Walk through each item in order using the existing prompts for 5b-pre, 5b-portability,
5b-rename, 5c, 5d/5e, and 5f. This preserves backward compatibility exactly.

**[n] -- Skip all:**

Emit summary of skipped items:
```
  ── N item(s) skipped:
  ── [1] <label>
  ── [2] <label>
  ...
```
For any `legacy-model-field` items in the skipped list, add:
```
  △ Some workflows may not resolve models correctly until regenerated.
```
Proceed to Step 6.
```

### Key behavioral invariants to preserve

- `△` items (user-modified files) must never be deleted without explicit confirmation
  even in bulk-apply mode -- if `[Y]` or `[a]` is chosen and an item is `modified: true`,
  prompt for that specific item before acting
- `missing-command-file` items are always advisory -- never blocked, always result
  in a reminder at the end
- `legacy-model-field` items are auto-acknowledged in `[Y]` and `[a]` modes (no
  individual prompt), but shown in the list for transparency
- `add-persona-symbol` items are excluded from `[Y]` bulk-apply but included in `[a]`
- The individual review mode `[r]` must behave identically to the current Step 5
- If `.forge/config.json` does not exist, Step 5 is skipped entirely (no change from
  current behavior)
- If `AUDIT_ITEMS` is empty (no findings at all), print the "nothing to update"
  message and proceed to Step 6

### Section to remove

Remove the current Step 5 sub-sections (5b-pre, 5b-portability, 5b-rename, 5b,
5c, 5d, 5e, 5f) and replace them entirely with the new 5b-collect and 5b-present
sections. The per-item logic from those sections is preserved inside the `[r]`
individual review mode description.

## Testing Strategy

- Project with no `.forge/config.json` -- verify Step 5 is skipped entirely
- Project with `config.json` but no pipelines -- verify 5b-pre/5b-portability
  items still appear in consolidated list (if applicable)
- Project with 0 pipelines and no findings -- verify Step 5 emits
  "nothing to update" and proceeds
- Project with 1 retired file (unmodified) + 1 missing workflow field:
  - Verify 2-item list appears
  - Verify `[Y]` applies both
  - Verify `[n]` skips both and Step 6 runs
- Project with 1 user-modified retired file:
  - Verify `△` flag appears
  - Verify `[Y]` still prompts individually for that item
- Project with persona decoration items:
  - Verify `[Y]` skips them with summary line
  - Verify `[a]` applies them
- Project with legacy model field items:
  - Verify they appear in the list but are auto-acknowledged by `[Y]`
- Run `/forge:update` end-to-end on a project with custom pipelines and verify
  consolidated prompt appears
- Run `/forge:update` on a project without pipelines and verify 5b-pre/5b-portability
  items still appear (if applicable)

## Acceptance Criteria

- [ ] `forge/commands/update.md` Step 5 is restructured into Collect + Present phases
- [ ] All current sub-checks (5b-pre, 5b-portability, 5b-rename, 5c, 5d, 5e, 5f) run without prompts during Collect
- [ ] The pipeline gate is clarified: collect always runs; pipeline-dependent sub-checks naturally produce zero items without pipelines
- [ ] If `.forge/config.json` is absent, Step 5 is skipped entirely
- [ ] The consolidated prompt shows a numbered list of all findings with `[Y]`, `[a]`, `[r]`, `[n]` options
- [ ] `[Y]` applies required items; `△`-flagged items still get individual confirmation; optional items are skipped with a summary line
- [ ] `[a]` applies required items AND optional decoration items
- [ ] `[r]` falls back to per-item review behavior matching the current Step 5 logic
- [ ] `[n]` skips all and proceeds to Step 6
- [ ] `legacy-model-field` items are auto-acknowledged in `[Y]` and `[a]` modes, shown in list for transparency, and trigger a regeneration warning in `[n]` mode
- [ ] `missing-command-file` items are always advisory; bulk-apply emits a reminder at the end
- [ ] Empty audit (no findings) emits `〇 Pipeline audit complete — nothing to update.`