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
/forge:regenerate workflows                    # full workflow rebuild
/forge:regenerate workflows plan_task          # single workflow file only
/forge:regenerate workflows:plan_task          # same — colon form (from migration entries)
/forge:regenerate workflows sprint_plan        # single workflow file only
/forge:regenerate commands                     # .claude/commands/ slash command wrappers
/forge:regenerate templates                    # document templates only
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
3. Emit: `Generating personas (<N> files in parallel)...`
4. Clear stale entries:
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" clear-namespace .forge/personas/
   ```
5. **Spawn ALL persona subagents in a SINGLE Agent tool message** using
   `$FORGE_ROOT/init/generation/generate-persona.md` as the per-subagent rulebook
   (same fan-out pattern as `/forge:init` Phase 4).
6. Collect results. For each `done:` result → emit `  〇 <filename>.md`.
   Retry failures once. Any still failing: surface the id list.
7. Emit `  〇 personas — <N> files written`

---

## Category: `skills` — full rebuild (parallel)

Re-generate `.forge/skills/` from the meta-skill templates and project config.

1. Build the project brief (same command as in `personas` above).
2. Enumerate `$FORGE_ROOT/meta/skills/meta-*-skills.md`.
3. Emit: `Generating skills (<N> files in parallel)...`
4. Clear stale entries:
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" clear-namespace .forge/skills/
   ```
5. **Spawn ALL skill subagents in a SINGLE Agent tool message** using
   `$FORGE_ROOT/init/generation/generate-skill.md` as the per-subagent rulebook.
6. Collect results. Retry failures once. Any still failing: surface the id list.
7. For each completed file, check manifest (warn on modified), emit `  〇 <filename>.md`.

---

## Category: `workflows` — full rebuild or single file

Re-generate `.forge/workflows/` from the meta-workflow definitions and the
current knowledge base. Covers both atomic workflows and orchestration.

**If a sub-target is provided** (e.g. `/forge:regenerate workflows plan_task`
or the colon form `workflows:plan_task`), regenerate only the single workflow
file `.forge/workflows/<sub-target>.md`. Before writing, remove any existing
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
3. Emit: `Generating workflows (16 atomic + orchestration, parallel)...`
4. Check each file for manual modifications before clearing:
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" check .forge/workflows/{filename}.md
   ```
   For any exit 1 (modified): warn `△ .forge/workflows/{filename}.md has been manually
   modified. Overwriting will discard your changes. Proceed? (yes / no / show diff)`
   Collect answers before proceeding.
5. Clear stale entries:
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" clear-namespace .forge/workflows/
   ```
6. **Spawn all 16 atomic workflow subagents in a SINGLE Agent tool message** using
   `$FORGE_ROOT/init/generation/generate-workflows.md` as the per-subagent rulebook
   (same fan-out pattern as `/forge:init` Phase 7d).
7. Collect results. Retry failures once in a single Agent call.
8. **Then spawn orchestration subagent**:
   ```
   Read $FORGE_ROOT/init/generation/generate-orchestration.md and follow it.
   FORGE_ROOT: {FORGE_ROOT}
   Input: $FORGE_ROOT/meta/workflows/meta-orchestrate.md + .forge/workflows/
   Output: .forge/workflows/orchestrate_task.md and .forge/workflows/run_sprint.md
   ```
9. For each written file: record hash `node "$FORGE_ROOT/tools/generation-manifest.cjs" record .forge/workflows/{filename}.md`
10. Emit `  〇 workflows — 18 files written`

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
3. Emit: `Generating commands (<N> files)...`
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

## Category: `templates` — full rebuild (parallel)

Re-generate `.forge/templates/` from the meta-template definitions and the
current knowledge base.

1. Build the project brief (same command as in `personas` above).
2. Enumerate `$FORGE_ROOT/meta/templates/meta-*.md`.
3. Emit: `Generating templates (<N> files in parallel)...`
4. Check each file for manual modifications (warn on modified, same pattern as workflows).
5. Clear stale entries:
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" clear-namespace .forge/templates/
   ```
6. **Spawn ALL template subagents in a SINGLE Agent tool message** using
   `$FORGE_ROOT/init/generation/generate-template.md` as the per-subagent rulebook.
7. Collect results. Retry failures once. Any still failing: surface the id list.
8. For each written file: record hash, emit `  〇 <filename>.md`.
9. Re-record the one-shot init artifact not regenerated from a meta file:
   ```sh
   if [ -f ".forge/templates/CUSTOM_COMMAND_TEMPLATE.md" ]; then
     node "$FORGE_ROOT/tools/generation-manifest.cjs" record .forge/templates/CUSTOM_COMMAND_TEMPLATE.md
   fi
   ```

---

## Category: `knowledge-base` — merge mode

**This is not a full rebuild.** The knowledge base accumulates writeback from
every sprint. Overwriting it from scratch destroys that accumulated knowledge.

Emit: `Generating knowledge-base...`

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

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."

---

## Post-regeneration verification

After all requested targets have been regenerated, verify structural completeness:

```sh
node "$FORGE_ROOT/tools/check-structure.cjs" --path .
```

- If exit 0: emit `〇 All expected generated files are present.`
- If exit 1: list the missing files by namespace and suggest running `/forge:regenerate <namespace>` for the affected category or categories.
