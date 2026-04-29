---
name: forge-meta-creator
description: Add new workflow, persona, or skill meta sources to Forge. Handles file creation, build-manifest mapping, and regeneration verification. Use when adding a new meta source to forge/meta/.
---

# Forge Meta Creator

Add new workflow, persona, or skill meta sources to the Forge plugin.

## Iron Laws

1. ONLY edit files in `forge/`. NEVER edit `.forge/` or `engineering/` to fix Forge itself.
2. Every change to a `.cjs` tool must be preceded by a failing test.
3. Schema changes that affect entity lifecycle require concepts diagram updates.
4. Version bump required for material changes. Migration entry required. Tests must pass.
5. Silent continuation past failures is never acceptable.

## Where Meta Sources Live

| Type | Directory | Naming convention |
|------|-----------|-------------------|
| Workflows | `forge/meta/workflows/` | `meta-<snake_case>.md` |
| Personas | `forge/meta/personas/` | `meta-<snake_case>.md` |
| Skills | `forge/meta/skills/` | `meta-<snake_case>.md` |

Every meta file must have the `meta-` prefix. This is not optional.

## Procedure

### Step 1 — Create the meta source file

Create `forge/meta/<category>/meta-<name>.md` with the appropriate structure:

**Workflows** — Must include:
- Frontmatter with `name` and `description`
- Phase-by-phase algorithm
- Error recovery table
- Escalation procedure (inlined, not bare function call)

**Personas** — Must include:
- Frontmatter with `name` and `description`
- Role definition and responsibilities
- Hard constraints (Iron Laws)
- Write boundary rules
- Tool access list

**Skills** — Must include:
- Frontmatter with `name` and `description`
- Step-by-step procedure
- Compliance requirements

### Step 2 — Update the build-manifest mapping

Edit `forge/tools/build-manifest.cjs`. Find the `TEMPLATE_MAP` array and add
an entry for the new meta source:

```js
// Workflows
['meta-orchestrate', 'orchestrate_task.md'],
['meta-<name>', '<name>.md'],  // ADD THIS

// Personas
['meta-orchestrator', 'orchestrator.md'],
['meta-<name>', '<name>.md'],  // ADD THIS

// Skills
['meta-engineer-skills', 'engineer-skills.md'],
['meta-<name>', '<name>-skills.md'],  // ADD THIS
```

The map key is the meta filename **without** `.md`. The map value is the
output filename that will be generated in `.forge/<category>/`.

Note: `CUSTOM_COMMAND_TEMPLATE.md` is a one-shot init artifact with no meta
source. Its TEMPLATE_MAP entry must remain `[null, 'CUSTOM_COMMAND_TEMPLATE.md']`.

### Step 3 — Regenerate the structure manifest

```sh
node forge/tools/build-manifest.cjs --forge-root forge/
```

Verify: `forge/schemas/structure-manifest.json` now lists the new file and
the version matches `plugin.json`.

### Step 4 — Regenerate integrity

```sh
node forge/tools/gen-integrity.cjs --forge-root forge/
```

### Step 5 — Run the test suite

```sh
node --test forge/tools/__tests__/*.test.cjs
```

All tests must pass. If any fail, fix before continuing.

### Step 6 — Verify generated output

After the meta source is committed and pushed, users will regenerate their
`.forge/` instance via `/forge:update`. To verify the meta source will generate
correctly, run:

```sh
node forge/tools/build-manifest.cjs --forge-root forge/
```

Then inspect the new entry in `forge/schemas/structure-manifest.json` to confirm:
- The output filename is correct
- The category matches (workflows, personas, or skills)
- The `prefixed` flag is set correctly for the category

### Step 7 — Update migration entry

Adding a new meta source is a material change. Add a migration entry to
`forge/migrations.json` with a granular regenerate target:

```json
"0.X.Y": {
  "version": "0.X.Z",
  "date": "YYYY-MM-DD",
  "notes": "Add <name> <category>.",
  "regenerate": ["<category>:<name>"],
  "breaking": false,
  "manual": []
}
```

Use the granular sub-target syntax: `"workflows:orchestrate_task"`, not bare `"workflows"`.

## Common Mistakes

- **Forgetting the `meta-` prefix** on the filename
- **Forgetting to update `TEMPLATE_MAP`** — the build-manifest script will
  silently skip the file, and it won't appear in generated output
- **Mismatched output filename** — the TEMPLATE_MAP value must match what
  `/forge:regenerate` expects to produce
- **Using a bare category in `regenerate`** — always use `category:sub_target`