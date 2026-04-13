---
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
/forge:regenerate                              # workflows + commands + templates (default)
/forge:regenerate personas                    # .forge/personas/ persona contexts
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

## Category: `personas` — full rebuild

Re-generate `.forge/personas/` from the meta-persona definitions and the current knowledge base.

1. Read `$FORGE_ROOT/meta/personas/` — all meta-persona files
2. Read the current knowledge base in `engineering/`
3. Re-generate `.forge/personas/` following `$FORGE_ROOT/init/generation/generate-personas.md`
4. Before overwriting each file, check manifest status (same pattern as workflows)
5. After writing each file, record its new hash:
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" record .forge/personas/{filename}.md
   ```

---

## Category: `skills` — full rebuild

Re-generate `.forge/skills/` from the meta-skill templates and project config.

1. Read `$FORGE_ROOT/meta/skills/` — all meta-skill files
2. Read `.forge/config.json` for `installedSkills`
3. Read the current knowledge base in `engineering/`
4. Re-generate `.forge/skills/` following `$FORGE_ROOT/init/generation/generate-skills.md`
5. Before overwriting each file, check manifest status
6. After writing each file, record its new hash:
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" record .forge/skills/{filename}.md
   ```

---

## Category: `workflows` — full rebuild or single file

Re-generate `.forge/workflows/` from the meta-workflow definitions and the
current knowledge base. Covers both atomic workflows (Phase 5) and
orchestration (Phase 6).

**If a sub-target is provided** (e.g. `/forge:regenerate workflows plan_task`
or the colon form `workflows:plan_task`), regenerate only the single workflow
file `.forge/workflows/<sub-target>.md` instead of the full directory. All
other steps below apply to that single file only (manifest check, diff prompt,
hash recording).

**If no sub-target** — full rebuild of all workflow files:

1. Read `$FORGE_ROOT/meta/workflows/` — all meta-workflow files
2. Read `$FORGE_ROOT/meta/workflows/meta-orchestrate.md`
3. Read the current knowledge base in `engineering/` (architecture, business
   domain, stack checklist) — this is the input, not an output
4. Read `.forge/config.json` for paths, commands, and pipeline configuration
5. Re-generate `.forge/workflows/` following
   `$FORGE_ROOT/init/generation/generate-workflows.md` and
   `$FORGE_ROOT/init/generation/generate-orchestration.md`
6. Before overwriting each file, if `MANIFEST_TOOL` is set, check its status:
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" check .forge/workflows/{filename}.md
   ```
   - Exit 0 (pristine) or exit 2 (untracked) → show diff and prompt as normal
   - Exit 1 (modified) → show diff **and** surface a clear warning:
     > △ `.forge/workflows/{filename}.md` has been manually modified.
     > Overwriting will discard your changes. Proceed? (yes / no / show diff)
7. After writing each file, record its new hash:
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" record .forge/workflows/{filename}.md
   ```

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
3. Re-generate `.claude/commands/` following
   `$FORGE_ROOT/init/generation/generate-commands.md`
   The idempotency check will overwrite any command that references a
   missing or renamed workflow, and skip any that are already correct.
4. After writing each command file, record its new hash:
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" record .claude/commands/{filename}.md
   ```

**DO NOT** touch any `.claude/commands/` file that is not in the output list
in `generate-commands.md`. Custom commands (`supervisor-code.md`, project-specific
wrappers, etc.) must never be written, overwritten, or deleted by this step.
Retired Forge command files (`engineer.md`, `supervisor.md`) are cleaned up
separately by Step 5b-pre in `/forge:update` — not here.

---

## Category: `templates` — full rebuild

Re-generate `.forge/templates/` from the meta-template definitions and the
current knowledge base.

1. Read `$FORGE_ROOT/meta/templates/` — all meta-template files
2. Read the current knowledge base in `engineering/`
3. Re-generate `.forge/templates/` following
   `$FORGE_ROOT/init/generation/generate-templates.md`
4. Before overwriting each file, check manifest status (same pattern as
   workflows above — warn on modified, proceed normally on pristine/untracked)
5. After writing each file, record its new hash:
   ```sh
   node "$FORGE_ROOT/tools/generation-manifest.cjs" record .forge/templates/{filename}.md
   ```

---

## Category: `knowledge-base` — merge mode

**This is not a full rebuild.** The knowledge base accumulates writeback from
every sprint. Overwriting it from scratch destroys that accumulated knowledge.

Instead: re-run the relevant discovery prompts scoped to what has changed,
compute a delta against the existing docs, and merge only new content in.

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

Run `workflows` + `commands` + `templates` in sequence.

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
