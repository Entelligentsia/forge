# PLAN — FORGE-S08-T03: Regenerate per-file status lines

**Task:** FORGE-S08-T03
**Sprint:** FORGE-S08
**Estimate:** S

---

## Objective

Eliminate the perception of a hang during `/forge:regenerate`. When generating
12 workflow files, users currently see nothing until the entire category is done.
Add a `⋯ generating <file>...` line before writing each file and a `〇 <file>`
line after, for all categories.

## Approach

Single file change: `forge/commands/regenerate.md`. Each category section already
has a numbered step list describing what to write. Insert emit instructions at the
right points in each category's write loop.

This change propagates to `/forge:init` (phases 3-8 call the same regeneration
logic) and to `/forge:update` (Step 4 invokes `/forge:regenerate`), at zero
additional cost.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/commands/regenerate.md` | Add per-file emit instructions in every category's write loop | Single change propagates everywhere regenerate is invoked |

## Plugin Impact Assessment

- **Version bump required?** Yes — deferred to T06.
- **Migration entry required?** Yes — deferred to T06.
- **Security scan required?** Yes — deferred to T06.
- **Schema change?** No.

## Detailed Changes

### Standard emit pattern

For every category, the write loop becomes:

```
Before writing each file:
  Emit: `  ⋯ <filename>...`

After the file is written and the hash is recorded:
  Emit: `  〇 <filename>`
```

### Category: `personas`

In step 3 (re-generate `.forge/personas/`), wrap each file write:

```
For each persona file:
  Emit: `  ⋯ <persona-filename>.md...`
  [write the file]
  [record hash]
  Emit: `  〇 <persona-filename>.md`
```

### Category: `skills`

Same pattern in step 4 (re-generate `.forge/skills/`).

### Category: `workflows`

In step 5 (re-generate `.forge/workflows/`), wrap each file write.
Note: the manifest check and modified-file warning happen *before* the emit —
the `⋯` line appears only after the user has confirmed (or the file is pristine):

```
[check manifest status]
[if modified: prompt user]
Emit: `  ⋯ <workflow-filename>.md...`
[write the file]
[record hash]
Emit: `  〇 <workflow-filename>.md`
```

### Category: `commands`

In step 3 (re-generate `.claude/commands/`), wrap each file write.

### Category: `templates`

In step 3 (re-generate `.forge/templates/`), wrap each file write.

### Category: `knowledge-base` sub-targets

Knowledge-base uses a merge/diff model — it doesn't generate discrete files.
Instead of per-file lines, emit a category-level status:

```
  ⋯ merging architecture docs...
  〇 architecture — N additions
```

### Category header

At the start of each category, emit a section header:

```
Generating <category> (<N> files)...
```

For example:
```
Generating workflows (12 files)...
  ⋯ plan_task.md...
  〇 plan_task.md
  ⋯ implement_plan.md...
  〇 implement_plan.md
  ...
```

The file count can be approximate if not known in advance (`~12 files` is acceptable).

## Testing Strategy

- Run `/forge:regenerate workflows` — verify per-file lines appear for each workflow
- Run `/forge:regenerate personas` — verify per-file lines appear for each persona
- Run `/forge:regenerate` (no arg, default) — verify all four categories emit status lines

## Acceptance Criteria

- [ ] `forge/commands/regenerate.md` includes per-file `⋯`/`〇` emit instructions for all five generate categories (personas, skills, workflows, commands, templates)
- [ ] The `⋯` line appears before each write, the `〇` line appears after each hash record
- [ ] Knowledge-base sub-targets emit a merge-level status line instead of per-file lines
- [ ] Each category emits a header line with file count before the per-file loop begins
- [ ] Modified-file prompt (manifest check) happens before the `⋯` line — not after
