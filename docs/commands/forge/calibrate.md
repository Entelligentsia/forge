# /forge:calibrate — Removed in v1.0

> **× This command was removed in v1.0.**
>
> KB drift detection and repair is now handled by `/forge:health --fix`.

## Migration

```bash
# Previously:
/forge:calibrate

# Now:
/forge:health --fix
```

`/forge:health --fix` runs drift detection + patch application with user confirmation — equivalent to the former calibrate behavior, integrated into the health diagnostic flow.

## Reference

- [`/forge:health`](health.md) — includes `--fix` flag for drift remediation
- [v0-to-v1 Migration Guide](../../migration/v0-to-v1.md) — full list of v1.0 breaking changes
