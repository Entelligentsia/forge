---
description: Use after updating the Forge plugin to propagate changes into the project's generated artifacts (workflows, tools, orchestrator)
---

# /forge:update

Propagate a Forge plugin update into this project's generated artifacts.

Run this after `/plugin install Entelligentsia/forge` upgrades the plugin.
It reads the migration manifest, computes the delta from your previous version
to the current one, and runs exactly the regeneration targets that are needed —
no more.

## Locate plugin root

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

## Step 1 — Determine versions

Read the current plugin version by reading this file directly:

```
$FORGE_ROOT/.claude-plugin/plugin.json
```

Extract the `version` field. This is `CURRENT_VERSION`.

Read the migration baseline from the update-check cache. Resolve the cache path:

- If `CLAUDE_PLUGIN_DATA` is set and non-empty: `${CLAUDE_PLUGIN_DATA}/forge-plugin-data/update-check-cache.json`
- Otherwise: `/tmp/forge-plugin-data/update-check-cache.json`

Call this resolved path `CACHE_FILE`. Read the file if it exists.

Extract `migratedFrom` from the cache JSON. If absent, fall back to
`localVersion` from the cache. If both are absent, ask the user:
> "What version of Forge did you have before updating?"
and use their answer as the baseline. The user can also pass `--from <version>`
as an argument to set the baseline explicitly.

If `CURRENT_VERSION` equals the baseline, tell the user:
> "Already up to date — no migrations to apply."
and exit.

## Step 2 — Compute migration path

Read `$FORGE_ROOT/migrations.json`.

Walk the migration chain from the baseline version forward to `CURRENT_VERSION`:
- Each entry key is a `from` version; its `version` field is the `to` version.
- Collect the ordered list of migration steps that bridge baseline → current.
- If no path exists (baseline is not in the manifest), warn the user:
  > "No migration path found from <baseline> to <current>. The project may
  > have skipped versions. Running /forge:regenerate workflows tools is
  > recommended to ensure consistency."
  Then exit — do not guess.

Aggregate across all steps in the path:
- Union of all `regenerate` targets (deduplicated, order preserved)
- Concatenated `notes` (one line per step)
- `breaking: true` if any step is breaking
- Union of all `manual` items

## Step 3 — Report and confirm

Print a migration summary:

```
Forge <baseline> → <current>

Changes:
  <notes from each step, one per line>

Regeneration required:
  workflows   — re-generate .forge/workflows/ from updated meta-definitions
  tools       — install updated pre-built tools into engineering/tools/ and .forge/schemas/

<If breaking: true>
⚠ Breaking changes — manual steps required before regenerating:
  <manual items, one per line>

Proceed? [Y/n]
```

If the user declines, exit without modifying anything.
If `breaking: true`, require the user to confirm they have completed the manual
steps before proceeding.

## Step 4 — Regenerate

For each target in the aggregated regeneration list, invoke the equivalent of
`/forge:regenerate <target>` by reading and following
`$FORGE_ROOT/commands/regenerate.md` for that specific category.

Run non-knowledge-base targets first (tools, workflows, templates), then
knowledge-base sub-targets if present.

## Step 5 — Record migration state

Update the cache file to record the completed migration. Use `CACHE_FILE`
from Step 1. If the parent directory does not exist, create it with
`mkdir -p` before writing. Read the existing file if present, update
`migratedFrom` and `localVersion` to `CURRENT_VERSION`, and write it back.
Use the Write or Edit tool — do not run a shell command for this step.

If the cache file does not exist, create it with:
```json
{ "migratedFrom": "<CURRENT_VERSION>", "localVersion": "<CURRENT_VERSION>" }
```

Print:
```
Migration to Forge <current> complete.
Run /forge:health to verify knowledge base currency.
```

## Arguments

$ARGUMENTS

If the user passes `--from <version>`, use that as the baseline instead of the
cached value. Useful when the cache is missing or the user installed across
multiple versions in one step.

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
