# Generation: Tools

## Purpose

Vendor the plugin tools closure and validation schemas into the project so
generated workflows can invoke tools via `node .forge/tools/<tool>.cjs` from
the project root without resolving `$FORGE_ROOT` at runtime.

Store validation schemas are loaded at runtime from `.forge/schemas/`
(project-installed), `forge/schemas/` (in-tree fallback), or
`$FORGE_ROOT/schemas/` (plugin-installed fallback). During init, schemas
are copied to `.forge/schemas/` so that validation works without relying
on fallback paths.

## Inputs

- `.forge/config.json` — target paths

## Outputs

- `.forge/tools/` — vendored plugin tools closure
- `.forge/tools/.forge-tools-version` — version marker for `/forge:health` staleness check
- `.forge/schemas/` — JSON Schema copies from the installed plugin

## Instructions

Read `.forge/config.json` for:
- `paths.store` (default: `.forge/store`)

### Step 1 — Copy validation schemas

Copy all JSON Schema files from the installed plugin to the project:

```sh
mkdir -p .forge/schemas
cp "$FORGE_ROOT/schemas/"*.schema.json .forge/schemas/
```

This ensures `store-cli.cjs` and `validate-store.cjs` can validate records
using the full schema (not the minimal fallback) even when the project is
not inside the Forge source tree.

### Step 2 — Vendor plugin tools

Copy the plugin tools closure into the project's `.forge/tools/` so that
generated artifacts can invoke `node .forge/tools/<tool>.cjs` from the
project root without resolving `$FORGE_ROOT`:

```sh
mkdir -p .forge/tools/lib

# Copy top-level tool files
cp "$FORGE_ROOT/tools/"*.cjs .forge/tools/

# Copy lib/ helper files
cp "$FORGE_ROOT/tools/lib/"*.cjs .forge/tools/lib/
```

After copying, record each vendored file in the generation manifest so that
`/forge:health` can detect modifications or stale copies:

```sh
for f in .forge/tools/*.cjs; do
  node "$FORGE_ROOT/tools/generation-manifest.cjs" record "$f"
done
for f in .forge/tools/lib/*.cjs; do
  node "$FORGE_ROOT/tools/generation-manifest.cjs" record "$f"
done
```

### Step 2b — Write version marker

After the tool copy loop, write the version marker so `/forge:health` can
detect whether the vendored tools are stale relative to the active plugin:

```sh
ACTIVE_VERSION=$(node -e "console.log(require('$FORGE_ROOT/.claude-plugin/plugin.json').version)")
node -e "
const fs = require('fs');
fs.writeFileSync('.forge/tools/.forge-tools-version', JSON.stringify({ version: '${ACTIVE_VERSION}' }) + '\n');
"
```

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

- `/forge:update` automatically refreshes schemas and re-vendors tools as part
  of its normal flow — run it after upgrades to pick up any changed tools or
  schema updates from the new version.
- Generated workflow files invoke tools using the vendored project-relative path:
  ```
  node .forge/tools/<tool>.cjs
  ```
  This works from the project root without resolving `$FORGE_ROOT` at runtime.
- `paths.forgeRef` in config records the plugin version the project was generated
  against. `forge-preflight.cjs` uses it to resolve the plugin root via cache
  lookup when runtime telemetry requires the original plugin path.