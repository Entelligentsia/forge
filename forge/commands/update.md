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

Detect install mode:

```
IS_CANARY = FORGE_ROOT does not contain "/.claude/plugins/cache/"
```

- **Marketplace install** (`IS_CANARY = false`): plugin lives in the Claude Code
  cache and is updated via the plugin manager.
- **Canary / source install** (`IS_CANARY = true`): plugin is loaded directly
  from a local source directory. The source is already at the correct version —
  there is nothing to install. Only migration steps apply.

---

## Step 1 — Check for updates

Read `$FORGE_ROOT/.claude-plugin/plugin.json`. Extract `"version"` → `LOCAL_VERSION`.

Determine the distribution from `FORGE_ROOT` path — the cache path encodes the
marketplace name and is more reliable than reading fields from `plugin.json`:

| FORGE_ROOT contains | Distribution | UPDATE_URL | MIGRATIONS_URL |
|---------------------|-------------|------------|----------------|
| `/cache/skillforge/forge/` | `forge@skillforge` | `https://raw.githubusercontent.com/Entelligentsia/skillforge/main/forge/forge/.claude-plugin/plugin.json` | `https://raw.githubusercontent.com/Entelligentsia/skillforge/main/forge/forge/migrations.json` |
| anything else | `forge@forge` / canary | read `updateUrl` from `plugin.json`, fallback `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json` | read `migrationsUrl` from `plugin.json`, fallback `https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/migrations.json` |

Set `UPDATE_URL`, `MIGRATIONS_URL`, and `DISTRIBUTION` accordingly before fetching.

Also read `distribution` from `.forge/update-check-cache.json` → `PRIOR_DISTRIBUTION`.
If the file doesn't exist or the field is absent, set `PRIOR_DISTRIBUTION = DISTRIBUTION`.

Fetch the **remote** plugin manifest to get the latest available version.
Use the WebFetch tool (preferred) or `curl` via Bash:

```
URL: {UPDATE_URL}
```

Parse the response JSON and extract the `version` field → `REMOTE_VERSION`.

If the fetch fails (network error, timeout), warn the user:
> Could not reach GitHub to check for updates. Proceeding with local version only.

Then skip to **Step 3** (apply pending migrations if any).

### Determine update status

Read the migration baseline from the project-scoped update-check cache:

```
CACHE_FILE = .forge/update-check-cache.json
```

This file is project-scoped — each project maintains its own migration state.
Read it if it exists. Extract `migratedFrom` from the JSON. If absent, fall
back to `localVersion` from the file. If both are absent, use `LOCAL_VERSION`.

> **Legacy fallback:** If `.forge/update-check-cache.json` does not exist but a
> plugin-level cache does (`${CLAUDE_PLUGIN_DATA}/forge-plugin-data/update-check-cache.json`
> or `/tmp/forge-plugin-data/update-check-cache.json`), read `migratedFrom` from
> there as a one-time migration. Step 6 will write the project-scoped file going forward.

The user can also pass `--from <version>` as an argument to set the baseline
explicitly — this overrides any cached value.

Now evaluate — **stop at the first matching row and follow only that row's action**:

| # | Condition | Action |
|---|-----------|--------|
| 1 | `REMOTE_VERSION` == `LOCAL_VERSION` and `LOCAL_VERSION` == baseline | Print "Forge {LOCAL_VERSION} — up to date. No pending migrations." and **exit**. |
| 2 | `REMOTE_VERSION` == `LOCAL_VERSION` and `LOCAL_VERSION` != baseline | Jump to **Step 2B** (project migration — no install needed). |
| 3 | `IS_CANARY` is true | Jump to **Step 2B** (canary — no install needed). |
| 4 | `REMOTE_VERSION` != `LOCAL_VERSION` | Proceed to **Step 2A** (plugin update available). |

**Do NOT show an install prompt for rows 1, 2, or 3. Install prompts only appear in Step 2A.**

---

## Step 2A — Plugin update available

> **Only reached when `REMOTE_VERSION` != `LOCAL_VERSION` (row 4 above).**

Fetch the **remote** migrations manifest from GitHub:

```
URL: {MIGRATIONS_URL}
```

Parse the response JSON. Walk the migration chain from `LOCAL_VERSION` forward
to `REMOTE_VERSION`. Aggregate across all steps:
- Union of all `regenerate` targets, applying the dominance rule: for each
  category (`workflows`, `knowledge-base`, `commands`), if any step lists a
  bare category name (e.g. `"workflows"`), that category is flagged for full
  rebuild. If all steps for a category use sub-targets (e.g.
  `"workflows:plan_task"`), collect the union of those sub-targets
  (deduplicated, order preserved).
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
  {for each category in aggregated result:}
  {if full rebuild:}
  • {category}: (full rebuild)
  {else:}
  • {category}: {sub-target1}, {sub-target2}, ...

{if breaking:}
### △ Breaking changes — manual steps required
  {for each item in manual:}
  • {item}

### How to proceed
  [1] Install now — I'll guide you through it
  [2] Skip for now
```

If no migration path can be constructed, show available notes and recommend
`/forge:regenerate workflows`.

Ask the user to choose. If they choose **[2]**, exit.

If they choose **[1]**, proceed to **Guided install** below.

### Guided install

**If `IS_CANARY` is true** (safety net — should have been caught by row 3):

Print:
```
Canary install detected — FORGE_ROOT is a local source directory, not the
plugin cache. There is nothing to install via the plugin manager.

Your source is already at {LOCAL_VERSION}. Proceeding directly to migrations.
```

Jump to **Step 4**.

**If `IS_CANARY` is false (marketplace install):**

Print:
```
To install the update:

  1. Run /plugin to open the plugin manager
  2. Find Forge in your installed plugins and update it

Tell me when the install is done.
```

Wait for the user to confirm the install completed.

---

## Step 2B — Project migration pending (plugin already current)

> **Only reached from rows 2 or 3 — the plugin is already at the right version.**
> **Do NOT show an install prompt here. There is nothing to install.**

Read `$FORGE_ROOT/migrations.json` (local).

Walk the migration chain from `baseline` forward to `LOCAL_VERSION`. Aggregate:
- Union of all `regenerate` targets, applying the dominance rule: for each
  category (`workflows`, `knowledge-base`, `commands`), if any step lists a
  bare category name (e.g. `"workflows"`), that category is flagged for full
  rebuild. If all steps for a category use sub-targets (e.g.
  `"workflows:plan_task"`), collect the union of those sub-targets
  (deduplicated, order preserved).
- Concatenated `notes`
- `breaking: true` if any step is breaking
- Union of all `manual` items

Print:

```
## Forge {LOCAL_VERSION} — Plugin up to date

Your project was last migrated at {baseline}. The following changes need
to be applied to this project's generated files:

### Changes since {baseline}
{for each step in path:}
  • {version}: {notes}

### Will regenerate
  {for each category in aggregated result:}
  {if full rebuild:}
  • {category}: (full rebuild)
  {else:}
  • {category}: {sub-target1}, {sub-target2}, ...

{if breaking:}
### △ Breaking changes — complete these steps first:
  {for each item in manual:}
  • {item}

Apply migrations now? [Y/n]
```

If the user declines, exit without changes.
If `breaking: true`, confirm they have completed the manual steps first.

Then jump to **Step 4** to execute the regeneration.

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

Before walking the migration chain, check for a cross-distribution downgrade:
if `PRIOR_DISTRIBUTION` ≠ `DISTRIBUTION` and baseline appears higher than
`LOCAL_VERSION` (e.g. baseline is `1.1.0` and `LOCAL_VERSION` is `1.0.5`):

> The migration baseline ({baseline}) was set on **{PRIOR_DISTRIBUTION}** and is
> higher than the current plugin version ({LOCAL_VERSION} on {DISTRIBUTION}).
> The {PRIOR_DISTRIBUTION} migration chain does not exist in {DISTRIBUTION}'s
> migrations.json — walking it would fail.
>
> Reset migration baseline to {LOCAL_VERSION} and regenerate workflows to match
> the current installed version? This is safe — it re-generates files from the
> installed plugin, discarding the unreachable canary state. [Y/n]

If yes: set `baseline = LOCAL_VERSION`. If baseline now equals `LOCAL_VERSION`,
there are no migrations to apply — skip directly to **Step 6**.

If no: exit without changes.

Walk the migration chain from baseline forward to `LOCAL_VERSION`:
- Each entry key is a `from` version; its `version` field is the `to` version.
- Collect the ordered list of migration steps that bridge baseline → current.
- If no path exists, warn:
  > No migration path found from {baseline} to {LOCAL_VERSION}. Running
  > `/forge:regenerate workflows` is recommended.
  Then exit.

Aggregate across all steps in the path, applying the dominance rule:
- For each category (`workflows`, `knowledge-base`, `commands`):
  - If ANY step has a bare entry for this category → full rebuild for that category.
  - Otherwise → union of all sub-targets across all steps (deduplicated, order preserved).
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
  {for each category in aggregated result:}
  {if full rebuild:}
  • {category}: (full rebuild)
  {else:}
  • {category}: {sub-target1}, {sub-target2}, ...

{if breaking:}
△ Breaking changes — complete these manual steps first:
  {manual items}

Proceed? [Y/n]
```

If the user declines, exit without modifying anything.
If `breaking: true`, require the user to confirm they have completed the manual
steps before proceeding.

For each category in the aggregated result, invoke `/forge:regenerate` by
reading and following `$FORGE_ROOT/commands/regenerate.md`:
- If flagged for full rebuild: invoke `/forge:regenerate <category>`
- If sub-targets collected: invoke `/forge:regenerate <category> <sub-target>`
  for each sub-target in order

Run non-knowledge-base targets first (workflows, templates, commands), then
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

### 5b-pre — Check for retired generated files

This step runs on every update, regardless of version. It checks for known
retired filenames that Forge no longer generates. These may exist on any
project that was initialised before a rename — including projects that ran
a prior update before this check was added.

Check both slash commands (`.claude/commands/`) and workflow files
(`.forge/workflows/`).

#### Old command files

The retired list is **exact** — only these two files, nothing else:
- `engineer.md` → retired in favour of `plan.md`
- `supervisor.md` → retired in favour of `review-plan.md` / `review-code.md`

Do NOT match partial names, prefixes, or variants (`supervisor-code.md`,
`engineer-security.md`, etc.) — those are custom commands and must not be touched.

For each filename in the retired list, check if the file exists:

```sh
ls .claude/commands/{old-name}.md 2>/dev/null
```

For each found file, determine whether it is pristine or user-modified:

```sh
node "$FORGE_ROOT/tools/generation-manifest.cjs" check .claude/commands/{old-name}.md
```

Report and offer:

**If pristine (exit 0) or untracked:**
> 〇 `.claude/commands/{old-name}.md` — generated file, no user edits detected.
>    This file was renamed to `{new-name}.md` in a recent Forge update.
>    Safe to remove. Delete it? (yes / no)

**If modified (exit 1):**
> △ `.claude/commands/{old-name}.md` — manually modified since generation.
>    This file was renamed to `{new-name}.md` but contains your edits.
>    Review your changes and merge them into `.claude/commands/{new-name}.md` manually.
>    Delete the old file after migrating? (yes / no)

**If generation-manifest tool is absent** — cannot verify; always ask before deleting:
> ── `.claude/commands/{old-name}.md` exists.
>    This file was renamed to `{new-name}.md`. Cannot verify if it has been modified.
>    Delete it? (yes / no / show contents)

#### Old workflow files

For each filename in the **old workflow name list**, check if it exists:

```
engineer_plan_task.md        → renamed to plan_task.md
engineer_implement_plan.md   → renamed to implement_plan.md
engineer_commit_task.md      → renamed to commit_task.md
engineer_update_plan.md      → renamed to update_plan.md
engineer_update_implementation.md → renamed to update_implementation.md
engineer_fix_bug.md          → renamed to fix_bug.md
supervisor_review_plan.md    → renamed to review_plan.md
supervisor_review_implementation.md → renamed to review_code.md
```

```sh
ls .forge/workflows/{old-name}.md 2>/dev/null
```

For each found file, check manifest status:

```sh
node "$FORGE_ROOT/tools/generation-manifest.cjs" check .forge/workflows/{old-name}.md
```

**If pristine or untracked:**
> 〇 `.forge/workflows/{old-name}.md` — generated file, no user edits.
>    The orchestrator now reads `.forge/workflows/{new-name}.md` instead.
>    Safe to remove. Delete it? (yes / no)

**If modified (exit 1):**
> △ `.forge/workflows/{old-name}.md` — manually modified since generation.
>    The orchestrator now uses `.forge/workflows/{new-name}.md`.
>    Merge your changes into the new file before deleting.
>    Delete the old file? (yes / no)

**If generation-manifest tool is absent:**
> ── `.forge/workflows/{old-name}.md` exists. Cannot verify if modified.
>    Delete it? (yes / no / show contents)

Never delete without explicit confirmation.

### 5b-rename — Rename retired built-in command names in pipeline config

This step runs on every update. Scan every configured pipeline for phases
that use retired built-in command names. These were renamed in 0.5.0 but
`config.json` is never auto-rewritten — the update must offer to fix them.

**Retired command name map** (command → replacement, derived from the phase `role`):

| Retired command | Role | Replacement |
|----------------|------|-------------|
| `engineer` | `plan` | `plan` |
| `supervisor` | `review-plan` | `review-plan` |
| `supervisor` | `review-code` | `review-code` |

Read all pipelines:
```sh
node "$FORGE_ROOT/tools/manage-config.cjs" list-pipelines 2>/dev/null
```

For each pipeline, read its full phase list:
```sh
node "$FORGE_ROOT/tools/manage-config.cjs" pipeline get {NAME}
```

Collect every phase where `command` is `engineer` or `supervisor`.
If none found across all pipelines, skip to **Step 5b**.

For each affected pipeline, show a diff preview of all changes at once:

> ── Pipeline `{name}` — {N} phase(s) use retired command names:
>
> ```diff
> - {"command": "engineer",  "role": "plan",        "model": "sonnet"}
> + {"command": "plan",      "role": "plan",        "model": "sonnet"}
>
> - {"command": "supervisor","role": "review-plan", "model": "opus"}
> + {"command": "review-plan","role": "review-plan","model": "opus"}
> ```
>
> Update this pipeline? (yes / no)

If yes: reconstruct the full phases JSON with the renamed commands and write:
```sh
node "$FORGE_ROOT/tools/manage-config.cjs" pipeline add {NAME} --description "{desc}" --phases '{updated_phases_json}'
```

Print `〇 Pipeline '{name}' updated.` on success.

Do not rename any command that is not in the retired list above — custom
commands like `supervisor-code` or `engineer-security` are left as-is.

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
`plan`, `review-plan`, `implement`, `review-code`, `validate`, `approve`, `commit`

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

**Refresh `paths.forgeRoot` in `.forge/config.json`:**

```sh
node "$FORGE_ROOT/tools/manage-config.cjs" set paths.forgeRoot "$FORGE_ROOT"
```

This ensures generated workflows reference the correct tool path after
distribution switches or reinstalls. `FORGE_ROOT` was captured at the top of
this command from `CLAUDE_PLUGIN_ROOT` and is always current.

**Write `.forge/update-check-cache.json`** to record the completed migration.
Read the existing file if present, update `migratedFrom`, `localVersion`,
`distribution`, and `forgeRoot`, then write it back. Use the Write or Edit
tool — do not run a shell command for this step. The `.forge/` directory always
exists at this point (it was checked earlier), so no `mkdir -p` is needed.

If the file does not exist, create it with:
```json
{
  "migratedFrom": "<LOCAL_VERSION>",
  "localVersion": "<LOCAL_VERSION>",
  "distribution": "<DISTRIBUTION>",
  "forgeRoot": "<FORGE_ROOT>"
}
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
