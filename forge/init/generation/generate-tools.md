# Generation: Tools

## Purpose

Install schemas from the Forge plugin into the project, and record the plugin
root path so generated workflows can invoke tools without hardcoding paths.

Forge tools (`collate.cjs`, `manage-config.cjs`, `validate-store.cjs`,
`seed-store.cjs`, `generation-manifest.cjs`) ship with the plugin and are
invoked directly via `$FORGE_ROOT/tools/`. They are never copied to the project.

## Inputs

- `$FORGE_ROOT/schemas/` — JSON Schema files for all store types
- `.forge/config.json` — target paths

## Outputs

- `.forge/schemas/` — four JSON Schema files
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

### Step 2 — Copy schemas

Copy all four files from `$FORGE_ROOT/schemas/` to `.forge/schemas/`:

| Source | Destination |
|--------|-------------|
| `$FORGE_ROOT/schemas/task.schema.json` | `.forge/schemas/task.schema.json` |
| `$FORGE_ROOT/schemas/event.schema.json` | `.forge/schemas/event.schema.json` |
| `$FORGE_ROOT/schemas/sprint.schema.json` | `.forge/schemas/sprint.schema.json` |
| `$FORGE_ROOT/schemas/bug.schema.json` | `.forge/schemas/bug.schema.json` |

Create `.forge/schemas/` if it does not exist.

### Step 3 — Verify

```sh
node "$FORGE_ROOT/tools/validate-store.cjs" --dry-run
```

If it exits non-zero, report the error. Do not proceed to Phase 9 until this passes.

## Notes

- `paths.forgeRoot` is refreshed by `/forge:update` at each upgrade, so the
  stored path stays current even after plugin reinstallation.
- Generated workflow files reference tools as:
  `node "$(cat .forge/config.json | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync("/dev/stdin","utf8")).paths.forgeRoot)')/tools/<tool>.cjs"`
  — or more simply, the generation step reads `paths.forgeRoot` from config
  and bakes the resolved path directly into each workflow file.
