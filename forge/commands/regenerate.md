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

## Arguments

$ARGUMENTS

Parse the argument to identify the target category and optional sub-target:

```
/forge:regenerate                          # workflows + templates (default)
/forge:regenerate workflows                # atomic workflows + orchestration
/forge:regenerate templates                # document templates only
/forge:regenerate tools                    # engineering/tools/ only
/forge:regenerate knowledge-base           # all three sub-targets (merge mode)
/forge:regenerate knowledge-base architecture
/forge:regenerate knowledge-base business-domain
/forge:regenerate knowledge-base stack-checklist
```

---

## Category: `workflows` — full rebuild

Re-generate `.forge/workflows/` from the meta-workflow definitions and the
current knowledge base. Covers both atomic workflows (Phase 5) and
orchestration (Phase 6).

1. Read `$FORGE_ROOT/meta/workflows/` — all meta-workflow files
2. Read `$FORGE_ROOT/meta/workflows/meta-orchestrate.md`
3. Read the current knowledge base in `engineering/` (architecture, business
   domain, stack checklist) — this is the input, not an output
4. Read `.forge/config.json` for paths, commands, and pipeline configuration
5. Re-generate `.forge/workflows/` following
   `$FORGE_ROOT/init/generation/generate-workflows.md` and
   `$FORGE_ROOT/init/generation/generate-orchestration.md`
6. Show a unified diff between current and regenerated files
7. Prompt before overwriting each file — never auto-replace

**Do NOT touch:** `.claude/commands/`, `engineering/tools/`, `.forge/config.json`,
or any knowledge base file.

---

## Category: `templates` — full rebuild

Re-generate `.forge/templates/` from the meta-template definitions and the
current knowledge base.

1. Read `$FORGE_ROOT/meta/templates/` — all meta-template files
2. Read the current knowledge base in `engineering/`
3. Re-generate `.forge/templates/` following
   `$FORGE_ROOT/init/generation/generate-templates.md`
4. Show diffs and prompt before overwriting

---

## Category: `tools` — copy from plugin

Copy the pre-built tools and schemas from the installed plugin into the project.
This is equivalent to running `/forge:update-tools`.

Read and follow `$FORGE_ROOT/init/generation/generate-tools.md`.

**When to use:** after a Forge plugin update that includes tool changes
(the migration entry will list `"tools"` in `regenerate`).

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

Run `workflows` + `templates` in sequence. This preserves the pre-existing
behaviour for callers that do not pass an argument.

## On error

If any step above fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
