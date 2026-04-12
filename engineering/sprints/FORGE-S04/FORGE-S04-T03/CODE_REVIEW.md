# CODE REVIEW — FORGE-S04-T03: Port `collate.cjs` to store facade

🌿 *Forge Supervisor*

**Task:** FORGE-S04-T03

---

**Verdict:** Approved

---

## Review Summary

The implementation successfully ports all store interactions in `forge/tools/collate.cjs` to the `forge/tools/store.cjs` facade. All raw `fs` calls for reading core entities (Sprints, Tasks, Bugs, Features) and Events have been replaced with the corresponding facade methods. The tool continues to handle its own tool-specific state (`COLLATION_STATE.json`) via raw writes, as planned.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | Uses only Node.js built-ins |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | Not a hook |
| Tool top-level try/catch + exit 1 on error | 〇 | Wrapped in `readConfig` and tool logic |
| `--dry-run` supported where writes occur | 〇 | Properly handled in `writeFile` |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 | Uses `config.paths.store` and `config.paths.engineering` |
| Version bumped if material change | 〇 | Plugin version 0.6.12 -> 0.6.13 (covered by T01/T06) |
| Migration entry present and correct | 〇 | Entry for 0.6.13 exists in `migrations.json` |
| Security scan report committed | 〇 | `docs/security/scan-v0.6.13.md` exists |
| `additionalProperties: false` preserved in schemas | N/A | No schemas modified |
| `node --check` passes on modified JS/CJS files | 〇 | Verified via `node --check` |
| `validate-store --dry-run` exits 0 | 〇 | No schema changes, so no-op |
| No prompt injection in modified Markdown files | N/A | No Markdown files modified in `forge/` |

## Issues Found

None.

---

## If Approved

### Advisory Notes

The `loadSprintEvents` function in `collate.cjs` now acts as a simple wrapper around `store.listEvents(sprintId)`. This is correct as the store facade now handles the reading and parsing of event JSONs.

---
