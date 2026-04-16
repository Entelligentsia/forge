# Implementation Plan: FEAT-002 — Workflow Fan-Out

> Feature: FEAT-002
> Version target: 0.11.0
> Layer: forge/ (plugin source)
> Sprint: none — follows plugin versioning protocol directly

## Prerequisite: resolve quiz_agent.md origin — ✓ RESOLVED

`quiz_agent.md` had no meta source (`[null, ...]` in build-manifest.cjs), causing it to
be silently skipped on every init. Fixed in v0.10.1:

- Created `forge/meta/workflows/meta-quiz-agent.md` — generates 5–7 project-specific
  KB quiz questions from architecture docs, domain entities, and stack conventions.
- Wired in `build-manifest.cjs`: `['meta-quiz-agent.md', 'quiz_agent.md']`
- Regenerated `structure-manifest.json`

**Decision: quiz_agent belongs in Phase 7 (16 atomic workflows, not 15).** It generates
project-specific content (quiz questions drawn from the KB), making it comparable to
all other Phase 7 workflows. It does NOT include Token Reporting or Event Emission
(invoked inline by other workflows, not by the orchestrator as a task phase).

Phase 7 fan-out plan.json must include 16 entries.

---

## Step 1 — Write failing test for build-init-context.cjs

File: `forge/tools/__tests__/build-init-context.test.cjs`

The test must FAIL before the implementation exists.

Test cases (minimum):

```js
// 1. Snapshot: fixture config + personas + templates + KB → expected markdown
// 2. Determinism: two calls with same inputs → byte-identical output
// 3. Missing installedSkills → empty "Installed skill wiring" block (not an error)
// 4. Custom paths.engineering → architecture docs path uses that value
// 5. Persona symbol extraction: persona file starts with "symbol: 🏛" → appears in brief
// 6. README.md exclusion: README.md in personas dir → not listed in Personas index
```

Fixture structure needed:
```
__tests__/fixtures/init-context/
  config.json           — minimal .forge/config.json
  personas/
    architect.md        — starts with "symbol: 🏛"
    engineer.md         — starts with "symbol: ⚒"
    README.md           — must be excluded
  templates/
    plan.md
    README.md           — must be excluded
  kb/
    architecture/
      01-overview.md
      02-database.md
    MASTER_INDEX.md
```

Run: `node --test forge/tools/__tests__/build-init-context.test.cjs`
Expected: all 6 cases FAIL (tool doesn't exist yet).

---

## Step 2 — Implement forge/tools/build-init-context.cjs

Deterministic script. No LLM. No external dependencies beyond Node built-ins.

### CLI interface
```sh
node build-init-context.cjs \
  --config    .forge/config.json \
  --personas  .forge/personas \
  --templates .forge/templates \
  --kb        engineering \
  --out       .forge/init-context.md \
  --json-out  .forge/init-context.json   # optional, defaults to <out>.json
```

### Algorithm

1. Read and parse `--config` as JSON.
2. Extract:
   - `config.project.name`, `config.project.prefix`
   - `config.stack` (language/framework list, joined)
   - `config.commands.test`, `config.commands.build`, `config.commands.syntaxCheck`,
     `config.commands.lint` (use empty string for missing)
   - All `config.paths.*`
   - `config.installedSkills` (array, default `[]`)
3. Read `--personas` dir. Filter out README.md and any non-.md files.
   For each .md file, extract the symbol:
   - Parse first 10 lines; find line matching `/^symbol:\s*(.+)/i` or a header line
     with a single emoji character.
   - If no symbol found, use `·` as placeholder.
   - Record: `{role, file, symbol, oneLiner}` where oneLiner is the first non-blank,
     non-header, non-YAML line after the symbol declaration.
4. Read `--templates` dir. Filter out README.md and non-.md files.
   Record: filename stem (without .md extension).
5. Read `--kb/architecture/` dir. List .md filenames, sorted.
6. Parse `--kb/MASTER_INDEX.md`. Extract domain entities: look for a section whose
   heading contains "Entities" or "Domain"; extract comma-separated or list-item
   nouns. If not found, use empty list.
7. Compute skill wiring: for each installed skill in `config.installedSkills`,
   look it up in a small hardcoded mapping (same logic as `meta-skill-recommendations.md`)
   to determine which personas it wires to. Record `{skill, personas[]}`.
8. Build the markdown brief. Sort all lists for determinism.
9. Write `--out` (markdown) and `--json-out` (JSON) synchronously.
10. Exit 0 on success, 1 on any error with descriptive message to stderr.

### Output format (markdown)

```markdown
# <project.name> — Init Context

## Commands
{SYNTAX_CHECK} = <value or empty>
{TEST_COMMAND}  = <value>
{BUILD_COMMAND} = <value>
{LINT_COMMAND}  = <value or empty>

## Paths
engineering = <value>
store       = <value>
workflows   = <value>
templates   = <value>
personas    = <value>
commands    = <value>
tools       = <value>

## Personas
<role> | <file-path> | <symbol> | <one-liner>
...

## Templates
<stem>, <stem>, ...

## Architecture Docs
<filename>, <filename>, ...

## Domain Entities
<Entity>, <Entity>, ...

## Installed Skill Wiring
<skill> → <persona>, <persona>
...
(empty block if no installed skills)
```

### Output format (JSON)
```json
{
  "project": { "name": "...", "prefix": "..." },
  "commands": { "syntaxCheck": "...", "test": "...", "build": "...", "lint": "..." },
  "paths": { ... },
  "personas": [{ "role": "...", "file": "...", "symbol": "...", "oneLiner": "..." }],
  "templates": ["plan", "plan-review", ...],
  "architectureDocs": ["01-overview.md", ...],
  "entities": ["User", "Sprint", ...],
  "skillWiring": [{ "skill": "vue-best-practices", "personas": ["supervisor", "engineer"] }]
}
```

Run after implementing: `node --test forge/tools/__tests__/build-init-context.test.cjs`
Expected: all 6 tests PASS.

---

## Step 3 — Author forge/init/workflow-gen-plan.json

16 entries (quiz_agent confirmed as Phase 7; meta-quiz-agent.md created in v0.10.1).

```json
[
  {"id": "architect_sprint_intake",           "meta": "meta-sprint-intake.md",           "persona": "architect"},
  {"id": "architect_sprint_plan",             "meta": "meta-sprint-plan.md",             "persona": "architect"},
  {"id": "architect_approve",                 "meta": "meta-approve.md",                 "persona": "architect"},
  {"id": "architect_review_sprint_completion","meta": "meta-review-sprint-completion.md","persona": "architect"},
  {"id": "plan_task",                         "meta": "meta-plan-task.md",               "persona": "architect"},
  {"id": "implement_plan",                    "meta": "meta-implement.md",               "persona": "engineer"},
  {"id": "update_plan",                       "meta": "meta-update-plan.md",             "persona": "architect"},
  {"id": "update_implementation",             "meta": "meta-update-implementation.md",   "persona": "engineer"},
  {"id": "fix_bug",                           "meta": "meta-fix-bug.md",                 "persona": "bug-fixer"},
  {"id": "commit_task",                       "meta": "meta-commit.md",                  "persona": "engineer"},
  {"id": "review_plan",                       "meta": "meta-review-plan.md",             "persona": "supervisor"},
  {"id": "review_code",                       "meta": "meta-review-implementation.md",   "persona": "supervisor"},
  {"id": "collator_agent",                    "meta": "meta-collate.md",                 "persona": "collator"},
  {"id": "sprint_retrospective",              "meta": "meta-retrospective.md",           "persona": "architect"},
  {"id": "validate_task",                     "meta": "meta-validate.md",                "persona": "qa-engineer"},
  {"id": "quiz_agent",                        "meta": "meta-quiz-agent.md",              "persona": "qa-engineer"}
]
```

Verification before saving: cross-check each `meta` filename against
`ls forge/meta/workflows/` and each `persona` against `ls forge/meta/personas/`.

---

## Step 4 — Rewrite forge/init/generation/generate-workflows.md

Repurpose as the per-subagent rulebook. New shape:

```markdown
# Workflow Generation — Per-Subagent Instructions

You are generating ONE workflow file. You have been given:
1. A project brief (`.forge/init-context.md`) — authoritative for all names and paths
2. A meta-workflow source — your generation instructions
3. A persona file — embed verbatim as the opening section

## Rules

1. Write EXACTLY ONE file: `.forge/workflows/{id}.md`
2. Opening section MUST embed the persona content verbatim (do not paraphrase)
3. All placeholder substitutions ({SYNTAX_CHECK}, {TEST_COMMAND}, {BUILD_COMMAND})
   come from the brief's Commands section — do not invent values
4. All persona names, template names, architecture doc names, and entity names
   MUST appear in the brief — do not invent names not listed there
5. Include Knowledge Writeback and Event Emission steps as defined in the
   meta-workflow's Generation Instructions
6. For review workflows: include a Rationalization Table and "YOU MUST" / "No exceptions"
   gate language (per meta-workflow's Enforcement Quality section)

## Self-check (mandatory last step)

After writing the file:
1. Read back `.forge/workflows/{id}.md`
2. Confirm line 1 contains the persona symbol listed in the brief
3. Confirm all placeholders have been substituted (no literal `{TEST_COMMAND}` remaining)
4. Run: `node .forge/tools/generation-manifest.cjs record .forge/workflows/{id}.md`
5. Return: `done: <first 80 chars of file>` or `FAILED: <reason>`
```

---

## Step 5 — Edit forge/init/sdlc-init.md Phase 7

Replace the current Phase 7 block with:

```markdown
## Phase 7 — Generate Atomic Workflows

Emit: `━━━ Phase 7/12 — Workflows (parallel) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

### Step 7a — Build the project brief

Run:
```sh
node "$FORGE_ROOT/tools/build-init-context.cjs" \
  --config   .forge/config.json \
  --personas .forge/personas \
  --templates .forge/templates \
  --kb       "$KB_PATH" \
  --out      .forge/init-context.md \
  --json-out .forge/init-context.json
```

Assert: `.forge/personas/` contains at least one .md file (not README.md). If empty,
halt with: "△ Phase 4 output missing — no persona files found in .forge/personas/."

Emit: `〇 Brief written — <N> personas, <M> templates, <K> architecture docs`

### Step 7b — Read the fan-out plan

```sh
cat "$FORGE_ROOT/init/workflow-gen-plan.json"
```

This gives you the list of `{id, meta, persona}` entries.

### Step 7c — Check resume state

```sh
cat .forge/init-progress.json
```

If `phase7.workflows` exists, filter the fan-out list to entries whose id is NOT `"done"`.
Emit: `〇 Resuming Phase 7 — <N> remaining workflows`

### Step 7d — Fan-out (parallel)

Read `.forge/init-context.md` once. Read each meta-workflow and persona file.

Spawn ALL remaining subagents in a SINGLE Agent tool message.
For each entry, the subagent prompt is:

```
Read and follow the rulebook:
<contents of $FORGE_ROOT/init/generation/generate-workflows.md>

Project brief (authoritative for all names and substitutions):
<contents of .forge/init-context.md>

Meta-workflow source:
<contents of $FORGE_ROOT/meta/workflows/{meta}>

Primary persona (embed as opening section verbatim):
<contents of .forge/personas/{persona}.md>

Your output file: .forge/workflows/{id}.md
FORGE_ROOT: {FORGE_ROOT}
```

Wait for all subagents to return.

### Step 7e — Collect and retry

For each returned result:
- `done: ...` → mark id as `"done"` in phase7.workflows map
- `FAILED: ...` → mark id as `"failed"`, note reason

If any `"failed"`:
  Emit: `△ <N> workflows failed — retrying once: <list of ids>`
  Spawn failed subagents again in a SINGLE Agent tool message (same prompts).
  Collect results. Any still failing after retry:
    Update phase7.workflows with remaining failures.
    Write `.forge/init-progress.json` (including phase7 map).
    Halt: "× Phase 7 failed — <id-list>. Fix the reported issues, then resume."

All done → update phase7.workflows (all "done").

### Step 7f — Validate

Verify every id in the plan has a non-empty `.forge/workflows/{id}.md`.
Any missing: treat as failed, surface, halt.

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 7, "timestamp": "<ISO>", "phase7": { "<id>": "done", ... } }
```
```

---

## Step 6 — Edit forge/commands/init.md

Update pre-flight plan line for Phase 7:

Before:
```
  7     Workflows             — atomic workflow files → ~14 files
```

After:
```
  7     Workflows             — 16 files generated in parallel → ~1-2 min
```

---

## Step 7 — Update forge/tools/build-manifest.cjs

Add a mapping entry for `workflow-gen-plan.json`:

```js
// In the TEMPLATE_MAP or equivalent structure, add:
['forge/init/workflow-gen-plan.json', null]  // new fan-out table, no generated counterpart
```

Then run:
```sh
node forge/tools/build-manifest.cjs --forge-root forge/
```

Inspect the diff to `forge/schemas/structure-manifest.json` — it should add only
`workflow-gen-plan.json` to the init sources.

---

## Step 8 — Run full test suite

```sh
node --test forge/tools/__tests__/*.test.cjs
```

All tests must pass. Current baseline: 241 tests. After this change: 241 + ≥6 new = ≥247.

If any pre-existing test fails: investigate and fix before proceeding. Do not skip.

---

## Step 9 — Manual end-to-end smoke test

Run `/forge:init` on a throwaway fixture directory (a small single-file project or
a minimal package.json repo). Observe:

- Phase 7 banner appears
- Brief is written: `.forge/init-context.md` exists, ≥50 lines
- Fan-out fires (watch for "Generating workflow:" lines appearing in parallel)
- All 15 `.forge/workflows/*.md` files exist and are non-empty after Phase 7
- Each workflow file's first line contains its expected persona symbol
- Phase 11 smoke test passes
- `/plan` runs successfully on the fixture project

If anything fails: diagnose, fix, re-run. Do not proceed to Step 10 until this passes.

---

## Step 10 — Version bump and plumbing

1. Bump `forge/.claude-plugin/plugin.json`: `"0.10.1"` → `"0.11.0"`

2. Add to `forge/migrations.json`:
```json
{
  "0.10.1": {
    "version": "0.11.0",
    "notes": "Phase 7 of /forge:init now fans out 16 workflow generations in parallel via subagents; adds .forge/init-context.md project brief artifact",
    "regenerate": [],
    "breaking": false,
    "manual": []
  }
}
```

3. Prepend to `CHANGELOG.md`:
```markdown
## [0.11.0] — YYYY-MM-DD

Phase 7 of `/forge:init` now generates all 16 atomic workflow files in parallel using
fanned-out Agent subagents. A compact project brief (`.forge/init-context.md`) is
materialised once from deterministic sources before the fan-out, replacing repeated
full-context re-derivation across serial turns. Reduces Phase 7 wall time from
~15–20 min to ~1–2 min for typical projects.

**Regenerate:** none — this change only affects new inits; existing generated artifacts
are unchanged.
```

---

## Step 11 — Security scan and index update

```sh
# Run scan on source directory
/security-watchdog:scan-plugin forge:forge --source-path forge/
```

- Save full report to `docs/security/scan-v0.11.0.md` (follow CLAUDE.md protocol)
- Prepend row to `docs/security/index.md` table
- Rotate `README.md` Security table: add new row at top, remove oldest row (keep 3 rows total)

---

## Step 12 — Commit

Two commits (or one combined if scan is clean with no separate follow-up needed):

```
feat(init): Phase 7 workflow fan-out with minimal context brief

- add forge/init/workflow-gen-plan.json (16-entry fan-out table)
- add forge/tools/build-init-context.cjs (deterministic brief builder)
- add forge/tools/__tests__/build-init-context.test.cjs (6+ tests)
- rewrite forge/init/generation/generate-workflows.md as per-subagent rulebook
- rewrite Phase 7 in sdlc-init.md as build-brief → fan-out → retry → validate
- update forge/commands/init.md Phase 7 pre-flight description
- bump version 0.10.1 → 0.11.0; add migrations.json entry and CHANGELOG

Reduces Phase 7 from ~16 serial turns to one parallel wave.
```

```
security: scan v0.11.0
```

---

## Acceptance criteria

- [ ] `node --test forge/tools/__tests__/*.test.cjs` — zero failures, ≥247 tests
- [ ] Manual smoke test: Phase 7 completes in ≤2 min wall clock on a simple fixture
- [ ] All 16 `.forge/workflows/*.md` exist and start with their persona's symbol
- [ ] Phase 11 smoke test passes on fixture project
- [ ] `/plan` runs a generated workflow on the fixture project without errors
- [ ] `forge/migrations.json` entry is present for 0.11.0 (from: 0.10.1)
- [ ] `CHANGELOG.md` has `## [0.11.0]` block
- [ ] Security scan report saved at `docs/security/scan-v0.11.0.md`
- [ ] Security index and README.md Security table updated
