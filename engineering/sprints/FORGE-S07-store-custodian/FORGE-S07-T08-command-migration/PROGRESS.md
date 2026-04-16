# PROGRESS — FORGE-S07-T08: Update migrate.md command — replace direct store writes with custodian references

🌱 *Forge Engineer*

**Task:** FORGE-S07-T08
**Sprint:** FORGE-S07

---

## Summary

Replaced Step 5's direct-write instructions in `forge/commands/migrate.md` with
store custodian write invocations. The LLM now uses `store-cli.cjs write
<entity>` instead of reading JSON, applying mapping, and writing back with
`JSON.stringify`. Added custodian error-handling rule. Removed duplicate
FORGE_ROOT resolution (already present at top of command).

## Syntax Check Results

No JS/CJS files modified. N/A.

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (7 sprint(s), 54 task(s), 14 bug(s)).
```

## Files Changed

| File | Change |
|---|---|
| `forge/commands/migrate.md` | Replaced Step 5 direct-write instructions with store custodian write; added error-handling rule; preserved field-guard instruction |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| Step 5 uses `store-cli.cjs write <entity> '{updated-json}'` | 〇 Pass | Line 93: `node "$FORGE_ROOT/tools/store-cli.cjs" write <entity> '{updated-json}'` |
| `grep '.forge/store' migrate.md` returns zero write-path instructions | 〇 Pass | Only match is Step 2 read-path for config (line 21) |
| FORGE_ROOT resolution present | 〇 Pass | Already at top of command (line 12) |
| Custodian error-handling rule present | 〇 Pass | Lines 108-111: retry max 2, never fall back to direct writes |
| Command reads as clear step-by-step guide | 〇 Pass | Structure preserved; Steps 1-4, 6-7 unchanged |
| `validate-store --dry-run` exits 0 | 〇 Pass | Confirmed |

## Plugin Checklist

- [ ] Version bumped in `forge/.claude-plugin/plugin.json` — deferred to T09
- [ ] Migration entry added to `forge/migrations.json` — deferred to T09
- [ ] Security scan run and report committed — deferred to T09

## Knowledge Updates

None required.

## Notes

- The `JSON.stringify` reference has been completely removed from the command.
- The read step in Step 5 offers both Read tool and `/forge:store read` as
  options, per the task prompt's AC2.
- The "Do not modify any field that was not part of the agreed mapping" guard
  is preserved as the final paragraph of Step 5.