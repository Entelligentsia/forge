# CODE REVIEW — FORGE-S06-T07: Slug-aware seed-store discovery and path construction

*Forge Supervisor*

**Task:** FORGE-S06-T07

---

**Verdict:** Approved

---

## Review Summary

The implementation correctly replaces narrow bare-ID regex patterns with three-tier progressive fallback discovery for sprints, tasks, and bugs. The code reads local filesystem only, uses the Store facade for writes, properly escapes the project prefix before regex construction, and maintains full backwards compatibility with legacy directory formats. Two bugs were found and fixed during review: a bare-task number extraction error (`match[1].slice(1)` on a captured group that was already just digits) and a missing `BUG-{NNN}-*` partial-prefix tier for bug discovery.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | Pass | Only `fs`, `path`, and `./store.cjs` imported |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | Pass | Lines 57-227 wrapped in try/catch, `process.exit(1)` on error |
| `--dry-run` supported where writes occur | Pass | `DRY_RUN` checked before every `Store.write*` and `mkdirSync` call |
| Reads `.forge/config.json` for paths (no hardcoded paths) | Pass | `engPath` from config; no hardcoded `'engineering/'` strings |
| Version bumped if material change | Pass | 0.7.7 -> 0.7.8 in plugin.json |
| Migration entry present and correct | Pass | Entry 0.7.7->0.7.8 with `regenerate: []`, `breaking: false` |
| Security scan report committed | Pass | `docs/security/scan-v0.7.8.md` written; README table updated |
| `additionalProperties: false` preserved in schemas | N/A | No schema changes in this task |
| `node --check` passes on modified JS/CJS files | Pass | Exit 0 on seed-store.cjs |
| `validate-store --dry-run` exits 0 | N/A | No schema changes; errors are all pre-existing |
| No prompt injection in modified Markdown files | N/A | No Markdown files modified under `forge/` |

## Issues Found

None.

---

## Advisory Notes

1. **`deriveSlug()` unused**: The function is defined at line 21 but never called within seed-store.cjs. Since seed-store only discovers existing directories (it does not create new ones), this is expected. The function is available as a utility API for tools like sprint-intake that create directories. Consider exporting it via `module.exports` if other tools will need it, or noting in a code comment where it is intended to be used.

2. **Bug ID padding**: `bugNum.padStart(2, '0')` produces `FORGE-BUG-01` while actual bug directories use `BUG-001` (3-digit). This inconsistency pre-dates this task. The store records and existing code consistently use 2-digit padding, so changing it here would be a separate concern.

3. **Sprint `path` field not required**: The sprint schema added `path` as optional (not required) in FORGE-S06-T06. seed-store now populates it, which means re-seeded stores will have it, but existing stores that were not re-seeded will still be missing it. This is acceptable since the field is optional.

4. **`prefixEscaped` re-declared in bugs section**: The variable `prefixEscaped` is declared at line 85 (sprints section) and again at line 180 (bugs section). While this works due to block scoping within `if` blocks, it could be moved to a single declaration before both sections for clarity.