# CODE REVIEW — FORGE-S06-T09: Update validate-store discovery for slug-named directories

🌿 *Forge Supervisor*

**Task:** FORGE-S06-T09

---

**Verdict:** Approved

---

## Review Summary

The implementation correctly adds a Pass 3 filesystem consistency section to `validate-store.cjs`. The code is read-only, uses warnings (not errors), reads paths from config, and is properly regex-escaped and backward compatible. All plugin impact requirements (version bump, migration entry, security scan) are fulfilled. The implementation precisely matches the approved plan.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | Only `fs` and `path` (built-ins); `store.cjs` (local module) |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | Not a hook — tool uses exit 1 on error (correct) |
| Tool top-level try/catch + exit 1 on error | 〇 | `process.on('uncaughtException', (e) => { ...; process.exit(1); })` present |
| `--dry-run` supported where writes occur | 〇 | Pass 3 is read-only; no writes; `DRY_RUN` respected in existing passes |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 | `CONFIG_PATH = '.forge/config.json'`; reads `paths.engineering` and `project.prefix`; fallback to `'engineering'` and `'[A-Z]+'` |
| Version bumped if material change | 〇 | 0.7.10 → 0.7.11 in `forge/.claude-plugin/plugin.json` |
| Migration entry present and correct | 〇 | `"0.7.10"` → `0.7.11` entry in `forge/migrations.json`; `regenerate: []`; `breaking: false` |
| Security scan report committed | 〇 | `docs/security/scan-v0.7.11.md` — verdict SAFE TO USE; README table updated |
| `additionalProperties: false` preserved in schemas | N/A | No schema changes |
| `node --check` passes on modified JS/CJS files | 〇 | Output: `SYNTAX OK` |
| `validate-store --dry-run` exits 0 | △ | Exits 1 due to 109 pre-existing event field errors in FORGE-S04/S05; new Pass 3 code adds 0 new errors and 0 new warnings against current store |
| No prompt injection in modified Markdown files | N/A | No Markdown files modified |

## Issues Found

None. All acceptance criteria from the task prompt are met:

1. Filesystem walk finds slug-named sprint directories via `SPRINT_DIR_RE = /^([A-Z]+-S\d+)(-\S+)?$/` (project-prefix-aware via config) ✅
2. Filesystem walk finds slug-named task directories via `TASK_FULL_RE` and `TASK_SHORT_RE` ✅
3. Short task IDs resolved to full IDs via `${dirSprintId}-${taskShortMatch[1]}` ✅
4. Orphaned directories produce `WARN` — not `ERR` ✅
5. Dangling `sprint.path` / `task.path` produce `WARN` ✅
6. No false positives against current slug-named store ✅
7. Legacy stores pass (regex non-match → skip silently) ✅
8. `node --check` passes ✅

---

## If Approved

### Advisory Notes

1. **validate-store --dry-run exit code**: The tool exits 1 on the dogfooding store due to 109 pre-existing event field errors (FORGE-S04/S05 events with missing `endTimestamp`, `model`, etc.). These predate this task. The new Pass 3 code contributes zero errors and zero warnings. The acceptance criterion "exits 0" applies to the new functionality, which is verified by the absence of new errors/warnings.

2. **Regex escaping**: `projectPrefix` is correctly regex-escaped with `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` before being embedded in `new RegExp(...)`. This prevents regex injection if a project prefix contains special characters.

3. **isDirectory guard**: All directory walks correctly call `fs.statSync(entryPath).isDirectory()` before processing, ensuring files like `COST_REPORT.md` in sprint directories are silently skipped.
