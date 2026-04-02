---
description: Use after updating the Forge plugin to propagate changes into the project's generated artifacts (workflows, tools, orchestrator)
---

# /forge:update

Propagate a Forge plugin update into this project's generated artifacts.

Run this after `/plugin install Entelligentsia/forge` upgrades the plugin.
It reads the migration manifest, computes the delta from your previous version
to the current one, and runs exactly the regeneration targets that are needed —
no more.

## Locate plugin and cache

```
FORGE_ROOT:  !`echo "${CLAUDE_PLUGIN_ROOT}"`
PLUGIN_DATA: !`echo "${CLAUDE_PLUGIN_DATA}"`
```

## Step 1 — Determine versions

Read current plugin version:
```
CURRENT_VERSION: !`node -e "const f=require('fs'),p=require('path');try{process.stdout.write(JSON.parse(f.readFileSync(p.join(process.env.CLAUDE_PLUGIN_ROOT,'.claude-plugin','plugin.json'),'utf8')).version||'')}catch{process.stdout.write('')}"`
```

Read the migration baseline (the version installed before the last `/plugin install`):
```
CACHE: !`node -e "const f=require('fs'),p=require('path'),c=p.join(process.env.CLAUDE_PLUGIN_DATA||require('os').tmpdir(),'forge-plugin-data','update-check-cache.json');try{process.stdout.write(f.readFileSync(c,'utf8'))}catch{process.stdout.write('{}')}"`
```

Extract `migratedFrom` from the cache JSON. If absent, fall back to `localVersion`
from the cache. If both are absent, ask the user: "What version of Forge did you
have before updating?" and use their answer.

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
  tools       — re-generate engineering/tools/ from updated tool specs

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

Write the completed migration version back to the cache so subsequent runs
know the new baseline:

```
!`node -e "
const fs=require('fs'),path=require('path'),os=require('os');
const dataDir=process.env.CLAUDE_PLUGIN_DATA||path.join(os.tmpdir(),'forge-plugin-data');
const cacheFile=path.join(dataDir,'update-check-cache.json');
let cache={};
try{cache=JSON.parse(fs.readFileSync(cacheFile,'utf8'))}catch{}
cache.migratedFrom=process.argv[1];
cache.localVersion=process.argv[1];
fs.writeFileSync(cacheFile,JSON.stringify(cache));
" CURRENT_VERSION`
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
