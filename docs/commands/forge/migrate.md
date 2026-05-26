# /forge:migrate — Removed in v1.0

> **× This command was removed in v1.0.**
>
> Migration functionality has been absorbed into `/forge:init --migrate`.

## Migration

```bash
# Previously:
/forge:migrate
/forge:migrate --dry-run

# Now:
/forge:init --migrate
/forge:init --migrate --dry-run
```

`/forge:init --migrate` scans the store for non-standard status and severity values, interviews you to map them to Forge enums, and applies the migration.

## Reference

- [`/forge:init`](init.md) — includes `--migrate` flag
- [`/forge:repair`](repair.md) — repair corrupted store records
- [v0-to-v1 Migration Guide](../../migration/v0-to-v1.md) — full list of v1.0 breaking changes
