# Forge Init — Master Orchestration

You are bootstrapping a complete AI-SDLC instance for the project in the
current working directory. Execute these 11 phases in order.

Set `$FORGE_ROOT` to the forge plugin directory (the parent of this file's
directory — the folder containing `meta/` and `init/`).

---

## Phase 1 — Discover

Emit: `━━━ Phase 1/11 — Discover ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

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

Emit: `━━━ Phase 2/11 — Marketplace Skills ━━━━━━━━━━━━━━━━━━━━━━━━━━`

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

Emit: `━━━ Phase 3/11 — Knowledge Base ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/generation/generate-knowledge-base.md` and follow it.

**Input**: discovery context + meta-personas (for understanding what agents need to know)
**Output**: `engineering/architecture/`, `engineering/business-domain/`, `engineering/stack-checklist.md`

Also scaffold: `.forge/store/` directories, `engineering/sprints/`, `engineering/bugs/`.

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 3, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 4 — Generate Personas

Emit: `━━━ Phase 4/11 — Personas ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/generation/generate-personas.md` and follow it.

**Input**: `$FORGE_ROOT/meta/personas/` + discovery context + generated knowledge base
**Output**: `.forge/personas/` (standalone persona files)

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 4, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 5 — Generate Skills

Emit: `━━━ Phase 5/11 — Skills ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/generation/generate-skills.md` and follow it.

**Input**: `$FORGE_ROOT/meta/skills/` + `.forge/config.json` (installedSkills) + discovery context + knowledge base
**Output**: `.forge/skills/` (role-specific skill sets)

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 5, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 6 — Generate Templates

Emit: `━━━ Phase 6/11 — Templates ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/generation/generate-templates.md` and follow it.

**Input**: `$FORGE_ROOT/meta/templates/` + discovery context + knowledge base
**Output**: `.forge/templates/`

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 6, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 7 — Generate Atomic Workflows

Emit: `━━━ Phase 7/11 — Workflows ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/generation/generate-workflows.md` and follow it.

**Input**: `$FORGE_ROOT/meta/workflows/` + `.forge/personas/` + `.forge/skills/` + templates + discovery context + knowledge base
**Output**: `.forge/workflows/` (14 project-specific workflow files)

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 7, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 8 — Generate Orchestration

Emit: `━━━ Phase 8/11 — Orchestration ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/generation/generate-orchestration.md` and follow it.

**Input**: `$FORGE_ROOT/meta/workflows/meta-orchestrate.md` + generated atomic workflows
**Output**: `.forge/workflows/orchestrate_task.md`, `.forge/workflows/run_sprint.md`

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 8, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 9 — Generate Commands

Emit: `━━━ Phase 9/11 — Commands ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/generation/generate-commands.md` and follow it.

**Input**: generated workflows
**Output**: `.claude/commands/` (standalone, non-namespaced slash commands)

Write `.forge/init-progress.json`:
```json
{ "lastPhase": 9, "timestamp": "<current ISO timestamp>" }
```

---

## Phase 10 — Install Tools

Emit: `━━━ Phase 10/11 — Tools ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

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

Emit: `━━━ Phase 11/11 — Smoke Test ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`

Read `$FORGE_ROOT/init/smoke-test.md` and follow it.

Validates structural completeness, referential integrity, tool execution,
and template coherence. Self-corrects up to once per failing component.

**Output**: `.forge/generation-manifest.json` (file hashes for all generated artifacts),
`.forge/update-check-cache.json` (migration baseline anchored to the installed version)

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

**Next step:** review `engineering/` docs, then run `/sprint-plan`

If you encountered any problems during this init run, file them with `/forge:report-bug` — it gathers context automatically and opens an issue in the Forge repository.
