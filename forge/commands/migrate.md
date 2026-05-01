---
name: migrate
description: Use after forge:init to migrate a pre-existing AI-SDLC store to Forge format — interviews you to define the project-specific mapping
---

# /forge:migrate

Migrate an existing project store to Forge format. Requires `forge:init` to have been completed first.

## Locate the Forge plugin

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

## Step 0 — Detect migration type

Check whether a structural migration (v0.x prose-heavy → v0.40 base-pack
format) is needed:

- If the user passed `--structural` explicitly, OR
- If `.forge/structure-versions.json` is absent (pre-T05 install detected):

  → Load and run the structural migration workflow:
    Read `"$FORGE_ROOT/meta/workflows/meta-migrate.md"` and follow it.
  → Do NOT proceed to Step 1 of this command.

If neither condition applies (post-T05 install and no `--structural` flag):
continue to Step 1 (store schema migration).

## Step 1 — Verify forge:init has run

Check that `.forge/config.json` exists. If it does not, stop and tell the user:

> "Forge has not been initialised in this project. Run `/forge:init` first, then come back to `/forge:migrate`."

Read `.forge/config.json` to get `paths.store` (default: `.forge/store`).

## Step 2 — Scan for non-Forge values

Read every JSON file under `{paths.store}/sprints/`, `{paths.store}/tasks/`, and `{paths.store}/bugs/`.

Collect the distinct values present in each `status` field and `severity` field (bugs only), grouped by record type. Cross-reference against the known Forge enums:

**Sprint status:** `planning`, `active`, `completed`, `retrospective-done`, `blocked`, `partially-completed`, `abandoned`

**Task status:** `draft`, `planned`, `plan-approved`, `implementing`, `implemented`, `review-approved`, `approved`, `committed`, `plan-revision-required`, `code-revision-required`, `blocked`, `escalated`, `abandoned`

**Bug status:** `reported`, `triaged`, `in-progress`, `fixed`, `verified`

**Bug severity:** `critical`, `major`, `minor`

Report only the values that are **not** already valid Forge enums. If all values are already valid, tell the user:

> "Store is already fully Forge-compatible — no migration needed. Run `node \"$FORGE_ROOT/tools/validate-store.cjs\"` to confirm."

Then exit.

## Step 3 — Interview the user

Present the unrecognised values grouped by record type. For each value, ask the user to choose the Forge equivalent (or mark it as custom/skip):

```
Found values not in Forge format. Please map each one:

Sprint status:
  "✅ Complete"    → ? (Forge options: planning / active / completed / retrospective-done / blocked / partially-completed / abandoned)
  "🔵 In Progress" → ?

Task status:
  "✅ Complete"    → ?
  "📋 Prompt Ready" → ?
  ...

Bug severity:
  "Major" → ? (Forge options: critical / major / minor)

For each value above, enter the Forge equivalent. Type "skip" to leave that value unchanged (it will remain invalid and fail validate-store).
```

Wait for the user to provide the full mapping before proceeding.

## Step 4 — Preview changes

Count how many records will be affected per type. Show a preview table:

```
Migration preview:

  Sprints:  N records — M values will change
  Tasks:    N records — M values will change
  Bugs:     N records — M values will change

  Example changes:
    sprints/S01.json  status: "✅ Complete"    → "completed"
    tasks/WI-T001.json status: "✅ Complete"   → "committed"
    bugs/WI-BUG-01.json severity: "Major"     → "major"

Apply? [Y/n]
```

If the user declines, exit without changes.

## Step 5 — Apply migration

For each affected record, apply the migration via the store custodian:

```
node "$FORGE_ROOT/tools/store-cli.cjs" write <entity> '{updated-json}'
```

where `<entity>` is `sprint`, `task`, or `bug` as appropriate, and
`'{updated-json}'` is the full record with the mapped field values applied.
Construct the JSON by reading the current record (using the Read tool or
`/forge:store read <entity> <id>`), applying only the agreed mapping, and
passing the complete updated record to the custodian.

**Error handling:** If the custodian exits with code 1, read stderr for the
validation error, fix the data, and retry (max 2 retries). If the command still
fails after retries, report the validation error to the user and stop. **Never
fall back to writing store files directly.**

Do not modify any field that was not part of the agreed mapping. Do not add or remove fields.

## Step 6 — Verify

Run:

```sh
node "$FORGE_ROOT/tools/validate-store.cjs" --dry-run
```

Report the result. If errors remain (e.g. values the user chose to skip), list them clearly so the user knows what still needs attention.

## Step 7 — Close

Report a summary:

```
Migration complete:
  N sprint(s) updated
  N task(s) updated
  N bug(s) updated

Run /forge:health to check overall knowledge base status.
```

## Arguments

$ARGUMENTS

If the user passes `--dry-run`, run Steps 1–4 only (no writes).

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
