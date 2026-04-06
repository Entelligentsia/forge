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
### △ Breaking changes — manual steps required
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
| `NEW_LOCAL_VERSION` == `REMOTE_VERSION` | Print "〇 Forge {NEW_LOCAL_VERSION} installed successfully." and proceed to **Step 4**. |
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
△ Breaking changes — complete these manual steps first:
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

## Step 5 — Custom pipeline command audit

This step runs whenever pipelines are configured. It detects non-standard phase
commands and offers targeted, per-item improvements with explicit confirmation
at every point. **Nothing is written without the user saying yes.**

### 5a — Locate tools

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

All tools are invoked directly from the plugin:
- `node "$FORGE_ROOT/tools/manage-config.cjs"`
- `node "$FORGE_ROOT/tools/generation-manifest.cjs"`

If `.forge/config.json` does not exist, skip this step and proceed to **Step 6**.

### 5b-pre — Check for orphaned generated command files

Before the pipeline audit, check for old-named generated command files that may
have been left behind by a rename migration.

For each filename in the **old command name list**
(`engineer.md`, `supervisor.md` — names retired in favour of `plan.md`,
`review-plan.md`, `review-code.md`), check if the file exists:

```sh
ls .claude/commands/{old-name}.md 2>/dev/null
```

For each found file, determine whether it is pristine or user-modified:

```sh
# If MANIFEST_TOOL is available:
node "$FORGE_ROOT/tools/generation-manifest.cjs" check .claude/commands/{old-name}.md
```

Report and offer:

**If pristine (exit 0) or untracked but content matches expected generated pattern:**
> 〇 `.claude/commands/{old-name}.md` — generated file, no user edits detected.
>    This file was renamed to `{new-name}.md` in a recent Forge update.
>    Safe to remove. Delete it? (yes / no)

**If modified (exit 1):**
> △ `.claude/commands/{old-name}.md` — manually modified since generation.
>    This file was renamed to `{new-name}.md` but contains your edits.
>    Review your changes and merge them into `.claude/commands/{new-name}.md` manually.
>    Delete the old file after migrating? (yes / no)

**If MANIFEST_TOOL is absent** — cannot verify; always ask before deleting:
> ── `.claude/commands/{old-name}.md` exists.
>    This file was renamed to `{new-name}.md`. Cannot verify if it has been modified
>    (generation-manifest tool not installed). Delete it? (yes / no / show contents)

Never delete without explicit confirmation.

### 5b — Check whether pipelines exist

```sh
node "$FORGE_ROOT/tools/manage-config.cjs" list-pipelines 2>/dev/null
```

If no pipelines are configured, skip to **Step 6**.

### 5c — Check for `paths.customCommands`

```sh
node "$FORGE_ROOT/tools/manage-config.cjs" get paths.customCommands 2>/dev/null
```

If the key is missing from config, offer to add it:

> ── New config field available: `paths.customCommands`
>    Default: `"engineering/commands"`
>    This is where `/forge:add-pipeline` places new custom phase command files.
>
>    Add it? (yes / no / use a different path)

If yes (or a path was given):
```sh
node "$FORGE_ROOT/tools/manage-config.cjs" set paths.customCommands "engineering/commands"
```

If no, note it and continue — the rest of the audit still runs.

### 5d — Identify non-built-in phase commands

Built-in command names — skip any phase whose `command` matches one of these:
`plan`, `review-plan`, `implement`, `review-code`, `approve`, `commit`

For each pipeline, read its full definition:
```sh
node "$FORGE_ROOT/tools/manage-config.cjs" pipeline get {NAME}
```

Collect every phase where `command` is **not** in the built-in list above.
Call this the **custom phase list**.

If the custom phase list is empty, print:
> 〇 No custom phase commands found — nothing to audit.

Then skip to **Step 6**.

### 5e — Audit each custom phase

Work through the custom phase list one at a time. For each entry:

**If `workflow` field is already set** — skip. It is already wired correctly.
Print: `〇 {pipeline} / phase {N} ({cmd}) — workflow field present, skipping.`

**If `workflow` field is NOT set** — check both standard locations for the file:
```sh
ls engineering/commands/{cmd}.md 2>/dev/null && echo "found:engineering"
ls .claude/commands/{cmd}.md 2>/dev/null && echo "found:claude"
```

Display findings:

> ── Pipeline `{pipeline}`, phase {N} (role: `{role}`) — command `{cmd}`
>    No `workflow` field set.
>
>    File locations checked:
>    {〇 / △}  engineering/commands/{cmd}.md
>    {〇 / △}  .claude/commands/{cmd}.md

Then branch on what was found:

---

**Case A — found in exactly one location (`{found_path}`)**

> The orchestrator can read this file directly if a `workflow` field is added.
>
> Preview:
> ```
> pipeline "{pipeline}", phase {N}: add "workflow": "{found_path}"
> ```
> Add the `workflow` field? (yes / no)

If yes, invoke:
```sh
node "$FORGE_ROOT/tools/manage-config.cjs" pipeline get {pipeline}
```
Reconstruct the full phases JSON with the `workflow` field added to phase {N},
then write:
```sh
node "$FORGE_ROOT/tools/manage-config.cjs" pipeline add {pipeline} --description "{desc}" --phases '{updated_phases_json}'
```

---

**Case B — found in both locations**

> The command file exists in two places:
>   1. `engineering/commands/{cmd}.md`
>   2. `.claude/commands/{cmd}.md`
>
> Which should the `workflow` field point to?
> (1 / 2 / neither — I'll handle this manually)

On 1 or 2, follow the same write flow as Case A with the chosen path.
On "neither", skip this phase — no config change.

---

**Case C — not found anywhere**

> △ No file found for command `{cmd}`.
>
> Options:
>   1. Create it now — run `/forge:add-pipeline` after this step and it will guide you
>   2. I'll create it manually and wire it later
>   3. This command is a slash command defined elsewhere — leave as-is
>
> (1 / 2 / 3)

For option 1: note it. After the audit finishes, remind the user:
> ── Run `/forge:add-pipeline` to create the missing command file(s) for: {list}

For options 2 and 3: skip, no change.

---

### 5f — Offer persona decoration (per-file, preview-first, never automatic)

After the `workflow` audit is complete, check each command file that was found
for missing persona symbols. Persona decoration is purely cosmetic — it is **always
optional and always skippable**.

For each found command file:

1. If `MANIFEST_TOOL` is available, check the file's manifest status first:
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" check {filepath}
   ```
   - Exit 0 (pristine) → file is unmodified; decoration offer is low-risk
   - Exit 1 (modified) → file has user edits; surface this before offering:
     > △ `{filepath}` has been manually modified — your edits will be preserved.
     >    The decoration only adds one line after `## Persona`.
   - Exit 2 (untracked) → no manifest baseline; offer normally
2. Read the file.
3. Find the `## Persona` heading (if any). If absent, skip this file.
4. Look at the first non-blank line after the heading. If it already begins with
   one of `🌱 🌿 ⛰️ 🌊 🍂 🍃`, skip — decoration already present.
5. Otherwise, propose a minimal decoration.

**Derive the decoration:**
- Symbol — based on the phase role in the pipeline:
  - `plan` / `implement` / `commit` → 🌱
  - `review-plan` / `review-code` → 🌿
  - `approve` → ⛰️
  - any other → 🌿
- Announcement line — take the existing first line of the Persona content and
  convert it to first-person present tense. Do not invent content; work with
  what is there. Keep it to one quiet sentence.

Show the user a precise diff — only the insertion point:

> ── `{filepath}` — Persona section found, no symbol line.
>
>    Proposed addition (one line only — nothing else changes):
>
>    ```diff
>      ## Persona
>    + {symbol} **{Project} {name}** — {announcement}
>    
>      {existing first line of persona content...}
>    ```
>
>    Apply? (yes / no / skip all remaining decoration)

If yes: prepend the symbol line immediately after the `## Persona` heading.
Touch **nothing else** in the file — not punctuation, not spacing, not other lines.

If "skip all remaining decoration": stop offering decoration for subsequent files.

---

## Step 6 — Record state and summarise

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
## 〇 Forge {LOCAL_VERSION} — Update Complete

{if install happened:}
  Plugin updated: {old version} → {LOCAL_VERSION}
{end if}

{if migrations applied:}
  Migrations applied: {baseline} → {LOCAL_VERSION}
  Regenerated: {list of targets}
{end if}

{if custom command audit ran:}
  Pipeline audit: {N} phase(s) reviewed
  {if workflow fields added:}  〇 workflow fields added: {list of pipeline/phase}  {end if}
  {if files missing:}  △ command files still needed: {list}  {end if}
{end if}

── Next steps:
   • Run /forge:health to verify knowledge base currency
   • Generated workflows and tools are ready to use
   {if files missing:}• Run /forge:add-pipeline to create missing command file(s){end if}
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
