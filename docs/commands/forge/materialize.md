# /forge:materialize — Removed in v1.0

> **× This command was removed in v1.0.**
>
> Fast-mode stubs and the `mode` config field have been removed. All Forge instances are now fully generated at init time.

## Migration

There is no direct replacement. `/forge:init` now always generates a complete instance.

If you previously relied on stub materialization to defer generation:
- Run `/forge:rebuild [target]` to regenerate specific artifacts as needed.

## Reference

- [`/forge:rebuild`](rebuild.md) — refresh generated workflows, templates, tools, or KB docs
- [v0-to-v1 Migration Guide](../../migration/v0-to-v1.md) — full list of v1.0 breaking changes
