# Generation: Tools

## Purpose

Record the plugin root path so generated workflows can invoke tools without
hardcoding paths.

Forge tools (`collate.cjs`, `manage-config.cjs`, `validate-store.cjs`,
`seed-store.cjs`, `generation-manifest.cjs`, `store-cli.cjs`,
`estimate-usage.cjs`) ship with the plugin and are invoked directly via
`$FORGE_ROOT/tools/`. They are never copied to the project.

Store validation schemas are loaded at runtime from `.forge/schemas/`
(project-installed) or `forge/schemas/` (in-tree fallback). During init,
schemas are not copied — they are installed by `/forge:update-tools` after
init completes, or loaded from the in-tree fallback on first use.

## Inputs

- `.forge/config.json` — target paths

## Outputs

- `.forge/config.json` — updated with `paths.forgeRoot` (resolved at init time)

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

### Step 2 — Verify

```sh
node "$FORGE_ROOT/tools/validate-store.cjs" --dry-run
```

If it exits non-zero, report the error. Do not proceed to Phase 9 until this passes.

## Notes

- `paths.forgeRoot` is refreshed by `/forge:update` at each upgrade, so the
  stored path stays current even after plugin reinstallation.
- Generated workflow files reference tools using a runtime read pattern:
  ```
  FORGE_ROOT: read `paths.forgeRoot` from `.forge/config.json`
  node "$FORGE_ROOT/tools/<tool>.cjs"
  ```
  Do NOT bake the resolved path as a string literal into generated workflow
  files. Keeping `$FORGE_ROOT` as a runtime reference means the workflow
  stays correct across version bumps without requiring regeneration.
