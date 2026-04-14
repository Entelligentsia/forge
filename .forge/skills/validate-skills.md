# QA Validation Skills — Forge

## Acceptance Criteria Tracing

For each acceptance criterion in the task prompt:
1. State the observable evidence that proves it is met
2. Verify that evidence exists (run commands, read files, check store)
3. Record: PASS / FAIL / GAP

GAP = the criterion is present but there is no verifiable evidence for it.
FAIL = the criterion is demonstrably not met.

## Forge-Specific Validation Checklist

| Criterion type | How to validate |
|---|---|
| Version bump declared | Read `forge/.claude-plugin/plugin.json` → `version` field |
| Migration entry declared | Read `forge/migrations.json` → new entry with correct `from`/`version`/`regenerate` |
| Security scan required | `docs/security/scan-v{VERSION}.md` exists and shows SAFE verdict |
| Schema changed | Run `node forge/tools/validate-store.cjs --dry-run` — must exit 0 |
| JS/CJS file modified | Run `node --check <file>` — must pass for every modified file |
| No-npm rule | Check all modified JS/CJS for non-built-in `require()` calls |

## Edge Cases to Probe

- **Empty/missing config:** what happens if `.forge/config.json` is missing a field?
- **Wrong arguments:** does the command fail gracefully with a clear error?
- **Dry-run mode:** does `--dry-run` truly skip all writes?
- **Re-run idempotency:** can the command be run twice without corrupting state?

## Evidence Standard

Every PASS verdict requires quoted or copied evidence:
- Command output (verbatim, not paraphrased)
- File content snippet
- Exit code

"Looks correct" is not evidence.
