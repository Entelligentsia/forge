---
name: regenerate
description: Use when the engineering knowledge base has been enriched by sprints and you want to refresh the generated workflows, templates, tools, or knowledge-base docs
---

# /forge:regenerate

Re-run generation phases using the current state of the project.

## Locate the Forge plugin

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

Read `.forge/config.json`. If it does not exist, stop and tell the user to run
`/forge:init` first.

Resolve tools from the plugin:
```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

All tool invocations in this command use `node "$FORGE_ROOT/tools/<tool>.cjs"`.

## Hero

Open the run with the forge hero + a one-line subtitle (parses
`$ARGUMENTS` to mention the target):

```sh
node "$FORGE_ROOT/tools/banners.cjs" forge
node "$FORGE_ROOT/tools/banners.cjs" --subtitle "Re-running generation against current meta-definitions ($ARGUMENTS or full)"
```

Each category section below opens with a `banners.cjs --badge {key}` call
before its "Generating ..." line. The badge map:

| Category | Banner key |
|----------|-----------|
| personas | `bloom` |
| skills | `tide` |
| templates | `drift` |
| workflows | `ember` |
| commands | `lumen` |
| knowledge-base | `oracle` |

`banners.cjs` strips ANSI in `NO_COLOR` / non-tty / `--plain` contexts.

## Fast-mode awareness

Regenerate respects `.forge/config.json` `mode`. Read it once at the top of
the command and reuse:

```sh
CONFIG_MODE=$(node "$FORGE_ROOT/tools/manage-config.cjs" get mode 2>/dev/null || echo "full")
```

If `CONFIG_MODE` is not `"fast"` (i.e. `"full"` or anything else), every
category below behaves exactly as it always has — no filtering, no mode
write. The fast-mode handling only kicks in when `CONFIG_MODE == "fast"`.

### Materialized detection (fast mode only)

A target file is **materialized** if:

| Namespace | Materialized if… |
|---|---|
| `.forge/workflows/<id>.md` | File exists AND its first non-blank line does not begin with `<!-- FORGE FAST-MODE STUB` |
| `.forge/personas/<role>.md` | File exists |
| `.forge/skills/<role>-skills.md` | File exists |
| `.forge/templates/<STEM>.md` | File exists |
| `.claude/commands/<name>` | Always present in fast mode — no filter needed |

For each meta source enumerated below, derive the target path using the
existing single-file mapping rules in each category and apply the test.

The stub sentinel `<!-- FORGE FAST-MODE STUB` is written by `/forge:init`
Phase 7 fast branch — see `forge/init/sdlc-init.md`.

### Single-file variants in fast mode

For any single-file invocation (e.g. `/forge:regenerate workflows:plan_task`)
where `CONFIG_MODE == "fast"`:
- If the target is materialized → regenerate as normal.
- If the target is a stub or missing → emit
  `〇 Fast mode: <path> is a stub and will self-refresh on first use. Nothing to regenerate.`
  and exit 0 (no manifest changes).

### Default (no-args) in fast mode

The default run filters every category through the materialized check and
emits a per-category summary footer. **It does NOT write `mode`** — mode
promotion is a separate, explicit decision owned by `/forge:config mode full`.

## Arguments

$ARGUMENTS

Parse the argument to identify the target category and optional sub-target.
Sub-targets may be passed either as a second positional argument or embedded
with a colon delimiter (both forms are equivalent):

```
/forge:regenerate                              # workflows + commands + templates + personas (default)
/forge:regenerate personas                    # .forge/personas/ — all persona files
/forge:regenerate personas engineer           # single persona file only
/forge:regenerate personas:engineer           # same — colon form (from migration entries)
/forge:regenerate skills                        # .forge/skills/ role-specific skills
/forge:regenerate skills engineer              # single skill file only
/forge:regenerate skills:engineer              # same — colon form (from migration entries)
/forge:regenerate workflows                    # full workflow rebuild
/forge:regenerate workflows plan_task          # single workflow file only
/forge:regenerate workflows:plan_task          # same — colon form (from migration entries)
/forge:regenerate workflows sprint_plan        # single workflow file only
/forge:regenerate commands                     # .claude/commands/ slash command wrappers
/forge:regenerate templates                    # document templates only
/forge:regenerate templates PLAN_TEMPLATE      # single template file only
/forge:regenerate templates:PLAN_TEMPLATE      # same — colon form (from migration entries)
/forge:regenerate knowledge-base               # all three sub-targets (merge mode)
/forge:regenerate knowledge-base architecture
/forge:regenerate knowledge-base:architecture  # colon form (from migration entries)
/forge:regenerate knowledge-base business-domain
/forge:regenerate knowledge-base stack-checklist
```

When parsing the argument, split on `:` first: if the argument is
`"workflows:plan_task"`, treat it as category=`workflows`,
sub-target=`plan_task`. If no `:` is present, the second positional word
(if any) is the sub-target. The sub-target is always optional.

---

## Category: `personas` — full rebuild or single file

Re-generate `.forge/personas/` from the meta-persona definitions and the current knowledge base.

**If a sub-target is provided** (e.g. `/forge:regenerate personas engineer`
or the colon form `personas:engineer`), regenerate only the single persona
file `.forge/personas/<sub-target>.md` from `$FORGE_ROOT/meta/personas/meta-<sub-target>.md`.

If `CONFIG_MODE == "fast"`: apply the single-file materialized check
(persona is materialized iff `.forge/personas/<sub-target>.md` exists). If
not materialized, emit the stub-or-missing message and exit 0. Otherwise
proceed.

Before writing, remove any existing manifest entry for this specific file (handles rename case):
```sh
node "$FORGE_ROOT/tools/generation-manifest.cjs" remove .forge/personas/<sub-target>.md 2>/dev/null || true
```
Generate the single file (no fan-out needed for one file). All manifest and hash
steps below apply to that single file.

**If no sub-target** — full rebuild, fanned out in parallel:

1. Build the project brief:
   ```sh
   node "$FORGE_ROOT/tools/build-init-context.cjs" \
     --config .forge/config.json --personas .forge/personas \
     --templates .forge/templates --kb "$(node "$FORGE_ROOT/tools/manage-config.cjs" get paths.engineering 2>/dev/null || echo engineering)" \
     --out .forge/init-context.md --json-out .forge/init-context.json
   ```
2. Enumerate `$FORGE_ROOT/meta/personas/meta-*.md` (exclude README.md).
   Let `M_total` = the enumerated count.

   **If `CONFIG_MODE == "fast"`**: filter the enumeration to only entries
   whose target file `.forge/personas/<role>.md` exists (materialized check).
   Let `N_materialized` = the filtered count.
   - If `N_materialized == 0`: emit `〇 Fast mode: no materialized personas to regenerate.` and return 0 (no manifest changes).
   - Otherwise continue with the filtered set; do NOT clear the namespace
     (skip step 4) — clearing would remove manifest entries for stubs/missing
     entries that we are intentionally leaving alone. Instead, only `remove`
     manifest entries for the files we are about to regenerate (mirrors the
     single-file pattern):
     ```sh
     for each filtered entry:
       node "$FORGE_ROOT/tools/generation-manifest.cjs" remove .forge/personas/<role>.md 2>/dev/null || true
     ```

3. Render the personas badge, then emit the count:
   ```sh
   node "$FORGE_ROOT/tools/banners.cjs" --badge bloom
   ```
   Then emit: `Generating personas (<N> files in parallel)...` — use `N_materialized` in fast mode, `M_total` in full mode.
4. **Full mode only**: clear stale entries (skip in fast mode — see step 2):
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" clear-namespace .forge/personas/
   ```
5. **Spawn the persona subagents in a SINGLE Agent tool message** using
   `$FORGE_ROOT/init/generation/generate-persona.md` as the per-subagent rulebook
   (same fan-out pattern as `/forge:init` Phase 4). Spawn one per filtered
   entry — every entry in fast mode, every meta source in full mode.
6. Collect results. For each `done:` result → emit `  〇 <filename>.md`.
   Retry failures once. Any still failing: surface the id list.
7. Emit `  〇 personas — <N> files written` (fast mode appends ` (M-N deferred)` when `N < M`).

---

## Category: `skills` — full rebuild or single file

Re-generate `.forge/skills/` from the meta-skill templates and project config.

**If a sub-target is provided** (e.g. `/forge:regenerate skills engineer`
or the colon form `skills:engineer`), regenerate only the single skill file
`.forge/skills/<sub-target>-skills.md` from
`$FORGE_ROOT/meta/skills/meta-<sub-target>-skills.md`.

If `CONFIG_MODE == "fast"`: apply the single-file materialized check
(skill is materialized iff `.forge/skills/<sub-target>-skills.md` exists).
If not materialized, emit the stub-or-missing message and exit 0. Otherwise
proceed.

Before writing, remove any existing manifest entry for this specific file:
```sh
node "$FORGE_ROOT/tools/generation-manifest.cjs" remove .forge/skills/<sub-target>-skills.md 2>/dev/null || true
```
Generate the single file (no fan-out needed). All manifest and hash steps below
apply to that single file.

**If no sub-target** — full rebuild, fanned out in parallel:

1. Build the project brief (same command as in `personas` above).
2. Enumerate `$FORGE_ROOT/meta/skills/meta-*-skills.md`. Let `M_total` =
   the enumerated count.

   **If `CONFIG_MODE == "fast"`**: filter to entries whose target file
   `.forge/skills/<role>-skills.md` exists. Let `N_materialized` = filtered
   count.
   - If `N_materialized == 0`: emit `〇 Fast mode: no materialized skills to regenerate.` and return 0.
   - Otherwise continue with the filtered set; skip step 4 (do not clear
     namespace), and `remove` manifest entries only for the filtered files.

3. Render the skills badge, then emit the count:
   ```sh
   node "$FORGE_ROOT/tools/banners.cjs" --badge tide
   ```
   Then emit: `Generating skills (<N> files in parallel)...`
4. **Full mode only**: clear stale entries (skip in fast mode):
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" clear-namespace .forge/skills/
   ```
5. **Spawn the skill subagents in a SINGLE Agent tool message** using
   `$FORGE_ROOT/init/generation/generate-skill.md` as the per-subagent rulebook.
6. Collect results. Retry failures once. Any still failing: surface the id list.
7. For each completed file, check manifest (warn on modified), emit `  〇 <filename>.md`.
   Fast mode appends `〇 skills — <N> files written (M-N deferred)` when `N < M`.

---

## Category: `workflows` — full rebuild or single file

Re-generate `.forge/workflows/` from the meta-workflow definitions and the
current knowledge base. Covers both atomic workflows and orchestration.

**If a sub-target is provided** (e.g. `/forge:regenerate workflows plan_task`
or the colon form `workflows:plan_task`), regenerate only the single workflow
file `.forge/workflows/<sub-target>.md`.

If `CONFIG_MODE == "fast"`: apply the single-file materialized check —
the workflow file must exist AND its first non-blank line must NOT begin
with `<!-- FORGE FAST-MODE STUB`. If the file is a stub or missing, emit
the stub-or-missing message and exit 0. Otherwise proceed.

Before writing, remove any existing
manifest entry for this specific file:
```sh
node "$FORGE_ROOT/tools/generation-manifest.cjs" remove .forge/workflows/<sub-target>.md 2>/dev/null || true
```
Generate the single file (no fan-out needed). Check manifest (warn on modified),
write, record hash.

**If no sub-target** — full rebuild using the same parallel fan-out as `/forge:init` Phase 7:

1. Build the project brief:
   ```sh
   node "$FORGE_ROOT/tools/build-init-context.cjs" \
     --config .forge/config.json --personas .forge/personas \
     --templates .forge/templates \
     --kb "$(node "$FORGE_ROOT/tools/manage-config.cjs" get paths.engineering 2>/dev/null || echo engineering)" \
     --out .forge/init-context.md --json-out .forge/init-context.json
   ```
2. Read `$FORGE_ROOT/init/workflow-gen-plan.json` (16-entry fan-out table).
   Let `M_total` = the entry count.

   **If `CONFIG_MODE == "fast"`**: filter to entries whose target file
   `.forge/workflows/<id>.md` is materialized (exists AND first non-blank
   line does not begin with `<!-- FORGE FAST-MODE STUB`).
   Let `N_materialized` = filtered count.
   - If `N_materialized == 0`: emit `〇 Fast mode: no materialized workflows to regenerate.` and return 0 (no manifest changes, orchestration skipped — orchestration only makes sense with a complete workflow set).
   - Otherwise continue with the filtered set.

3. Render the workflows badge, then emit the count:
   ```sh
   node "$FORGE_ROOT/tools/banners.cjs" --badge ember
   ```
   Then emit: `Generating workflows (<N> atomic + orchestration, parallel)...` —
   in fast mode, omit the orchestration suffix when filtering applies.
4. Check each (filtered) file for manual modifications before any clearing:
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" check .forge/workflows/{filename}.md
   ```
   For any exit 1 (modified): warn `△ .forge/workflows/{filename}.md has been manually
   modified. Overwriting will discard your changes. Proceed? (yes / no / show diff)`
   Collect answers before proceeding.
5. **Full mode only**: clear stale entries (skip in fast mode — clearing
   would drop manifest entries for stubs we are intentionally leaving alone):
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" clear-namespace .forge/workflows/
   ```
   In fast mode, only `remove` manifest entries for the filtered files
   that are about to be regenerated.
6. **Spawn the atomic workflow subagents in a SINGLE Agent tool message** using
   `$FORGE_ROOT/init/generation/generate-workflows.md` as the per-subagent rulebook
   (same fan-out pattern as `/forge:init` Phase 7d). Spawn one per filtered
   entry.
7. Collect results. Retry failures once in a single Agent call.
8. **Full mode only**: spawn orchestration subagent. **In fast mode this
   step is skipped** — orchestration depends on the complete workflow set
   being present and refreshed; running it against a partially materialised
   project would produce stale references. Orchestration files
   (`orchestrate_task.md`, `run_sprint.md`) refresh on full promotion or
   when workflows is fully rebuilt.
   ```
   Read $FORGE_ROOT/init/generation/generate-orchestration.md and follow it.
   FORGE_ROOT: {FORGE_ROOT}
   Input: $FORGE_ROOT/meta/workflows/meta-orchestrate.md + .forge/workflows/
   Output: .forge/workflows/orchestrate_task.md and .forge/workflows/run_sprint.md
   ```
9. For each written file: record hash `node "$FORGE_ROOT/tools/generation-manifest.cjs" record .forge/workflows/{filename}.md`
10. Emit `  〇 workflows — <N> files written` (full mode: 18; fast mode:
    `〇 workflows — N of M files regenerated (others remain as stubs)`).

**Do NOT touch:** `.claude/commands/`, `.forge/config.json`, or any knowledge base file.

---

## Category: `commands` — full rebuild

Re-generate `.claude/commands/` slash command wrappers from the current
`.forge/workflows/`. This is a thin generation step — each command file
is just a wrapper that loads its workflow and passes arguments.

Run this when:
- Workflow files have been renamed (e.g. after a 0.5.0 upgrade)
- A new workflow was added and its command wrapper is missing
- A command wrapper is pointing at a workflow that no longer exists

1. Read `.forge/config.json` for paths
2. Enumerate `.forge/workflows/` to know what workflow files currently exist
3. Render the commands badge, then emit the count:
   ```sh
   node "$FORGE_ROOT/tools/banners.cjs" --badge lumen
   ```
   Then emit: `Generating commands (<N> files)...`
4. Clear stale entries for this namespace:
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" clear-namespace .claude/commands/
   ```
5. Re-generate `.claude/commands/` following
   `$FORGE_ROOT/init/generation/generate-commands.md`
   The idempotency check will overwrite any command that references a
   missing or renamed workflow, and skip any that are already correct.
6. For each file being written:
   - Emit: `  ⋯ <filename>.md...`
   - Write the file
   - Record hash: `node "$FORGE_ROOT/tools/generation-manifest.cjs" record .claude/commands/{filename}.md`
   - Emit: `  〇 <filename>.md`

**DO NOT** touch any `.claude/commands/` file that is not in the output list
in `generate-commands.md`. Custom commands (`supervisor-code.md`, project-specific
wrappers, etc.) must never be written, overwritten, or deleted by this step.
Retired Forge command files (`engineer.md`, `supervisor.md`) are cleaned up
separately by Step 5b-pre in `/forge:update` — not here.

---

## Category: `templates` — full rebuild or single file

Re-generate `.forge/templates/` from the meta-template definitions and the
current knowledge base.

**If a sub-target is provided** (e.g. `/forge:regenerate templates PLAN_TEMPLATE`
or the colon form `templates:PLAN_TEMPLATE`), regenerate only the single template
file `.forge/templates/<sub-target>.md`. Determine the source meta file from
`$FORGE_ROOT/init/generation/generate-template.md`'s filename mapping (e.g.
`PLAN_TEMPLATE` → `meta-plan.md`).

If `CONFIG_MODE == "fast"`: apply the single-file materialized check
(template is materialized iff `.forge/templates/<sub-target>.md` exists).
If not materialized, emit the stub-or-missing message and exit 0. Otherwise
proceed.

Before writing, remove any existing manifest
entry:
```sh
node "$FORGE_ROOT/tools/generation-manifest.cjs" remove .forge/templates/<sub-target>.md 2>/dev/null || true
```
Generate the single file (no fan-out needed). Record hash after writing.

**If no sub-target** — full rebuild, fanned out in parallel:

1. Build the project brief (same command as in `personas` above).
2. Enumerate `$FORGE_ROOT/meta/templates/meta-*.md`. Let `M_total` =
   the enumerated count.

   **If `CONFIG_MODE == "fast"`**: filter to entries whose target file
   `.forge/templates/<STEM>.md` exists (use the same filename mapping as
   the single-file variant). Let `N_materialized` = filtered count.
   - If `N_materialized == 0`: emit `〇 Fast mode: no materialized templates to regenerate.` and return 0.
   - Otherwise continue with the filtered set; skip step 5 (do not clear
     namespace), and only `remove` manifest entries for the filtered files.

3. Render the templates badge, then emit the count:
   ```sh
   node "$FORGE_ROOT/tools/banners.cjs" --badge drift
   ```
   Then emit: `Generating templates (<N> files in parallel)...`
4. Check each (filtered) file for manual modifications (warn on modified, same pattern as workflows).
5. **Full mode only**: clear stale entries (skip in fast mode):
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" clear-namespace .forge/templates/
   ```
6. **Spawn the template subagents in a SINGLE Agent tool message** using
   `$FORGE_ROOT/init/generation/generate-template.md` as the per-subagent rulebook.
7. Collect results. Retry failures once. Any still failing: surface the id list.
8. For each written file: record hash, emit `  〇 <filename>.md`.
9. Re-record the one-shot init artifact not regenerated from a meta file:
   ```sh
   if [ -f ".forge/templates/CUSTOM_COMMAND_TEMPLATE.md" ]; then
     node "$FORGE_ROOT/tools/generation-manifest.cjs" record .forge/templates/CUSTOM_COMMAND_TEMPLATE.md
   fi
   ```
   Fast-mode footer: emit `〇 templates — <N> files written (M-N deferred)` when `N < M`.

---

## Category: `knowledge-base` — merge mode

**This is not a full rebuild.** The knowledge base accumulates writeback from
every sprint. Overwriting it from scratch destroys that accumulated knowledge.

Render the knowledge-base badge, then emit the status line:

```sh
node "$FORGE_ROOT/tools/banners.cjs" --badge oracle
```

Then emit: `Generating knowledge-base...`

Instead: re-run the relevant discovery prompts scoped to what has changed,
compute a delta against the existing docs, and merge only new content in.

**Per sub-target, emit merge-level status lines (not per-file):**

```
  ⋯ merging <sub-target> docs...
  〇 <sub-target> — N additions
```

**Merge rule (applies to all sub-targets):**
- Additive only — never remove or overwrite existing sections or entries.
- `[?]` markers from prior generation may be updated if the re-scan can now
  confirm or correct them.
- If the re-scan detects something that contradicts existing content, flag it
  as a `[CONFLICT]` comment for human review — do not resolve it silently.
- Show all proposed additions as a diff and prompt before writing.

---

### Sub-target: `architecture`

**Trigger:** new subsystems, services, or integrations have been added to the
codebase since the architecture docs were last written.

**Re-run discovery (in parallel):**
- `$FORGE_ROOT/init/discovery/discover-stack.md`
- `$FORGE_ROOT/init/discovery/discover-processes.md`
- `$FORGE_ROOT/init/discovery/discover-routing.md`

**Read existing docs:**
- `engineering/architecture/*.md`

**Merge into:**

| Discovery output | Target doc | Merge action |
|-----------------|-----------|-------------|
| New framework or runtime | `stack.md` | Append to technology inventory |
| New service or process | `processes.md` | Append new service section |
| New API route group | `routing.md` | Append route group |
| New deployment target | `deployment.md` | Append environment section |
| Any new sub-system with no existing doc | Create new sub-doc + link from `INDEX.md` |

---

### Sub-target: `business-domain`

**Trigger:** new ORM models, schema tables, or domain types have been added
to the codebase. `forge:health` will flag these as orphaned entities.

**Re-run discovery:**
- `$FORGE_ROOT/init/discovery/discover-database.md`

**Read existing doc:**
- `engineering/business-domain/entity-model.md`

**Merge into `entity-model.md`:**
- Entities present in discovery output but absent from the doc → append new
  entity sections with fields and relationships.
- New fields on an existing entity → add within the existing entity section,
  marked `[NEW]` for team review.
- Entities no longer found in the codebase → flag with `[NOT FOUND IN SCAN]`
  comment but do not remove (may be soft-deleted, feature-flagged, or in a
  migration).

---

### Sub-target: `stack-checklist`

**Trigger:** new libraries or frameworks have been adopted mid-project that
are not yet represented in review checklist items.

**Re-run discovery:**
- `$FORGE_ROOT/init/discovery/discover-stack.md`
- `$FORGE_ROOT/init/discovery/discover-testing.md`

**Read existing doc:**
- `engineering/stack-checklist.md`

**Merge into `stack-checklist.md`:**
- Libraries detected but not yet in the checklist → append new checklist items.
- Never remove or modify existing items (they encode accumulated review knowledge).

---

## Default (no argument)

Run all five categories respecting dependencies — with maximum parallelism:

1. **Build brief** (once, synchronous):
   ```sh
   node "$FORGE_ROOT/tools/build-init-context.cjs" \
     --config .forge/config.json --personas .forge/personas \
     --templates .forge/templates \
     --kb "$(node "$FORGE_ROOT/tools/manage-config.cjs" get paths.engineering 2>/dev/null || echo engineering)" \
     --out .forge/init-context.md --json-out .forge/init-context.json
   ```

2. **Personas + Templates in parallel** (both need only KB, not each other):
   Spawn persona fan-out and template fan-out in a **SINGLE Agent tool message**
   (all persona subagents + all template subagents together). Wait for all to return.

3. **Skills + Workflows in parallel** (skills need personas; workflows need personas + templates — both now ready):
   Spawn skill fan-out and workflow fan-out (16 atomic) in a **SINGLE Agent tool message**.
   Wait for all to return.

4. **Orchestration + Commands in parallel** (both need workflows — now ready):
   Spawn orchestration and commands subagents in a **SINGLE Agent tool message**.
   Wait for both.

This runs in 4 serial steps instead of 5 sequential category passes, with all
fan-outs parallelised within each step.

Each category honours the materialized filter described in **Fast-mode
awareness** above. The default run **does NOT write `mode`** — promotion
is owned by `/forge:config mode full`. Mode stays `fast` until the user
runs that command.

### Fast-mode completion footer

When `CONFIG_MODE == "fast"`, after all four steps succeed, emit a summary
footer (use the per-category counts collected during each fan-out):

```
〇 Regenerate complete (fast mode)
  personas   — N of M regenerated
  templates  — N of M regenerated
  skills     — N of M regenerated
  workflows  — N of M regenerated (others remain as stubs)
  commands   — always present, regenerated normally

〇 To promote to full mode: /forge:config mode full
```

Full-mode projects are unaffected — the mode check short-circuits to the
existing full-rebuild behaviour. No filter, no footer.

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."

---

## Post-regeneration persona pack

Rebuild the compact persona/skill reference pack at
`.forge/cache/persona-pack.json`. This is consumed by `meta-orchestrate` and
`meta-fix-bug` to inject persona references (not verbatim prose) into
subagent prompts when `FORGE_PROMPT_MODE=reference` (the default).

The pack compiles YAML frontmatter from `$FORGE_ROOT/meta/personas/meta-*.md`
and `$FORGE_ROOT/meta/skills/meta-*.md`. It is safe to rebuild on every
regenerate run (cost: ~50ms, 16 files).

```sh
node "$FORGE_ROOT/tools/build-persona-pack.cjs" \
  --out .forge/cache/persona-pack.json
```

- Exit 0: emit `〇 persona pack refreshed`
- Exit 1: surface the stderr message (it includes the offending file path
  for missing-frontmatter or malformed-YAML errors) and advise the user
  to file a bug if the error is unexpected.

## Post-regeneration context pack

Rebuild the architecture context pack at `.forge/cache/context-pack.md` and
`.forge/cache/context-pack.json`. This is injected into subagent prompts by
`meta-orchestrate` and `meta-fix-bug` to reduce per-phase architecture doc reads.

The pack summarises `engineering/architecture/*.md` (skips `*.draft.md`). If
the existing pack has `manual: true` in its frontmatter, the builder skips
and leaves it intact.

```sh
ENGINEERING=$(node "$FORGE_ROOT/tools/manage-config.cjs" get paths.engineering 2>/dev/null || echo engineering)
node "$FORGE_ROOT/tools/build-context-pack.cjs" \
  --arch-dir "$ENGINEERING/architecture" \
  --out-md .forge/cache/context-pack.md \
  --out-json .forge/cache/context-pack.json
```

- Exit 0: emit `〇 context pack refreshed`
- Exit 1: surface the stderr message — most likely the architecture directory
  does not exist yet (run after the knowledge-base category is populated).
  This is non-fatal for regenerate: emit a warning and continue.

## Post-regeneration verification

After all requested targets have been regenerated, verify structural completeness:

```sh
node "$FORGE_ROOT/tools/check-structure.cjs" --path .
```

- If exit 0: emit `〇 All expected generated files are present.`
- If exit 1: list the missing files by namespace and suggest running `/forge:regenerate <namespace>` for the affected category or categories.
