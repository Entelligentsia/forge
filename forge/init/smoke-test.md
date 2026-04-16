# Smoke Test

## Purpose

Validate the generated SDLC instance before handing off to the developer.
Self-correct up to once per failing component.

## Setup

Read the configured KB path:

```sh
KB_PATH: !`node "$FORGE_ROOT/tools/manage-config.cjs" get paths.engineering 2>/dev/null || echo "engineering"`
```

## Checks

### 1. Structural — all expected files exist

- `.forge/config.json`
- `{KB_PATH}/architecture/INDEX.md` and sub-docs
- `{KB_PATH}/business-domain/INDEX.md` and `entity-model.md`
- `{KB_PATH}/stack-checklist.md`
- All 18 workflows in `.forge/workflows/`
- All commands in `.claude/commands/`
- All templates in `.forge/templates/`
- `.forge/schemas/` (all JSON Schema files)

### 2. Referential — internal links resolve

- Orchestrator's workflow paths point to existing files
- Templates referenced in workflows exist
- Architecture INDEX.md links resolve
- Commands reference existing workflow files

### 3. Tool execution

- `node "$FORGE_ROOT/tools/validate-store.cjs" --dry-run` runs without error

### 4. Template coherence

- Templates reference entities that exist in `{KB_PATH}/business-domain/entity-model.md`

### 5. Config validation

- `.forge/config.json` validates against `sdlc-config.schema.json`

## Self-Correction

If a check fails:
1. Log the specific failure
2. Attempt to regenerate the failing component (re-read the relevant
   generation prompt and re-execute)
3. Re-run the failed check
4. If still failing, report to user with diagnostic

## Stamp

After all checks pass (or self-correction is complete), write two files that
anchor this project to the installed Forge version. These are required for
`/forge:update` to detect workflow drift on future upgrades.

### 1. Generation manifest

Run:

```sh
node "$FORGE_ROOT/tools/generation-manifest.cjs" record-all
```

This hashes every generated file in `.forge/workflows/`, `.forge/personas/`,
`.forge/skills/`, `.forge/templates/`, and `.claude/commands/`, writing
`.forge/generation-manifest.json`. `/forge:update` reads this to distinguish
pristine generated files from user-modified ones when offering to clean up
retired filenames.

### 2. Update-check cache

Read the installed version:

```sh
node -e "const p=require('$FORGE_ROOT/.claude-plugin/plugin.json'); console.log(p.version);"
```

Determine distribution from `$FORGE_ROOT` path:
- Contains `/cache/skillforge/forge/` → `forge@skillforge`
- Anything else → `forge@forge`

Write `.forge/update-check-cache.json`:

```json
{
  "migratedFrom": "<installed_version>",
  "localVersion": "<installed_version>",
  "distribution": "<distribution>",
  "forgeRoot": "<FORGE_ROOT>"
}
```

This stamps the init version as the migration baseline. Without it,
`/forge:update` has no baseline and silently reports "no pending migrations"
even when workflows are stale.

## Report

Output a summary:
- Knowledge base: doc count, entity count, checklist items
- Generated artifacts: workflow count, command count, template count, schema count
- Smoke test: pass/fail per check, any self-corrections applied
- Confidence rating (percentage)
- Lines marked `[?]` that need human verification
- Next step: review `{KB_PATH}/` docs, then run `/sprint-plan`
