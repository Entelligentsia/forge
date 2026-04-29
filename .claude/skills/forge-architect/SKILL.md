---
name: forge-architect
description: Design and plan changes to the Forge plugin source. Use when architecting a new feature, planning a bug fix, or assessing blast radius of a proposed change to forge/. Ensures two-layer architecture compliance and CLAUDE.md adherence.
---

# Forge Architect

Design and plan changes to the Forge plugin source (`forge/`).

## Iron Laws

1. ONLY edit files in `forge/`. NEVER edit `.forge/` or `engineering/` to fix Forge itself.
2. Every change to a `.cjs` tool must be preceded by a failing test.
3. Schema changes that affect entity lifecycle require concepts diagram updates.
4. Version bump required for material changes. Migration entry required. Tests must pass.
5. Silent continuation past failures is never acceptable.

## Procedure

### Step 1 — Read the requirement

Read the GitHub issue, feature request, or bug report. Extract:
- What needs to change
- Why it needs to change
- Expected outcome

### Step 2 — Determine the target layer

Apply the two-layer decision rule:

| Question | Target |
|----------|--------|
| "Am I fixing/building Forge itself?" | `forge/` — the plugin source |
| "Am I executing a sprint task for this project?" | Use Forge commands; they write to `engineering/` and `.forge/` |

If the change belongs in `forge/`, proceed. If not, stop — the wrong skill was invoked.

### Step 3 — Identify affected files

Map the requirement to concrete files. Check these directories:

| Change type | Where to look |
|-------------|---------------|
| Workflow behaviour | `forge/meta/workflows/meta-*.md` |
| Persona or skill | `forge/meta/personas/` or `forge/meta/skills/` |
| Hook logic | `forge/hooks/*.js` |
| Tool script | `forge/tools/*.cjs` |
| Tool library | `forge/tools/lib/*.cjs` |
| Schema | `forge/schemas/*.schema.json` |
| Command | `forge/commands/*.md` |
| Init template | `forge/init/**/*.md` |
| Plugin config | `forge/.claude-plugin/plugin.json` |

For each identified file, note the specific section or function that needs modification.

### Step 4 — Assess blast radius

Answer these questions:

1. **Version bump required?** — Does the change affect installed projects? (bug fixes, workflow changes, tool spec changes, schema changes, new commands/hooks = yes; docs-only = no)
   **Beware mis-classification:** Plans routinely mark bug fixes as "not material" when they are. When in doubt, bump.
2. **Migration required?** — If version bump, what `regenerate` targets are needed? Use **granular sub-targets** (e.g., `"workflows:orchestrate_task"`) not bare categories (e.g., `"workflows"`). The update command supports `category:sub_target` syntax.
3. **Schema change?** — If yes, the concepts diagram in `docs/concepts/*.md` must also be updated.
4. **`.cjs` tool modification?** — If yes, the test-first rule applies: write failing test first.
5. **New meta file?** — If adding to `forge/meta/`, update the mapping table in `forge/tools/build-manifest.cjs` and regenerate `forge/schemas/structure-manifest.json`.
6. **Security scan needed?** — All version bumps require a scan before push.

### Step 5 — Produce the implementation plan

Write a concrete plan with:
- Each file to modify, with path and approximate line numbers
- What to change in each file
- Order of operations (test-first for tools, meta sources before generated output)
- CLAUDE.md compliance checklist:
  - [ ] Version bump in `plugin.json`
  - [ ] Migration entry in `migrations.json` (granular sub-targets)
  - [ ] CHANGELOG entry
  - [ ] `build-manifest.cjs` run (if meta files changed)
  - [ ] `gen-integrity.cjs` run
  - [ ] Health.md EXPECTED hash update
  - [ ] Test suite pass
  - [ ] Security scan + report saved
  - [ ] Security index + README table updated

### Step 6 — Flag risks and trade-offs

Note any:
- Breaking changes (require `breaking: true` in migration + manual steps)
- Backward compatibility concerns
- Files that should NOT be modified (generated output in `.forge/`, dogfooding artifacts in `engineering/`)
- **High-risk areas:** Changes to `/forge:update` or `forge/hooks/check-update.js` are
  especially risky — verify the update flow has been considered end-to-end