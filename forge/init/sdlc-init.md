# Forge Init — Master Orchestration

You are bootstrapping a complete AI-SDLC instance for the project in the
current working directory. Execute these 12 phases in order.

Set `$FORGE_ROOT` to the forge plugin directory (the parent of this file's
directory — the folder containing `meta/` and `init/`).

---

## Pre-flight — Knowledge Base Folder

Before Phase 1 begins, ask the user where to create the knowledge base folder:

```
━━━ Knowledge Base Folder ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Forge will create a folder for architecture docs, sprints, bugs, and features.
Default name: engineering/

Does "engineering" conflict with an existing folder in this project? [n/Y]
If yes, enter your preferred name (e.g. ai-docs, .forge-kb, docs/ai): ___
```

- If the user accepts the default (types `n` or presses Enter): no config write needed.
  `paths.engineering` defaults to `"engineering"` in the schema.
- If the user provides a custom name: write it immediately:
  ```sh
  node "$FORGE_ROOT/tools/manage-config.cjs" set paths.engineering "{chosen_name}"
  ```
  Note: folder name must not contain spaces.

After this question (and any config write), resolve `KB_PATH` for use in all
subsequent phases:

```sh
KB_PATH: !`node "$FORGE_ROOT/tools/manage-config.cjs" get paths.engineering 2>/dev/null || echo "engineering"`
```

---

## Phase 1 — Discover

Emit: `━━━ Phase 1/12 — Discover ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Also emit: `Running 5 discovery scans in parallel...`

Run the 5 discovery prompts in parallel. Each reads from `$FORGE_ROOT/init/discovery/`.

| Prompt | File | Produces |
|--------|------|----------|
| Stack | `discover-stack.md` | Languages, frameworks, versions, runtime |
| Processes | `discover-processes.md` | Service topology, build/deploy commands |
| Database | `discover-database.md` | Entity inventory, relationships, field types |
| Routing | `discover-routing.md` | API surface map, auth strategy |
| Testing | `discover-testing.md` | Test framework, test/build/lint commands |

**Output**: `.forge/config.json` (assembled from discovery results) + internal discovery context.

Validate the config against `$FORGE_ROOT/sdlc-config.schema.json`.

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 1, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 2 — Recommend Marketplace Skills

Emit: `━━━ Phase 2/12 — Marketplace Skills ━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/meta/skill-recommendations.md` for the full mapping and rationale.

Using the stack discovered in Phase 1, look up matching skills from the
recommendation mapping. For each match:

1. Run `node "$FORGE_ROOT/tools/list-skills.js"` to get all currently installed
   skill names. This reads `~/.claude/plugins/installed_plugins.json` directly —
   user-scope (global) and local-scope skills matching the current project path.
2. Split matching skills into two buckets:
   - **Already installed** — in mapping AND in script output
   - **Not yet installed** — in mapping but NOT in script output
3. Group not-yet-installed matches by confidence: High, Medium, Low.
4. Present to the user:

```
Forge found [N] marketplace skills relevant to this project's stack:

Already installed (will be wired into generated personas automatically):
  ✓ vue-best-practices

Recommended (not yet installed):

  HIGH confidence:
    stripe-integration — PCI-compliant checkout, subscriptions, webhooks
      (detected: Stripe)

Install recommended? [Y/n] Or specify: e.g. "stripe-integration"
```

5. If the user confirms, run `/plugin install <skill-name>@<marketplace>` for each selected skill.
6. Write `"installedSkills"` to `.forge/config.json` as the union of:
   - Skills already installed that match the recommendation mapping
   - Skills just installed in this step
   This ensures persona generation sees the user's full relevant skill set,
   not just what Forge installed today.
7. **Track skipped skills for the Report.** Build a list of every recommended
   marketplace skill that was NOT installed (either skipped or not selected).
   For each, record `{ name, marketplace, confidence, reason }`. This list is
   carried forward and emitted in the post-init Report — it is not lost.

**If the user skips or installs none:** proceed without blocking. Pre-existing
skills are still recorded and wired. All skipped recommendations are surfaced
again in the Report with copy-paste install commands.

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 2, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 3 — Generate Knowledge Base

Emit: `━━━ Phase 3/12 — Knowledge Base ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

### Step 3a — Scaffold directories

Create the directory structure (these are fast Bash operations, no LLM needed):

```sh
mkdir -p "{KB_PATH}/architecture" "{KB_PATH}/business-domain" \
         "{KB_PATH}/sprints" "{KB_PATH}/bugs" "{KB_PATH}/tools" \
         ".forge/store/sprints" ".forge/store/tasks" \
         ".forge/store/bugs" ".forge/store/events"
touch "{KB_PATH}/sprints/.gitkeep" "{KB_PATH}/bugs/.gitkeep" \
      ".forge/store/sprints/.gitkeep" ".forge/store/tasks/.gitkeep" \
      ".forge/store/bugs/.gitkeep" ".forge/store/events/.gitkeep"
```

### Step 3b — Read rulebook and fan-out (parallel)

Read `$FORGE_ROOT/init/generation/generate-kb-doc.md` once (the per-subagent rulebook).

**Spawn ALL leaf docs in a SINGLE Agent tool message** (one call, all parallel):

| description | output_path | discovery_focus |
|---|---|---|
| `Generate KB: stack.md` | `{KB_PATH}/architecture/stack.md` | Languages, frameworks, runtime, versions |
| `Generate KB: processes.md` | `{KB_PATH}/architecture/processes.md` | Services, build/deploy topology |
| `Generate KB: database.md` | `{KB_PATH}/architecture/database.md` | Entities, relationships, field types |
| `Generate KB: routing.md` | `{KB_PATH}/architecture/routing.md` | API surface, route groups, auth strategy |
| `Generate KB: deployment.md` | `{KB_PATH}/architecture/deployment.md` | Environments, CI/CD, infra targets |
| `Generate KB: entity-model.md` | `{KB_PATH}/business-domain/entity-model.md` | Full entity inventory with fields |
| `Generate KB: stack-checklist.md` | `{KB_PATH}/stack-checklist.md` | Review checklist items from stack + testing discovery |

Prompt template for each subagent:
```
Read and follow the rulebook below exactly.

--- RULEBOOK ---
<contents of $FORGE_ROOT/init/generation/generate-kb-doc.md>
--- END RULEBOOK ---

Project brief (for entity names and paths):
--- BRIEF ---
<contents of .forge/init-context.md if already built, otherwise use discovery summary below>
--- END BRIEF ---

Discovery context (everything found in Phase 1):
--- DISCOVERY ---
<inline the full discovery context from Phase 1>
--- END DISCOVERY ---

Doc spec:
  output_path: {output_path}
  focus: {discovery_focus}
  KB_PATH: {KB_PATH}
  FORGE_ROOT: {FORGE_ROOT}
```

Wait for all 7 subagents to return.

### Step 3c — Generate index files and MASTER_INDEX (sequential)

After all leaf docs are written:

1. **`{KB_PATH}/architecture/INDEX.md`** — list and link to the 5 architecture docs
2. **`{KB_PATH}/business-domain/INDEX.md`** — list and link to entity-model.md
3. **`{KB_PATH}/MASTER_INDEX.md`** — scaffold with section headings linking to both
   INDEX files and stack-checklist; include `## Domain Entities` section listing
   discovered entities (one per line, for `build-init-context.cjs` to parse)

Generate these sequentially (each builds on what's already on disk).

### Step 3d — Retry any failed docs

If any Step 3b subagent returned `FAILED:`, re-spawn only those in a single Agent call.
Any still failing after one retry: halt and surface the id list.

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 3, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 4 — Generate Personas (parallel)

Emit: `━━━ Phase 4/12 — Personas (parallel) ━━━━━━━━━━━━━━━━━━━━━━━━━━━`

### Step 4a — Build the project brief (if not already built)

If `.forge/init-context.md` does not yet exist (Phase 3 ran before templates existed):
```sh
node "$FORGE_ROOT/tools/build-init-context.cjs" \
  --config    .forge/config.json \
  --personas  .forge/personas \
  --templates .forge/templates \
  --kb        "$KB_PATH" \
  --out       .forge/init-context.md \
  --json-out  .forge/init-context.json
```
(At this point templates and personas dirs are empty; the brief will have stub
entries — that is fine for persona generation. The brief is rebuilt fully in Phase 7a.)

### Step 4b — Enumerate meta-personas

```sh
ls "$FORGE_ROOT/meta/personas/meta-"*.md
```

This produces a list of meta-persona files. Exclude `README.md`.
Each file `meta-{role}.md` maps to output `.forge/personas/{role}.md`.

### Step 4c — Fan-out (parallel)

Read `$FORGE_ROOT/init/generation/generate-persona.md` once (the per-subagent rulebook).

**Spawn ALL persona subagents in a SINGLE Agent tool message**:

```
description: "Generate persona: {role}"
prompt: |
  Read and follow the rulebook below exactly.

  --- RULEBOOK ---
  <contents of $FORGE_ROOT/init/generation/generate-persona.md>
  --- END RULEBOOK ---

  Project brief (authoritative for names, commands, skill wiring):
  --- BRIEF ---
  <contents of .forge/init-context.md>
  --- END BRIEF ---

  Meta-persona source (your generation algorithm):
  --- META ---
  <contents of $FORGE_ROOT/meta/personas/meta-{role}.md>
  --- END META ---

  Your output file: .forge/personas/{role}.md
  FORGE_ROOT: {FORGE_ROOT}
```

Wait for all subagents to return. Retry failures once in a single Agent call.
Any still failing: halt with id list.

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 4, "timestamp": "<current ISO timestamp>" }
```

---

## Phases 5 + 6 — Generate Skills and Templates (parallel phases)

Emit: `━━━ Phases 5+6/12 — Skills + Templates (parallel) ━━━━━━━━━━━━━━`

### Step 5/6-pre — Completeness Guard

Before spawning any subagents, verify all required config fields are present
and non-empty in `.forge/config.json`:

1. Read the current `.forge/config.json`.
2. Check top-level `required`: `["version", "project", "stack", "commands", "paths"]`.
3. Check nested required sub-fields:
   - `project.required`: `["prefix", "name"]`
   - `commands.required`: `["test"]`
   - `paths.required`: `["engineering", "store", "workflows", "commands", "templates"]`
4. Missing or empty = absent, `null`, `""`, or `{}`.
5. All present → proceed. Any missing → halt:

```
△ Init Completeness Guard — missing required config fields:
  · project.prefix — short project prefix (e.g. ACME)
  · commands.test  — test command (e.g. npm test)

Provide values for each missing field, then continue:
```

After the user provides values, re-check before proceeding.

### Step 5/6-a — Fan-out both phases simultaneously

Read the rulebooks once each:
- `$FORGE_ROOT/init/generation/generate-skill.md`
- `$FORGE_ROOT/init/generation/generate-template.md`

Read the brief: `.forge/init-context.md`

Enumerate:
- Skills: `ls "$FORGE_ROOT/meta/skills/meta-"*.md` → each `meta-{role}-skills.md` maps to `.forge/skills/{role}-skills.md`
- Templates: `ls "$FORGE_ROOT/meta/templates/meta-"*.md` → each maps to the output filename defined in `generate-templates.md`

**Spawn ALL skill and template subagents in a SINGLE Agent tool message**
(skills + templates together — one tool call):

For each skill `meta-{role}-skills.md`:
```
description: "Generate skill: {role}"
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

For each template `meta-{stem}.md`:
```
description: "Generate template: {output_filename}"
prompt: |
  Read and follow the rulebook below exactly.
  --- RULEBOOK ---
  <contents of $FORGE_ROOT/init/generation/generate-template.md>
  --- END RULEBOOK ---
  --- BRIEF ---
  <contents of .forge/init-context.md>
  --- END BRIEF ---
  --- META ---
  <contents of $FORGE_ROOT/meta/templates/meta-{stem}.md>
  --- END META ---
  Your output file: .forge/templates/{output_filename}
  FORGE_ROOT: {FORGE_ROOT}
```

Wait for all subagents to return. Retry failures once (skills and templates separately).
Any still failing after retry: halt with id list.

### Step 5/6-b — Write Calibration Baseline

After all subagents complete, compute and write `calibrationBaseline` into
`.forge/config.json`:

1. Read `$FORGE_ROOT/.claude-plugin/plugin.json` → `version`.
2. Hash `{KB_PATH}/MASTER_INDEX.md` (strip blank lines + `<!--` lines, SHA-256):
   ```sh
   node -e "const crypto=require('crypto'),fs=require('fs'); const lines=fs.readFileSync('{KB_PATH}/MASTER_INDEX.md','utf8').split('\n').filter(l=>l.trim()&&!l.trim().startsWith('<!--')); console.log(crypto.createHash('sha256').update(lines.join('\n')).digest('hex'))"
   ```
3. List done sprint IDs from `.forge/store/sprints/` (empty on fresh init):
   ```sh
   node -e "const fs=require('fs'),p='.forge/store/sprints'; try{const files=fs.readdirSync(p).filter(f=>f.endsWith('.json')); const done=files.map(f=>JSON.parse(fs.readFileSync(p+'/'+f,'utf8'))).filter(s=>['done','retrospective-done'].includes(s.status)).map(s=>s.sprintId); console.log(JSON.stringify(done));}catch(e){console.log('[]')}"
   ```
4. Today's ISO date: `date -u +"%Y-%m-%d"`
5. Merge into config:
   ```sh
   node -e "const fs=require('fs'); const cfg=JSON.parse(fs.readFileSync('.forge/config.json','utf8')); cfg.calibrationBaseline={lastCalibrated:'<date>',version:'<ver>',masterIndexHash:'<hash>',sprintsCovered:<array>}; fs.writeFileSync('.forge/config.json',JSON.stringify(cfg,null,2)+'\n')"
   ```

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 6, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 7 — Generate Atomic Workflows (parallel)

Emit: `━━━ Phase 7/12 — Workflows (parallel) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

### Step 7a — Build the project brief

Assert `.forge/personas/` contains at least one `.md` file (excluding README.md).
If empty, halt: `△ Phase 4 output missing — no persona files found in .forge/personas/.`

Run:
```sh
node "$FORGE_ROOT/tools/build-init-context.cjs" \
  --config    .forge/config.json \
  --personas  .forge/personas \
  --templates .forge/templates \
  --kb        "$KB_PATH" \
  --out       .forge/init-context.md \
  --json-out  .forge/init-context.json
```

The script prints a `〇 Brief written — N personas, M templates, K architecture docs` line on success.
If it exits non-zero, halt and surface the error.

### Step 7b — Read the fan-out plan

```sh
cat "$FORGE_ROOT/init/workflow-gen-plan.json"
```

This gives 16 `{id, meta, persona}` entries.

### Step 7c — Check resume state

```sh
cat .forge/init-progress.json 2>/dev/null
```

If `phase7.workflows` exists in the file, filter the fan-out list to entries
whose id is **not** `"done"`. Emit: `〇 Resuming Phase 7 — N remaining workflows`

### Step 7d — Fan-out (parallel)

Read `.forge/init-context.md` once (inline it into each subagent prompt).
Read the rulebook: `$FORGE_ROOT/init/generation/generate-workflows.md` once.
For each entry, read its meta-workflow and persona file.

**Spawn ALL remaining subagents in a SINGLE Agent tool message** (one tool call
with all parallel invocations). For each entry `{id, meta, persona}`:

```
description: "Generate workflow: {id}"
prompt: |
  Read and follow the rulebook below exactly.

  --- RULEBOOK ---
  <contents of $FORGE_ROOT/init/generation/generate-workflows.md>
  --- END RULEBOOK ---

  Project brief (authoritative — use for ALL names and substitutions):
  --- BRIEF ---
  <contents of .forge/init-context.md>
  --- END BRIEF ---

  Meta-workflow source (your generation algorithm):
  --- META ---
  <contents of $FORGE_ROOT/meta/workflows/{meta}>
  --- END META ---

  Primary persona (embed verbatim as the opening section of your output):
  --- PERSONA ---
  <contents of .forge/personas/{persona}.md>
  --- END PERSONA ---

  Your output file: .forge/workflows/{id}.md
  FORGE_ROOT: {FORGE_ROOT}
```

Wait for all subagents to return.

### Step 7e — Collect, retry, validate

For each returned result:
- Starts with `done:` → mark id as `"done"` in `phase7.workflows` map
- Starts with `FAILED:` → mark id as `"failed"`, record reason

If any `"failed"`:
- Emit: `△ N workflows failed — retrying once: <id-list>`
- Spawn the failed subagents again in a **SINGLE** Agent tool message (same prompts).
- Collect results. Any still failing after one retry:
  - Write `.forge/init-progress.json` with `phase7.workflows` map.
  - Halt: `× Phase 7 incomplete — <id-list>. Fix the reported issues, then resume.`

After all succeed, verify every id has a non-empty `.forge/workflows/{id}.md` on disk.
Any missing file is treated as a failure and surfaced.

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 7, "timestamp": "<current ISO timestamp>", "phase7": { "<id>": "done", ... } }
```

**Output**: `.forge/workflows/` — 16 atomic workflow files

---

## Phases 8 + 9 — Generate Orchestration and Commands (parallel phases)

Emit: `━━━ Phases 8+9/12 — Orchestration + Commands (parallel) ━━━━━━━━`

Both phases depend only on Phase 7 output. Spawn them simultaneously.

**Spawn BOTH in a SINGLE Agent tool message**:

```
description: "Generate orchestration workflows"
prompt: |
  Read $FORGE_ROOT/init/generation/generate-orchestration.md and follow it
  exactly. FORGE_ROOT: {FORGE_ROOT}
  Input: $FORGE_ROOT/meta/workflows/meta-orchestrate.md + .forge/workflows/
  Output: .forge/workflows/orchestrate_task.md and .forge/workflows/run_sprint.md
```

```
description: "Generate commands"
prompt: |
  Read $FORGE_ROOT/init/generation/generate-commands.md and follow it exactly.
  FORGE_ROOT: {FORGE_ROOT}
  Input: .forge/workflows/ (enumerate existing workflow files) + .forge/config.json
  Output: .claude/commands/ (13 command wrapper files)
```

Wait for both to return. If either fails, retry that subagent once.

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 9, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 10 — Install Tools

Emit: `━━━ Phase 10/12 — Tools ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/generation/generate-tools.md` and follow it.

**Input**: `.forge/config.json`
**Output**: `paths.forgeRoot` written to `.forge/config.json`

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 10, "timestamp": "<current ISO timestamp>" }
```

> Schema validation loads schemas from `.forge/schemas/` (project) or
> `forge/schemas/` (in-tree fallback) at runtime. Run `/forge:update-tools`
> after init to install project-local schema copies.

---

## Phase 11 — Smoke Test

Emit: `━━━ Phase 11/12 — Smoke Test ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/smoke-test.md` and follow it.

Validates structural completeness, referential integrity, tool execution,
and template coherence. Self-corrects up to once per failing component.

**Output**: `.forge/generation-manifest.json` (file hashes for all generated artifacts),
`.forge/update-check-cache.json` (migration baseline anchored to the installed version)

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 11, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 12 — Link KB to Agent Instruction Files

Emit: `━━━ Phase 12/12 — Tomoshibi ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Invoke Tomoshibi to ensure every coding-agent instruction file in the project
has up-to-date links to the Forge knowledge base and generated workflow entry points.

Use the Agent tool:
- description: "灯 Tomoshibi — link KB to agent instruction files"
- prompt: "You are Tomoshibi, Forge's KB visibility agent. Read `$FORGE_ROOT/agents/tomoshibi.md` and follow it exactly."

After Tomoshibi completes, emit a one-line rename note:

```
〇 To rename the KB folder later: (a) rename the folder on disk, (b) run
  node "$FORGE_ROOT/tools/manage-config.cjs" set paths.engineering <new-name>
```

Delete `.forge/init-progress.json` — init is complete.
Use the Bash tool: `rm -f .forge/init-progress.json`

---

## Report

After all phases complete, report to the user:
- Knowledge base: doc count, entity count, checklist item count
- Generated artifacts: workflow count, command count, template count, tool count
- Smoke test results
- Confidence rating

**Recommended skills (if any were skipped in Phase 2):**

If the skipped-skills list is non-empty, include a section at the end of the
report. Use this exact format, one line per skill:

```
Recommended skills — install when ready:

  /plugin install typescript-lsp@claude-plugins-official
    ↳ HIGH — LSP intelligence for TypeScript/JavaScript (detected in stack)

  /plugin install frontend-design@claude-plugins-official
    ↳ HIGH — Production-grade UI patterns, avoids generic AI aesthetics (React detected)
```

Rules:
- Only list marketplace skills (those with a `@<marketplace>` install path).
- Personal skills that are missing should be noted separately:
  `vue-best-practices — personal skill; place SKILL.md in ~/.claude/skills/vue-best-practices/`
- Order by confidence: High → Medium → Low.
- Do not repeat skills that are already installed.

**Next step:** review `{KB_PATH}/` docs, then run `/sprint-plan`

If you encountered any problems during this init run, file them with `/forge:report-bug` — it gathers context automatically and opens an issue in the Forge repository.
