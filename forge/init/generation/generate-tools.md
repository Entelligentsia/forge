# Generation: Tools

## Purpose

Record the plugin root path so generated workflows can invoke tools without
hardcoding paths, and install validation schemas for local use.

Forge tools (`collate.cjs`, `manage-config.cjs`, `validate-store.cjs`,
`seed-store.cjs`, `generation-manifest.cjs`, `store-cli.cjs`,
`estimate-usage.cjs`) ship with the plugin and are invoked directly via
`$FORGE_ROOT/tools/`. They are never copied to the project.

Store validation schemas are loaded at runtime from `.forge/schemas/`
(project-installed), `forge/schemas/` (in-tree fallback), or
`$FORGE_ROOT/schemas/` (plugin-installed fallback). During init, schemas
are copied to `.forge/schemas/` so that validation works without relying
on fallback paths.

## Inputs

- `.forge/config.json` — target paths

## Outputs

- `.forge/config.json` — updated with `paths.forgeRoot` (resolved at init time)
- `.forge/schemas/` — JSON Schema copies from the installed plugin

## Instructions

Read `.forge/config.json` for:
- `paths.store` (default: `.forge/store`)

### Step 1 — Record plugin root in config

Resolve the plugin root and store it for use by generated workflows:

```sh
node "$FORGE_ROOT/tools/manage-config.cjs" set paths.forgeRoot "$FORGE_ROOT"
```

This allows generated workflow files to invoke tools via `{paths.forgeRoot}/tools/`
without needing `$CLAUDE_PLUGIN_ROOT` to be available in subagent contexts.

### Step 2 — Copy validation schemas

Copy all JSON Schema files from the installed plugin to the project:

```sh
mkdir -p .forge/schemas
cp "$FORGE_ROOT/schemas/"*.schema.json .forge/schemas/
```

This ensures `store-cli.cjs` and `validate-store.cjs` can validate records
using the full schema (not the minimal fallback) even when the project is
not inside the Forge source tree.

### Step 3 — Verify

```sh
node "$FORGE_ROOT/tools/validate-store.cjs" --dry-run
```

If it exits non-zero, report the error. Do not proceed to Phase 9 until this passes.

### Step 4 — Record hashes

Record all generated artifacts in the generation manifest so health checks
can detect later modifications:

```sh
for f in .forge/schemas/*.schema.json; do
  node "$FORGE_ROOT/tools/generation-manifest.cjs" record "$f"
done
node "$FORGE_ROOT/tools/generation-manifest.cjs" record .forge/config.json
```

## Notes

- `paths.forgeRoot` is refreshed by `/forge:update` at each upgrade, so the
  stored path stays current even after plugin reinstallation.
- `/forge:update-tools` also copies schemas and should be run after upgrades
  to refresh `.forge/schemas/` with any schema changes from the new version.
- Generated workflow files reference tools using a runtime read pattern:
  ```
  FORGE_ROOT: read `paths.forgeRoot` from `.forge/config.json`
  node "$FORGE_ROOT/tools/<tool>.cjs"
  ```
  Do NOT bake the resolved path as a string literal into generated workflow
  files. Keeping `$FORGE_ROOT` as a runtime reference means the workflow
  stays correct across version bumps without requiring regeneration.