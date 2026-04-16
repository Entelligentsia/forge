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

Read `$FORGE_ROOT/init/generation/generate-knowledge-base.md` and follow it.

**Input**: discovery context + meta-personas (for understanding what agents need to know)
**Output**: `{KB_PATH}/architecture/`, `{KB_PATH}/business-domain/`, `{KB_PATH}/stack-checklist.md`

Also scaffold: `.forge/store/` directories, `{KB_PATH}/sprints/`, `{KB_PATH}/bugs/`.

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 3, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 4 — Generate Personas

Emit: `━━━ Phase 4/12 — Personas ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/generation/generate-personas.md` and follow it.

**Input**: `$FORGE_ROOT/meta/personas/` + discovery context + generated knowledge base
**Output**: `.forge/personas/` (standalone persona files)

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 4, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 5 — Generate Skills

Emit: `━━━ Phase 5/12 — Skills ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/generation/generate-skills.md` and follow it.

**Input**: `$FORGE_ROOT/meta/skills/` + `.forge/config.json` (installedSkills) + discovery context + knowledge base
**Output**: `.forge/skills/` (role-specific skill sets)

### Completeness Guard

After skill generation completes, verify that all required config fields are present
and non-empty in `.forge/config.json`. This prevents an eager model from producing
a partial config that would break downstream phases.

1. Read the current `.forge/config.json`.
2. Check every field listed in `$FORGE_ROOT/sdlc-config.schema.json`'s top-level `required` array:
   `["version", "project", "stack", "commands", "paths"]`.
3. For each required field, also check the nested `required` sub-fields:
   - `project.required`: `["prefix", "name"]`
   - `commands.required`: `["test"]`
   - `paths.required`: `["engineering", "store", "workflows", "commands", "templates"]`
4. A field is considered "missing or empty" if it is absent, `null`, an empty string `""`,
   or an empty object `{}` (for object-type fields).
5. If all required fields are present and non-empty → proceed.
6. If any field is missing or empty → halt. Display a prompt:

```
△ Init Completeness Guard — missing required config fields:
  · project.prefix — short project prefix (e.g. ACME)
  · commands.test  — test command (e.g. npm test)

Provide values for each missing field, then re-run Phase 5 or
type each value now to continue:
```

The guard emits a clear human-readable message listing every missing field with a short
hint. It does not write a partial config. After the user provides values, re-check
before proceeding.

### Write Calibration Baseline

After the completeness guard passes, compute the calibration baseline and write
`calibrationBaseline` into `.forge/config.json`. The baseline records the state of
the project at calibration time so `/forge:calibrate` can detect drift later.

1. Read `.forge/config.json` to get the current config.
2. Read `$FORGE_ROOT/.claude-plugin/plugin.json` to get `version`.
3. Read `{KB_PATH}/MASTER_INDEX.md` and compute a SHA-256 hash of the semantic content:
   - Strip blank lines and lines that start with `<!--` (comment lines).
   - Hash the remaining lines joined with newline.
   - Command (substitute actual KB_PATH value for `{KB_PATH}`):
     ```
     node -e "const crypto=require('crypto'),fs=require('fs'); const lines=fs.readFileSync('{KB_PATH}/MASTER_INDEX.md','utf8').split('\n').filter(l=>l.trim()&&!l.trim().startsWith('<!--')); console.log(crypto.createHash('sha256').update(lines.join('\n')).digest('hex'))"
     ```
4. List completed sprint IDs from `.forge/store/sprints/` — sprints whose `status` is
   `"done"` or `"retrospective-done"`. For a fresh init this will be empty.
   - Command:
     ```
     node -e "const fs=require('fs'),p='.forge/store/sprints'; try{const files=fs.readdirSync(p).filter(f=>f.endsWith('.json')); const done=files.map(f=>JSON.parse(fs.readFileSync(p+'/'+f,'utf8'))).filter(s=>['done','retrospective-done'].includes(s.status)).map(s=>s.sprintId); console.log(JSON.stringify(done));}catch(e){console.log('[]')}"
     ```
5. Compute today's ISO date (`YYYY-MM-DD`):
   - Command: `date -u +"%Y-%m-%d"`
6. Build the `calibrationBaseline` object:
   ```json
   {
     "lastCalibrated": "<ISO date from step 5>",
     "version": "<plugin version from step 2>",
     "masterIndexHash": "<SHA-256 from step 3>",
     "sprintsCovered": <array from step 4>
   }
   ```
7. Write the updated config back to `.forge/config.json` — merge `calibrationBaseline`
   into the existing config object (do not overwrite other fields).
   - Use `node -e "..."` with `fs.readFileSync` / `JSON.parse` / `JSON.stringify` / `fs.writeFileSync`
   - Pattern: read → parse → assign `config.calibrationBaseline = {...}` → stringify → write.

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 5, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 6 — Generate Templates

Emit: `━━━ Phase 6/12 — Templates ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/generation/generate-templates.md` and follow it.

**Input**: `$FORGE_ROOT/meta/templates/` + discovery context + knowledge base
**Output**: `.forge/templates/`

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 6, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 7 — Generate Atomic Workflows

Emit: `━━━ Phase 7/12 — Workflows ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/generation/generate-workflows.md` and follow it.

**Input**: `$FORGE_ROOT/meta/workflows/` + `.forge/personas/` + `.forge/skills/` + templates + discovery context + knowledge base
**Output**: `.forge/workflows/` (16 atomic + 2 orchestration = 18 workflow files)

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 7, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 8 — Generate Orchestration

Emit: `━━━ Phase 8/12 — Orchestration ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/generation/generate-orchestration.md` and follow it.

**Input**: `$FORGE_ROOT/meta/workflows/meta-orchestrate.md` + generated atomic workflows
**Output**: `.forge/workflows/orchestrate_task.md`, `.forge/workflows/run_sprint.md`

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 8, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 9 — Generate Commands

Emit: `━━━ Phase 9/12 — Commands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/generation/generate-commands.md` and follow it.

**Input**: generated workflows
**Output**: `.claude/commands/` (standalone, non-namespaced slash commands)

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
