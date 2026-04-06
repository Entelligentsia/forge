---
description: Use when you want to remove Forge from the current project, with options for what to keep
---

# /forge:remove

Remove Forge artifacts from the current project. This command is interactive —
nothing is deleted until you confirm explicitly.

## What Forge puts in a project

| Location | Contents | Safe to remove? |
|---|---|---|
| `.forge/` | Config, workflows, templates, task/sprint/bug store | Yes — regeneratable via `/forge:init` |
| `.claude/commands/` | Generated slash commands (sprint-plan, run-task, etc.) | Yes — regeneratable via `/forge:init` |
| `engineering/` | Knowledge base, sprint history, bug history, tools | **Caution** — represents accumulated project learning |

## Step 1 — Inventory what exists

Check which Forge directories are present:

```
exists: !`[ -d ".forge" ] && echo "YES" || echo "NO"`
exists: !`[ -d "engineering" ] && echo "YES" || echo "NO"`
exists: !`[ -d ".claude/commands" ] && echo "YES" || echo "NO"`
```

Report to the user exactly what was found before proceeding.

## Step 2 — Present options

Show the user these options:

```
Forge removal options:

  [1] Minimal — remove .forge/ only
      Removes config, workflows, templates, and the task/sprint/bug store.
      Leaves engineering/ and .claude/commands/ intact.
      Use this to reset Forge config while keeping your knowledge base.

  [2] Standard — remove .forge/ and generated commands
      Removes .forge/ and the Forge-generated commands in .claude/commands/.
      Leaves engineering/ intact.
      Recommended for most removals — your knowledge base survives.

  [3] Full — remove everything
      Removes .forge/, generated commands, AND engineering/.
      Your knowledge base, sprint history, and bug history will be lost.
      This cannot be undone.

Which option? (1 / 2 / 3)
```

Wait for the user's choice before proceeding.

## Step 3 — Confirm engineering/ removal (option 3 only)

If the user chose option 3, ask explicitly:

```
engineering/ contains your accumulated knowledge base — architecture docs,
entity model, stack checklist, sprint history, and bug history. This represents
real learning that took sprints to build.

Are you sure you want to delete it?
Type "delete engineering" to confirm, or anything else to keep it and use option 2 instead.
```

If they do not type exactly `delete engineering`, downgrade to option 2 and inform them.

## Step 4 — Final confirmation

Summarise exactly what will be deleted, then ask:

```
About to delete:
  ✗ .forge/
  ✗ .claude/commands/sprint-intake.md
  ✗ .claude/commands/sprint-plan.md
  ✗ .claude/commands/run-task.md
  ✗ .claude/commands/run-sprint.md
  ✗ .claude/commands/plan.md
  ✗ .claude/commands/review-plan.md
  ✗ .claude/commands/implement.md
  ✗ .claude/commands/review-code.md
  ✗ .claude/commands/fix-bug.md
  ✗ .claude/commands/approve.md
  ✗ .claude/commands/commit.md
  ✗ .claude/commands/collate.md
  ✗ .claude/commands/retrospective.md
  [✗ engineering/]   ← only if option 3 confirmed

Type "confirm" to proceed, or anything else to cancel.
```

Only proceed if the user types exactly `confirm`.

## Step 5 — Execute

Remove only the confirmed items. Use targeted commands — never `rm -rf .`:

**Option 1 (minimal):**
```bash
rm -rf .forge/
```

**Option 2 (standard):**
```bash
rm -rf .forge/
rm -f .claude/commands/sprint-intake.md \
      .claude/commands/sprint-plan.md \
      .claude/commands/run-task.md \
      .claude/commands/run-sprint.md \
      .claude/commands/plan.md \
      .claude/commands/review-plan.md \
      .claude/commands/implement.md \
      .claude/commands/review-code.md \
      .claude/commands/fix-bug.md \
      .claude/commands/approve.md \
      .claude/commands/commit.md \
      .claude/commands/collate.md \
      .claude/commands/retrospective.md
```

**Option 3 (full):**
```bash
rm -rf .forge/ engineering/
rm -f .claude/commands/sprint-intake.md \
      .claude/commands/sprint-plan.md \
      .claude/commands/run-task.md \
      .claude/commands/run-sprint.md \
      .claude/commands/plan.md \
      .claude/commands/review-plan.md \
      .claude/commands/implement.md \
      .claude/commands/review-code.md \
      .claude/commands/fix-bug.md \
      .claude/commands/approve.md \
      .claude/commands/commit.md \
      .claude/commands/collate.md \
      .claude/commands/retrospective.md
```

After removal, verify the directories are gone and report what was removed.

## Step 6 — Close

Confirm completion and remind the user:

- To reinstall Forge in this project: `/forge:init`
- The plugin itself is unaffected — only project artifacts were removed
- To uninstall the plugin entirely: `/plugin uninstall forge`

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
