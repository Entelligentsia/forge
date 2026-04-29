# /forge:migrate

Migrate an existing project store to Forge format.

## What it does

Scans the Forge store for non-standard status and severity values, interviews you to map them to Forge enums, and applies the migration. Requires `/forge:init` to have been run first.

## Invocation

```
/forge:migrate           # Interactive migration
/forge:migrate --dry-run # Preview only, no writes
```

## What happens

1. **Verify init.** Checks that `.forge/config.json` exists. If not, redirects to `/forge:init`.
2. **Scan for non-Forge values.** Reads every sprint, task, and bug record. Collects status and severity values that are not in the Forge enum sets.
3. **Interview.** Presents each unrecognized value and asks you to choose the Forge equivalent. You can type `skip` to leave a value unchanged.
4. **Preview.** Shows a count of affected records and example changes. Asks for confirmation.
5. **Apply.** Updates each affected record via the store custodian.
6. **Verify.** Runs `validate-store` to confirm the store is clean.
7. **Close.** Reports the number of updated records per entity type.

## Forge enum values

| Entity | Field | Valid values |
|--------|-------|-------------|
| Sprint | status | `planning`, `active`, `completed`, `retrospective-done`, `blocked`, `partially-completed`, `abandoned` |
| Task | status | `draft`, `planned`, `plan-approved`, `implementing`, `implemented`, `review-approved`, `approved`, `committed`, `plan-revision-required`, `code-revision-required`, `blocked`, `escalated`, `abandoned` |
| Bug | status | `reported`, `triaged`, `in-progress`, `fixed`, `verified` |
| Bug | severity | `critical`, `major`, `minor` |

## Flags

| Flag | Purpose |
|------|---------|
| `--dry-run` | Run Steps 1–4 only. No writes to the store. |

## Related

- [`/forge:init`](init.md) — initialize a new Forge project
- [`/forge:store-repair`](store-repair.md) — repair corrupted store records
- [`/forge:health`](health.md) — check overall project health