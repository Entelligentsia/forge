---
description: Check for Forge updates, review changes, install, and apply migrations — all in one command
---

# /forge:update

Single entry point for updating Forge. Checks GitHub for new versions, shows
what changed, guides you through the install, and applies migrations to this
project's generated artifacts.

## Locate plugin root

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

---

## Step 1 — Check for updates

Read the current **local** plugin version:

```
$FORGE_ROOT/.claude-plugin/plugin.json   →   extract "version"   →   LOCAL_VERSION
```

Fetch the **remote** plugin manifest from GitHub to get the latest available version.
Use the WebFetch tool (preferred) or `curl` via Bash:

```
URL: https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json
```

Parse the response JSON and extract the `version` field → `REMOTE_VERSION`.

If the fetch fails (network error, timeout), warn the user:
> Could not reach GitHub to check for updates. Proceeding with local version only.

Then skip to **Step 3** (apply pending migrations if any).

### Determine update status

Read the migration baseline from the update-check cache. Resolve the cache path:
- If `CLAUDE_PLUGIN_DATA` is set and non-empty: `${CLAUDE_PLUGIN_DATA}/forge-plugin-data/update-check-cache.json`
- Otherwise: `/tmp/forge-plugin-data/update-check-cache.json`

Call this resolved path `CACHE_FILE`. Read the file if it exists.
Extract `migratedFrom` from the cache JSON. If absent, fall back to
`localVersion` from the cache. If both are absent, use `LOCAL_VERSION`.

The user can also pass `--from <version>` as an argument to set the baseline
explicitly — this overrides any cached value.

Now evaluate:

| Condition | Action |
|-----------|--------|
| `REMOTE_VERSION` == `LOCAL_VERSION` and `LOCAL_VERSION` == baseline | Print "Forge {LOCAL_VERSION} — up to date. No pending migrations." and exit. |
| `REMOTE_VERSION` == `LOCAL_VERSION` and `LOCAL_VERSION` != baseline | Print "Forge {LOCAL_VERSION} — already on latest. Applying pending migrations..." and jump to **Step 4**. |
| `REMOTE_VERSION` != `LOCAL_VERSION` | Proceed to **Step 2**. |

---

## Step 2 — Present what's new

Fetch the **remote** migrations manifest from GitHub:

```
URL: https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/migrations.json
```

Parse the response JSON. Walk the migration chain from `LOCAL_VERSION` forward
to `REMOTE_VERSION`:
- Each entry key is a `from` version; its `version` field is the `to` version.
- Collect the ordered list of migration steps that bridge local → remote.

Aggregate across all steps in the path:
- Union of all `regenerate` targets (deduplicated, order preserved)
- Concatenated `notes` (one line per step)
- `breaking: true` if any step is breaking
- Union of all `manual` items

Present the update summary:

```
## Forge Update Available

{LOCAL_VERSION} → {REMOTE_VERSION}

### What's new
{for each step in path:}
  • {version}: {notes}

### After install, Forge will regenerate
  {for each target in aggregated regenerate:}
  • {target}

{if breaking:}
### ⚠ Breaking changes — manual steps required
  {for each item in manual:}
  • {item}

### How to proceed
  [1] Install now — I'll guide you through it
  [2] Skip for now
```

If no migration path can be constructed (versions not in manifest), show
the notes that are available and note that a full regeneration may be needed.

Ask the user to choose. If they choose **[2]**, exit.

If they choose **[1]**, proceed:

### Guided install

Print:
```
Run this command to install the update:

  ! /plugin install Entelligentsia/forge

(The `!` prefix runs it in this session so I can detect when it completes.)

Tell me when the install is done, or paste the output.
```

Wait for the user to confirm the install completed.

---

## Step 3 — Verify installation

After the user confirms the install:

Re-read the local plugin version:
```
$FORGE_ROOT/.claude-plugin/plugin.json   →   extract "version"   →   NEW_LOCAL_VERSION
```

| Condition | Action |
|-----------|--------|
| `NEW_LOCAL_VERSION` == `REMOTE_VERSION` | Print "✓ Forge {NEW_LOCAL_VERSION} installed successfully." and proceed to **Step 4**. |
| `NEW_LOCAL_VERSION` == `LOCAL_VERSION` (unchanged) | Warn: "The plugin version hasn't changed ({LOCAL_VERSION}). The install may not have completed. Would you like to try again or continue anyway?" If user wants to continue, proceed to **Step 4** using available version. |
| `NEW_LOCAL_VERSION` is different but not `REMOTE_VERSION` | Print "Installed Forge {NEW_LOCAL_VERSION} (expected {REMOTE_VERSION}). Proceeding with {NEW_LOCAL_VERSION}." and continue to **Step 4**. |

Update `LOCAL_VERSION` to `NEW_LOCAL_VERSION` for subsequent steps.

---

## Step 4 — Apply migrations

Determine the baseline version:
- Use `migratedFrom` from `CACHE_FILE` (set in Step 1)
- Or the `--from <version>` argument if provided
- Or the pre-install `LOCAL_VERSION` (before Step 3 updated it)

If `LOCAL_VERSION` equals baseline, there are no migrations to apply — skip
to **Step 5**.

Read `$FORGE_ROOT/migrations.json` (local — now updated after install).

Walk the migration chain from baseline forward to `LOCAL_VERSION`:
- Each entry key is a `from` version; its `version` field is the `to` version.
- Collect the ordered list of migration steps that bridge baseline → current.
- If no path exists, warn:
  > No migration path found from {baseline} to {LOCAL_VERSION}. Running
  > `/forge:regenerate workflows tools` is recommended.
  Then exit.

Aggregate across all steps in the path:
- Union of all `regenerate` targets (deduplicated, order preserved)
- Concatenated `notes` (one line per step)
- `breaking: true` if any step is breaking
- Union of all `manual` items

### Confirm and regenerate

Print a migration summary:

```
## Applying Migrations: {baseline} → {LOCAL_VERSION}

Changes:
  {notes from each step, one per line}

Regeneration targets:
  {for each target:}
  • {target} — {description of what this regenerates}

{if breaking:}
⚠ Breaking changes — complete these manual steps first:
  {manual items}

Proceed? [Y/n]
```

If the user declines, exit without modifying anything.
If `breaking: true`, require the user to confirm they have completed the manual
steps before proceeding.

For each target in the aggregated regeneration list, invoke the equivalent of
`/forge:regenerate <target>` by reading and following
`$FORGE_ROOT/commands/regenerate.md` for that specific category.

Run non-knowledge-base targets first (tools, workflows, templates), then
knowledge-base sub-targets if present.

---

## Step 5 — Record state and summarise

Update the cache file to record the completed migration. Use `CACHE_FILE`
from Step 1. If the parent directory does not exist, create it with
`mkdir -p` before writing. Read the existing file if present, update
`migratedFrom` and `localVersion` to `LOCAL_VERSION`, and write it back.
Use the Write or Edit tool — do not run a shell command for this step.

If the cache file does not exist, create it with:
```json
{ "migratedFrom": "<LOCAL_VERSION>", "localVersion": "<LOCAL_VERSION>" }
```

Print the final summary:

```
## ✓ Forge {LOCAL_VERSION} — Update Complete

{if install happened:}
  Plugin updated: {old version} → {LOCAL_VERSION}
{end if}

{if migrations applied:}
  Migrations applied: {baseline} → {LOCAL_VERSION}
  Regenerated: {list of targets}
{end if}

Next steps:
  • Run /forge:health to verify knowledge base currency
  • Generated workflows and tools are ready to use
```

---

## Arguments

$ARGUMENTS

| Argument | Purpose |
|----------|---------|
| `--from <version>` | Override the migration baseline (useful when cache is missing or user jumped versions) |
| `--skip-check` | Skip the remote version check — only apply pending migrations from cache |

---

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
