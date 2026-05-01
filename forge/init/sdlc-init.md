# Forge Init — 4-Phase Orchestration

You are bootstrapping a complete AI-SDLC instance for the project in the
current working directory. Execute these 4 phases in order.

Set `$FORGE_ROOT` to the forge plugin directory (the parent of this file's
directory — the folder containing `meta/` and `init/`).

---

## Phase header rendering

Every phase below opens with a phase banner rendered by `banners.cjs --phase`:

```sh
node "$FORGE_ROOT/tools/banners.cjs" --phase {N} 4 "{Name}" {bannerKey}
```

| Phase | Name | Banner key |
|-------|------|------------|
| 1 | Collect | `north` |
| 2 | Discover | `oracle` |
| 3 | Materialize | `ember` |
| 4 | Register | `forge` |

`banners.cjs` auto-detects `NO_COLOR` and non-tty stdout; CI runs render plain.

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
KB_PATH=$(node -e "try{console.log(require('./.forge/config.json').paths.engineering)}catch{console.log('engineering')}")
```

---

## Phase 1 — Collect

Render the phase header:

```sh
node "$FORGE_ROOT/tools/banners.cjs" --phase 1 4 "Collect" north
```

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

After writing `.forge/config.json`, write `mode` as `"full"` unconditionally:

```sh
node "$FORGE_ROOT/tools/manage-config.cjs" set mode "full"
```

The fast/full mode distinction is obsolete in the 4-phase init. The `mode`
field is written as `"full"` to remain compatible with tools that read it.

### Marketplace Skills

Read `$FORGE_ROOT/meta/skill-recommendations.md` for the full mapping and rationale.

Using the stack discovered above, look up matching skills from the recommendation
mapping. For each match:

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
7. **Track skipped skills for the Report.** Build a list of every recommended
   marketplace skill that was NOT installed (either skipped or not selected).
   For each, record `{ name, marketplace, confidence, reason }`. This list is
   emitted in the post-init Report.

**If the user skips or installs none:** proceed without blocking.

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 1, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 2 — Discover

Render the phase header:

```sh
node "$FORGE_ROOT/tools/banners.cjs" --phase 2 4 "Discover" oracle
```

### Step 2a — Scaffold directories

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

### Step 2b — KB doc fan-out (parallel)

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

### Step 2c — Generate index files and MASTER_INDEX (sequential)

After all leaf docs are written:

1. **`{KB_PATH}/architecture/INDEX.md`** — list and link to the 5 architecture docs
2. **`{KB_PATH}/business-domain/INDEX.md`** — list and link to entity-model.md
3. **`{KB_PATH}/MASTER_INDEX.md`** — scaffold with section headings linking to both
   INDEX files and stack-checklist; include `## Domain Entities` section listing
   discovered entities (one per line, for `build-init-context.cjs` to parse)

Generate these sequentially (each builds on what's already on disk).

### Step 2d — Retry any failed docs

If any Step 2b subagent returned `FAILED:`, re-spawn only those in a single Agent call.
Any still failing after one retry: halt and surface the id list.

### Step 2e — Construct project-context.json (inline)

After all KB docs are written and the MASTER_INDEX is in place, construct
`.forge/project-context.json` inline (do NOT spawn a subagent for this step —
the data is already in working memory from the Phase 1 discovery context and
the KB fan-out above).

Using the `x-placeholder` annotations from
`$FORGE_ROOT/schemas/project-context.schema.json` as a guide, map discovered
facts to schema fields:

- `project.name` ← `config.project.name` (required — must be a non-empty string)
- `project.prefix` ← `config.project.prefix` (required — must be a non-empty string)
- `project.description` ← extracted from discovery; default `""`
- `project.stack` ← array of stack items from Phase 1; default `[]`
- `project.commands.test` ← discovered test command; default `""`
- `project.commands.build` ← discovered build command; default `""`
- `project.commands.deploy` ← discovered deploy command; default `""`
- `architecture.frameworks.backend` ← backend framework; default `""`
- `architecture.frameworks.frontend` ← frontend framework; default `""`
- `architecture.frameworks.database` ← database; default `""`
- `architecture.dataAccess` ← data access pattern; default `""`
- `architecture.deployment` ← deployment target; default `""`
- `architecture.keyDirectories` ← array of key source directories; default `[]`
- `entities` ← array of domain entity names; default `[]`
- `conventions.branching` ← branching strategy; default `""`
- `conventions.taskIdFormat` ← task ID format; default `""`
- `impactCategories` ← array of impact/risk category labels; default `[]`
- `technicalDebt` ← array of known debt items; default `[]`
- `deployment.environments` ← array of `{name, frontend, backend, region}` objects; default `[]`
- `deployment.impactNotes` ← freeform deployment notes; default `""`
- `verification.typeCheck`, `.lint`, `.test`, `.build`, `.infraBuild` ← commands; defaults `""`
- `skillWiring` ← array of `{skill, personas[]}` from `config.installedSkills`; default `[]`

Write the JSON to `.forge/project-context.json`.

**Structural validation (no AJV — built-ins only):** check that
`project.name` and `project.prefix` are present non-empty strings, and that
all array fields (`project.stack`, `entities`, `impactCategories`,
`technicalDebt`, `architecture.keyDirectories`, `deployment.environments`,
`skillWiring`) are arrays. A structural validation failure halts Phase 2 with
a descriptive error such as:
```
× Phase 2 validation failed: project.name is missing or empty.
  Check that config.json contains a valid project.name field.
```

**File location:** `.forge/project-context.json` — NOT under `.forge/store/`
(consistent with project-context.schema.json being a non-store entity).

### Step 2f — Write Calibration Baseline

After all KB docs and `project-context.json` are written, compute and write
`calibrationBaseline` into `.forge/config.json`:

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
{ "lastPhase": 2, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 3 — Materialize

Render the phase header:

```sh
node "$FORGE_ROOT/tools/banners.cjs" --phase 3 4 "Materialize" ember
```

This phase is deterministic and requires no LLM calls.

### Step 3a — Build project brief

Run `build-init-context.cjs` to produce the project brief (needed by the
substitution engine to validate context):

```sh
node "$FORGE_ROOT/tools/build-init-context.cjs" \
  --config    .forge/config.json \
  --personas  .forge/personas \
  --templates .forge/templates \
  --kb        "$KB_PATH" \
  --out       .forge/init-context.md \
  --json-out  .forge/init-context.json
```

The script prints `〇 Brief written — N personas, M templates, K architecture docs`
on success. If it exits non-zero, halt and surface the error.

(At this point `.forge/personas/` and `.forge/templates/` are empty — brief will
have stub entries. The full personas/templates are produced by Phase 3b below.)

### Step 3b — Substitute placeholders (base-pack materialisation)

Call `substitute-placeholders.cjs` to walk the base-pack and write all structural
elements to their output directories:

```sh
node "$FORGE_ROOT/tools/substitute-placeholders.cjs" \
  --forge-root "$FORGE_ROOT" \
  --base-pack  "$FORGE_ROOT/init/base-pack" \
  --config     .forge/config.json \
  --context    .forge/project-context.json \
  --out        .
```

Output directories (managed by the tool's `SUBDIR_OUTPUT_MAP`):
- `base-pack/commands/`  → `.claude/commands/forge/`
- `base-pack/personas/`  → `.forge/personas/`
- `base-pack/skills/`    → `.forge/skills/`
- `base-pack/workflows/` → `.forge/workflows/`
- `base-pack/templates/` → `.forge/templates/`

Required keys that must exist in `config.json` + `project-context.json`:
- `PROJECT_NAME` (from `project-context.project.name`)
- `PREFIX` (from `config.project.prefix`)

If `project-context.json` is absent or missing required keys, halt Phase 3 with:
```
× Phase 3 aborted: project-context.json is missing or incomplete.
  Ensure Phase 2 (Discover) completed successfully and try again.
```

### Step 3c — build-overlay.cjs smoke test

After `substitute-placeholders.cjs` writes all artifacts, run a smoke test to
verify the T01_6 runtime contract resolves end-to-end:

```sh
node "$FORGE_ROOT/tools/build-overlay.cjs" --task INIT-SMOKE-TEST --format json 2>&1
```

**Expected exit behaviour:** `build-overlay.cjs` reads `.forge/store/tasks/` and
`.forge/config.json`. At Phase 3 time, the store is not yet seeded (that happens
in Phase 4). The tool will exit 1 with a "task not found" error. This is expected
and constitutes a passing smoke test — it confirms the binary is functional and
can resolve its dependencies.

**Warning surface:** when exit code is non-zero, emit:
```
⚠ build-overlay smoke-test: task INIT-SMOKE-TEST not found in store (expected — store not yet seeded). Overlay binary is functional.
```

When exit code is 0 (unexpected but not harmful), emit:
```
〇 build-overlay smoke-test: passed.
```

In neither case does Phase 3 halt — the smoke test result is informational.

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 3, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 4 — Register

Render the phase header:

```sh
node "$FORGE_ROOT/tools/banners.cjs" --phase 4 4 "Register" forge
```

This phase is deterministic and requires no LLM calls. Execute all steps in order.

### Step 4-1 — Tools registration

Read `$FORGE_ROOT/init/generation/generate-tools.md` and follow it.

**Input**: `.forge/config.json`
**Output**: `paths.forgeRoot` written to `.forge/config.json`, schema copies to `.forge/schemas/`

### Step 4-2 — structure-versions.json

Write `.forge/structure-versions.json` (NOT under `.forge/store/`):

```sh
node "$FORGE_ROOT/tools/manage-versions.cjs" init
```

The tool reads `$FORGE_ROOT/.claude-plugin/plugin.json` for `basePackVersion` and
`$FORGE_ROOT/schemas/project-overlay.schema.json` for `overlayToolVersion` (falls back
to `"1.0.0"` if the field is absent). The call is idempotent — if the file already exists,
the tool exits 0 without overwriting.

**`source: 'base-pack'`:** per T05 contract.

### Step 4-3 — generation-manifest.json

Run:

```sh
node "$FORGE_ROOT/tools/generation-manifest.cjs" record-all
```

This records file hashes for all generated artifacts.

### Step 4-4 — persona-pack.json

Run:

```sh
node "$FORGE_ROOT/tools/build-persona-pack.cjs" \
  --out .forge/cache/persona-pack.json
```

### Step 4-5 — context-pack.md / context-pack.json

Run:

```sh
node "$FORGE_ROOT/tools/build-context-pack.cjs" \
  --arch-dir "$KB_PATH/architecture" \
  --out-md .forge/cache/context-pack.md \
  --out-json .forge/cache/context-pack.json
```

### Step 4-6 — init-context.json / init-context.md (final rebuild)

Run `build-init-context.cjs` again now that personas and templates are on disk:

```sh
node "$FORGE_ROOT/tools/build-init-context.cjs" \
  --config    .forge/config.json \
  --personas  .forge/personas \
  --templates .forge/templates \
  --kb        "$KB_PATH" \
  --out       .forge/init-context.md \
  --json-out  .forge/init-context.json
```

### Step 4-7 — Store seed

Seed the store with a project entry:

```sh
node "$FORGE_ROOT/tools/seed-store.cjs"
```

### Step 4-8 — Update-check cache

Write the update-check cache so `/forge:health` and the check-update hook
have a baseline anchored to the installed version:

```sh
node -e "
const fs = require('fs');
const pluginPkg = JSON.parse(fs.readFileSync('$FORGE_ROOT/.claude-plugin/plugin.json', 'utf8'));
const cache = {
  lastChecked: new Date().toISOString(),
  installedVersion: pluginPkg.version,
  latestVersion: pluginPkg.version,
  upToDate: true
};
fs.mkdirSync('.forge', { recursive: true });
fs.writeFileSync('.forge/update-check-cache.json', JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('ノ update-check-cache.json written');
"
```

### Step 4-9 — Tomoshibi (refresh-kb-links)

Invoke Tomoshibi using the Skill tool to ensure every coding-agent instruction
file in the project has up-to-date links to the Forge knowledge base and
generated workflow entry points:

```
Use the Skill tool:
  skill: "forge:refresh-kb-links"
```

If the Skill tool invocation is unavailable in the current context, fall back to
emitting a one-line advisory:
```
△ Run /forge:refresh-kb-links to wire KB links into your agent instruction files.
```

### Step 4-10 — Git hygiene — gitignore transient store paths

`.forge/store/events/` accumulates one JSON file per agent phase per task or
bug. For an active project this can grow to many hundreds of files — they are
transient execution logs, not source artifacts, and should not be committed
to version control.

1. Check whether the project root contains a `.gitignore` file:
   ```sh
   ls .gitignore 2>/dev/null
   ```
   If absent, skip this step.

2. Check whether `.forge/store/events/` is already ignored. Treat any of
   the following lines as a match (each matched as a literal substring on
   any non-comment, non-blank line):
   - `.forge/store/events/`
   - `.forge/store/events`
   - `.forge/store/`
   - `.forge/`

   If a match is found, emit `〇 .forge/store/events/ already gitignored — skipped.`

3. If no match is found, prompt:
   ```
   〇 .forge/store/events/ holds transient agent event logs and should not be
     committed. Add it to .gitignore now? [Y/n]
   ```
   - **Y / Enter** → append to `.gitignore`:
     ```
     # Forge — transient agent event logs (one file per phase, do not commit)
     .forge/store/events/
     ```
     Emit `〇 Appended .forge/store/events/ to .gitignore.`
   - **n** → emit `〇 Skipped — manage .gitignore manually.` and continue.

Delete `.forge/init-progress.json` — init is complete:
```sh
rm -f .forge/init-progress.json
```

---

## Report

Open the report with the closing celebration banner:

```sh
node "$FORGE_ROOT/tools/banners.cjs" forge
node "$FORGE_ROOT/tools/banners.cjs" --subtitle "灯 SDLC ready · all artifacts generated · /sprint-plan to begin"
```

After all phases complete, report to the user:
- Knowledge base: doc count, entity count, checklist item count
- Generated artifacts: workflow count, command count, template count
- Smoke test results
- Confidence rating

Emit a one-line rename note:
```
〇 To rename the KB folder later: (a) rename the folder on disk, (b) run
  node "$FORGE_ROOT/tools/manage-config.cjs" set paths.engineering <new-name>
```

**Recommended skills (if any were skipped in Phase 1):**

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

If you encountered any problems during this init run, file them with `/forge:report-bug` —
it gathers context automatically and opens an issue in the Forge repository.
