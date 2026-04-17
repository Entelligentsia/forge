# Lazy Materialise Rulebook

You are materialising the dependency closure for a fast-mode stub workflow on
first use. Follow every step below in order. Do not skip or reorder steps.

## Setup

Read the caller's `workflow_id` from the invocation arguments (passed as
`workflow_id=<id>`). Set `WORKFLOW_ID` to this value.

Resolve `FORGE_ROOT`:
```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

Read the project config and resolve `KB_PATH`:
```sh
KB_PATH: !`node "$FORGE_ROOT/tools/manage-config.cjs" get paths.engineering 2>/dev/null || echo "engineering"`
```

---

## Step 1 — Emit progress banner

```
〇 Materialising /forge workflows — first-use scaffolding for: {WORKFLOW_ID}
```

---

## Step 2 — Load dependency edges

Read `$FORGE_ROOT/schemas/structure-manifest.json`.

Look up `edges.workflows.{WORKFLOW_ID}`. If the key is absent, emit:
```
△ No edges found for workflow "{WORKFLOW_ID}" in structure-manifest.json.
  Falling back to full /forge:regenerate. Run /forge:regenerate to build all
  scaffolding, then retry.
```
And halt.

---

## Step 3 — Compute transitive closure

Using the edges for `{WORKFLOW_ID}`:

1. Collect **direct deps**: `personas`, `skills`, `templates`, `sub_workflows`,
   `kb_docs`.
2. For each entry in `sub_workflows`: also collect that sub-workflow's own
   `personas`, `skills`, `templates`, `kb_docs` edges (one level deep only —
   do NOT recurse into sub-sub-workflows).
3. Deduplicate. Resolve `{KB_PATH}` placeholders in `kb_docs` paths.

This gives you the **full closure** — the set of every artifact needed before
`{WORKFLOW_ID}` can run.

---

## Step 4 — Classify artifacts (missing vs. stubbed vs. present)

For each artifact in the closure, classify it:

- **missing**: file does not exist on disk.
- **stubbed**: file exists AND starts with `<!-- FORGE FAST-MODE STUB`.
- **present**: file exists and is not a stub.

Skip **present** artifacts — they need no generation.
Warn on manually-modified files (check via `generation-manifest.cjs check`
exit 1) and skip them too.

If the closure is already fully present: emit
```
〇 {WORKFLOW_ID} closure is already materialised — proceeding.
```
and jump to Step 10 (re-read and execute).

---

## Step 5 — Assert project brief pre-conditions

Before generating, assert that `.forge/init-context.md` exists and is non-empty.
If absent or empty, rebuild it now:

```sh
node "$FORGE_ROOT/tools/build-init-context.cjs" \
  --config    .forge/config.json \
  --personas  .forge/personas \
  --templates .forge/templates \
  --kb        "{KB_PATH}" \
  --out       .forge/init-context.md \
  --json-out  .forge/init-context.json
```

If the script exits non-zero, halt and surface the error.

---

## Step 6 — KB layer

For each **missing** or **stubbed** KB doc in the closure:

Emit: `〇 Materialising KB: {doc_path}…`

Spawn a subagent:
```
description: "Materialise KB doc: {doc_path}"
prompt: |
  Read and follow the rulebook below exactly.
  --- RULEBOOK ---
  <contents of $FORGE_ROOT/init/generation/generate-kb-doc.md>
  --- END RULEBOOK ---
  Doc spec:
    output_path: {doc_path}
    KB_PATH: {KB_PATH}
    FORGE_ROOT: {FORGE_ROOT}
```

Spawn all missing KB docs **in a SINGLE Agent tool message** (parallel).
Wait for all to return. Retry failures once.

After all KB docs complete, rebuild the project brief:
```sh
node "$FORGE_ROOT/tools/build-init-context.cjs" \
  --config    .forge/config.json \
  --personas  .forge/personas \
  --templates .forge/templates \
  --kb        "{KB_PATH}" \
  --out       .forge/init-context.md \
  --json-out  .forge/init-context.json
```

---

## Step 7 — Persona layer

For each **missing** or **stubbed** persona in the closure:

Emit: `〇 Materialising persona: {role}.md…`

Spawn a subagent per persona:
```
description: "Materialise persona: {role}"
prompt: |
  Read and follow the rulebook below exactly.
  --- RULEBOOK ---
  <contents of $FORGE_ROOT/init/generation/generate-persona.md>
  --- END RULEBOOK ---
  --- BRIEF ---
  <contents of .forge/init-context.md>
  --- END BRIEF ---
  --- META ---
  <contents of $FORGE_ROOT/meta/personas/meta-{role}.md>
  --- END META ---
  Your output file: .forge/personas/{role}.md
  FORGE_ROOT: {FORGE_ROOT}
```

Spawn all missing personas in a **SINGLE Agent tool message** (parallel).
Wait for all to return. Retry failures once.

After all personas complete, rebuild the project brief again:
```sh
node "$FORGE_ROOT/tools/build-init-context.cjs" \
  --config    .forge/config.json \
  --personas  .forge/personas \
  --templates .forge/templates \
  --kb        "{KB_PATH}" \
  --out       .forge/init-context.md \
  --json-out  .forge/init-context.json
```

---

## Step 8 — Skills + Templates layer (parallel)

Read the updated brief: `.forge/init-context.md`.

For each **missing** or **stubbed** skill:

```
description: "Materialise skill: {role}-skills"
prompt: |
  Read and follow the rulebook below exactly.
  --- RULEBOOK ---
  <contents of $FORGE_ROOT/init/generation/generate-skill.md>
  --- END RULEBOOK ---
  --- BRIEF ---
  <contents of .forge/init-context.md>
  --- END BRIEF ---
  --- META ---
  <contents of $FORGE_ROOT/meta/skills/meta-{role}-skills.md>
  --- END META ---
  Your output file: .forge/skills/{role}-skills.md
  FORGE_ROOT: {FORGE_ROOT}
```

For each **missing** or **stubbed** template:

```
description: "Materialise template: {STEM}"
prompt: |
  Read and follow the rulebook below exactly.
  --- RULEBOOK ---
  <contents of $FORGE_ROOT/init/generation/generate-template.md>
  --- END RULEBOOK ---
  --- BRIEF ---
  <contents of .forge/init-context.md>
  --- END BRIEF ---
  --- META ---
  <contents of $FORGE_ROOT/meta/templates/meta-{source}.md>
  --- END META ---
  Your output file: .forge/templates/{STEM}.md
  FORGE_ROOT: {FORGE_ROOT}
```

Spawn ALL missing skills and templates together in a **SINGLE Agent tool message** (parallel).
Wait for all to return. Retry failures once.

---

## Step 9 — Workflow layer

For each **missing** or **stubbed** workflow in the closure (including sub-workflows):

Read the updated brief: `.forge/init-context.md`.
Read `$FORGE_ROOT/init/workflow-gen-plan.json` to find `{id, meta, persona}` for each workflow id.

```
description: "Materialise workflow: {id}"
prompt: |
  Read and follow the rulebook below exactly.
  --- RULEBOOK ---
  <contents of $FORGE_ROOT/init/generation/generate-workflows.md>
  --- END RULEBOOK ---
  --- BRIEF ---
  <contents of .forge/init-context.md>
  --- END BRIEF ---
  --- META ---
  <contents of $FORGE_ROOT/meta/workflows/{meta}>
  --- END META ---
  --- PERSONA ---
  <contents of .forge/personas/{persona}.md>
  --- END PERSONA ---
  Your output file: .forge/workflows/{id}.md
  FORGE_ROOT: {FORGE_ROOT}
```

Spawn all missing workflows in a **SINGLE Agent tool message** (parallel).
Wait for all to return. Retry failures once.

After each workflow is written, record it in the generation manifest:
```sh
node "$FORGE_ROOT/tools/generation-manifest.cjs" record .forge/workflows/{id}.md
```

---

## Step 10 — Record and emit completion banner

For each newly-written artifact (personas, skills, templates, workflows):
```sh
node "$FORGE_ROOT/tools/generation-manifest.cjs" record {artifact_path}
```

Emit:
```
〇 Closure materialised for {WORKFLOW_ID}
   Personas:   N written
   Skills:     N written
   Templates:  N written
   Workflows:  N written
```

---

## Step 11 — Re-read and execute the real workflow

The stub has been replaced with the real workflow. Now:

1. Re-read `.forge/workflows/{WORKFLOW_ID}.md` (the real generated workflow).
2. Execute it from the top, passing the original caller arguments.

Do not proceed with the user's task until the real workflow has loaded and run.
