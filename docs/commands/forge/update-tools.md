# /forge:update-tools — Removed in v1.0

> **× This command was removed in v1.0.**
>
> Schema refresh is now handled automatically by `/forge:update`.

## Migration

```bash
# Previously:
/forge:update-tools

# Now:
/forge:update
```

`/forge:update` propagates a full plugin version upgrade into project artifacts, including schema refresh. There is no need to run schema refresh separately.

## Reference

- [`/forge:update`](update.md) — propagate a plugin version upgrade (includes schema refresh)
- [v0-to-v1 Migration Guide](../../migration/v0-to-v1.md) — full list of v1.0 breaking changes
