# VALIDATION REPORT — FORGE-S07-T09: Release engineering — version bump to 0.9.0, migration entry, security scan

*Forge QA Engineer*

**Task:** FORGE-S07-T09

---

**Verdict:** Approved

---

## Acceptance Criteria Checklist

| # | Criterion | Evidence | Result |
|---|---|---|---|
| 1 | `plugin.json` version is "0.9.0" | Read plugin.json directly: `"version": "0.9.0"` | PASS |
| 2 | `migrations.json` has `"0.8.10"` entry with all required fields | Key "0.8.10" present; version="0.9.0", date="2026-04-15", notes=327 chars, regenerate=["workflows","skills","tools"], breaking=false, manual=[] | PASS |
| 3 | Security scan run against `forge/` source directory | Report exists at docs/security/scan-v0.9.0.md; 105 files scanned | PASS |
| 4 | Full scan report saved to `docs/security/scan-v0.9.0.md` | File exists, contains full findings with verdict SAFE TO USE | PASS |
| 5 | README.md security table has v0.9.0 row | Row present: `0.9.0 | 2026-04-15 | scan-v0.9.0.md | 105 files ... SAFE TO USE` | PASS |
| 6 | `validate-store --dry-run` exits 0 | Independently re-run: "Store validation passed (7 sprint(s), 54 task(s), 14 bug(s))" exit code 0 | PASS |
| 7 | Both modified JSON files parse as valid JSON | `JSON.parse()` succeeded on both plugin.json and migrations.json | PASS |

## Edge Case Checks

- **No-npm rule:** No JS/CJS files were modified in this task. N/A.
- **Hook exit discipline:** No hooks modified. N/A.
- **Schema `additionalProperties: false`:** No schemas modified in this task. N/A.
- **Backwards compatibility:** A user on 0.8.10 can still run `/forge:update`. The new migration entry has `breaking: false` and `manual: []`. The update flow will detect the version gap, read the migration entry, and prompt regeneration of workflows, skills, and tools. No manual steps required.

## Regression Check

- `node forge/tools/validate-store.cjs --dry-run` exits 0 (7 sprints, 54 tasks, 14 bugs)
- No JS/CJS files modified in this task, so `node --check` is N/A