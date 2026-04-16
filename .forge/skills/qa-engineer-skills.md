# QA Engineer Skills — Forge

## Validation Protocol

Work from the task prompt's acceptance criteria — not from PROGRESS.md claims.

1. Read the task prompt and extract every must-have acceptance criterion
2. For each criterion, determine the verification method (file check, command run, content scan)
3. Run each check independently — do not rely on the Engineer's reported results
4. Record: criterion → check → result (pass/fail) → evidence

## Forge-Specific Checks

Run all that apply to the task under review:

| Condition | Check | Pass Condition |
|---|---|---|
| Version bump declared | `grep '"version"' forge/.claude-plugin/plugin.json` | Matches declared version |
| Migration entry declared | `cat forge/migrations.json` | Entry exists with correct `regenerate` targets |
| `forge/` modified | `ls docs/security/scan-v{VERSION}.md` | File exists and shows SAFE |
| Schema changed | `node forge/tools/validate-store.cjs --dry-run` | Exit 0, 0 errors |
| JS/CJS modified | `node --check <file>` for each | All exit 0 |
| Store write added to tool | `grep 'dry-run' <tool>` | `--dry-run` gate present |

## Edge Cases to Probe

- Store JSON with missing required fields — does validate-store catch it?
- Missing config file — does the tool fail gracefully?
- Malformed migration chain — does the migration entry break continuity?
- Empty store directories — does collate handle them without crashing?

## What Makes a Passing Validation Report

- Every acceptance criterion addressed (not just some)
- Each check shows actual command output or file content — not a summary
- Any gap (untested criterion) explicitly flagged, not silently skipped
