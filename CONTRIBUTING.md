# Contributing to Forge

## Base-Pack Build Script

The `forge/tools/build-base-pack.cjs` script regenerates `forge/init/base-pack/`
from meta-sources in `forge/meta/`.

### When to run it

Run `npm run build-base-pack` whenever any of the following change:

- A meta-persona file in `forge/meta/personas/meta-*.md`
- A meta-skill file in `forge/meta/skills/meta-*.md`
- A meta-workflow file in `forge/meta/workflows/meta-*.md` (or `_fragments/`)
- `forge/tools/build-base-pack-rules.json` (the genericization rule map)

If you modify a base-pack-only file (personas: librarian, orchestrator, product-manager;
skills: librarian-skills, store-custodian-skills; workflows: run_sprint.md, quiz_agent.md;
commands: enhance.md; templates: COST_REPORT_TEMPLATE.md, PLAN_SUMMARY_TEMPLATE.json),
you do NOT need to run the build script — those files are copied verbatim and your edit
will be preserved on the next run.

### How to run it

```bash
npm run build-base-pack
# or equivalently:
node forge/tools/build-base-pack.cjs --forge-root forge
```

The build is idempotent — running it twice produces byte-identical output.

### What the script does

For each category of base-pack content:

1. **Personas (meta-backed: 6 files)**: Strip YAML frontmatter and
   `## Generation Instructions` from meta-persona files. Apply structural
   transformation (Symbol+Banner+Role → first-person Identity block with
   banner command, `## What the X Needs to Know` → `## What I Need to Know`,
   add `## Project Context` with `{{PLACEHOLDER}}` slots). Apply string replacements.

2. **Personas (base-pack-only: 3 files)**: Copy verbatim from existing base-pack.
   Apply string replacements. (librarian, orchestrator, product-manager)

3. **Skills (meta-backed: 7 files)**: Strip `## Generation Instructions` and
   `file_ref` from frontmatter. Promote `### ` headings to `## `. Insert
   `{{ROLE_SKILL_PROJECT_CONTEXT}}` placeholder. Apply string replacements.

4. **Skills (base-pack-only: 2 files)**: Copy verbatim from existing base-pack.
   Apply string replacements. (librarian-skills, store-custodian-skills)

5. **Workflows (meta-backed: 16 files)**: Preserve YAML frontmatter verbatim
   (required by acceptance gate tests). Strip `## Generation Instructions` and
   `## Purpose`. Replace `# 🌱 Meta-Workflow: Title` with `# Title`. Apply
   string replacements.

6. **Workflows (copy-verbatim: 2 files)**: Copy from existing base-pack.
   Apply string replacements. (run_sprint.md — null meta source;
   quiz_agent.md — see deferral note below)

7. **Workflow Fragments (4 files)**: Copy verbatim from `meta/workflows/_fragments/`.

8. **Templates (all 10 files)**: All templates are sourced from existing base-pack
   (not meta templates — see drift surface note below). Strip `## Generation
   Instructions` if present. Apply string replacements.

9. **Commands (15 generated + 1 verbatim)**: Generate from the 16-entry metadata
   table in `build-base-pack-rules.json`. `enhance.md` is copied verbatim from
   existing base-pack (ENHANCE_AGENT_SENTINEL — see T08 follow-up).

### Genericization rules

`build-base-pack-rules.json` defines the `stringReplacements` array. Each entry
has `{ "from": "literal string", "to": "replacement" }`. Rules are applied to
all generated output after structural transformation.

Key substitutions:
- `"Forge Architect"` → `"{{PROJECT_NAME}} Architect"`
- `"Forge Engineer"` → `"{{PROJECT_NAME}} Engineer"`
- `"Forge Collator"` → `"{{PROJECT_NAME}} Collator"`
- `"Forge Supervisor"` → `"{{PROJECT_NAME}} Supervisor"`
- `"Forge QA Engineer"` → `"{{PROJECT_NAME}} QA Engineer"`
- `"Forge Orchestrator"` → `"{{PROJECT_NAME}} Orchestrator"`
- `"Forge Bug Fixer"` → `"{{PROJECT_NAME}} Bug Fixer"`

To add a new substitution, add an entry to `stringReplacements` in
`build-base-pack-rules.json`.

### Template drift surface (known limitation)

The build script reads template content from `forge/init/base-pack/templates/`
(existing base-pack), NOT from `forge/meta/templates/meta-*.md`.

This is intentional: meta templates describe the STRUCTURE of templates for LLM
generation guidance — they do not contain actual template body content
(the `{PLACEHOLDER}` tokens used at runtime live only in the base-pack files).

**Consequence**: If you edit `forge/meta/templates/meta-plan.md`, the change will
NOT flow into `PLAN_TEMPLATE.md` automatically. You must also update the
base-pack template directly.

A future task should either:
(a) Make `meta/templates/` authoritative (add actual content to meta templates), or
(b) Remove `meta/templates/` as dead code.

Until that task ships, treat edits to `meta/templates/` as documentation-only.

### quiz_agent.md genericization deferral

`quiz_agent.md` contains Forge-plugin-specific quiz questions (asking about
Node.js version, event record format, store entity types specific to Forge).
The string replacements still apply (`**Forge QA Engineer**` →
`**{{PROJECT_NAME}} QA Engineer**`), but the quiz QUESTIONS themselves remain
Forge-specific in this version.

Defining correct generic placeholder questions is a design decision deferred to
a follow-up task. Until that task ships, `quiz_agent.md` is treated as
copy-verbatim from the existing base-pack.

### Tests

```bash
# Unit tests for build-base-pack.cjs (including idempotency check)
node --test forge/tools/__tests__/build-base-pack.test.cjs

# Acceptance gate: {{PLACEHOLDER}} coverage in base-pack files
node --test forge/tools/__tests__/placeholder-coverage.test.cjs

# Existing acceptance gates (must remain green)
node --test forge/tools/__tests__/phase-frontmatter.test.cjs
node --test forge/tools/__tests__/orchestrator-purity.test.cjs
node --test forge/tools/__tests__/base-pack-byte-budget.test.cjs
node --test forge/tools/__tests__/orchestrator-base-pack-parity.test.cjs
```
