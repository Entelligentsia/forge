# /forge:update-tools

Refresh JSON schemas in `.forge/schemas/` from the installed Forge plugin.

## What it does

Copies the current plugin's JSON schema files to the project's `.forge/schemas/` directory and records their hashes in the generation manifest. This ensures schema validation uses the correct definitions for the installed Forge version.

Forge tools (`collate.cjs`, `manage-config.cjs`, etc.) are not copied — they run directly from the plugin root. Only schemas are managed by this command.

## Invocation

```
/forge:update-tools
```

## What happens

1. **Copy schemas.** Copies all `.schema.json` files from `$FORGE_ROOT/schemas/` to `.forge/schemas/`. Creates the directory if it does not exist.
2. **Record hashes.** Registers each copied schema in the generation manifest so `/forge:health` can detect modifications.
3. **Verify.** Runs `validate-store` to confirm the store is valid against the updated schemas.

## Outputs

- Updated `.forge/schemas/*.schema.json` files
- Updated generation manifest entries

## Related

- [`/forge:update`](update.md) — propagate a full plugin version upgrade
- [`/forge:health`](health.md) — check for schema drift and other issues