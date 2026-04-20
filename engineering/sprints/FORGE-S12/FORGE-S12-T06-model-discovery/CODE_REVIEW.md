# CODE REVIEW — FORGE-S12-T06: Deterministic model discovery for event records

*Forge Supervisor*

**Task:** FORGE-S12-T06

---

**Verdict:** Approved

---

## Review Summary

The implementation matches the approved plan exactly: `discoverModel()` probes three env vars in priority order, returns `"unknown"` as honest fallback, and auto-populates missing model fields in both `cmdEmit()` and `cmdRecordUsage()`. No npm dependencies introduced, no schema changes, no hardcoded paths. Test coverage is thorough (13 new tests). Version bump and migration are deferred to sprint release engineering, which is acceptable per project convention.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | Pass | Only `process.env` used -- no new require() calls |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | Pass | Pre-existing try/catch preserved |
| `--dry-run` supported where writes occur | Pass | Auto-population applies in dry-run mode too (correct -- same pattern as `_normalizeEventTimestamps`) |
| Reads `.forge/config.json` for paths (no hardcoded paths) | Pass | No path references added; `discoverModel()` only reads `process.env` |
| Version bumped if material change | N/A | Deferred to sprint release engineering |
| Migration entry present and correct | N/A | Deferred to sprint release engineering |
| Security scan report committed | N/A | Deferred to sprint release engineering |
| `additionalProperties: false` preserved in schemas | N/A | No schema changes |
| `node --check` passes on modified JS/CJS files | Pass | Clean output confirmed |
| `validate-store --dry-run` exits 0 | Pass | "Store validation passed (12 sprint(s), 85 task(s), 18 bug(s))." |
| No prompt injection in modified Markdown files | N/A | No Markdown in `forge/` modified |

## Issues Found

None blocking.

---

## If Approved

### Advisory Notes

1. **Version bump and migration still needed.** This is a material change to store-cli.cjs behavior (auto-populating `model` field on emit/record-usage). The version bump, migration entry, and security scan must be completed before this task can advance to "committed" status. These are typically handled at sprint-level release engineering.

2. **Test subprocess uses absolute path.** The discoverModel subprocess tests use `cwd: '/home/boni/src/forge'` with `require('./forge/tools/store-cli.cjs')`. This works for this machine but would break if the repo is cloned elsewhere. Consider using `path.resolve(__dirname, '..')` for portability in future tests. Not blocking -- the existing test patterns in this file already use absolute paths.

3. **`discoverModel()` trims whitespace** from env var values. This is good defensive behavior (some platforms add trailing newlines to env vars), and is explicitly tested. No concern.

4. **Auto-population ordering.** In `cmdEmit()`, model auto-population runs after timestamp normalization but before schema validation. This is correct -- the event schema requires `model` as a non-nullable field, so auto-population must happen before validation. In `cmdRecordUsage()`, model auto-population runs before sidecar schema validation. Also correct.