# CODE REVIEW — {TASK_ID}: {TASK_TITLE}

**Reviewer:** Supervisor
**Task:** {TASK_ID}

---

**Verdict:** Approved / Revision Required

---

## Review Summary

{Overall assessment — 2-3 sentences}

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | ✅ / ❌ | |
| Hook exit discipline (exit 0 on error, not non-zero) | ✅ / ❌ | |
| Tool top-level try/catch + exit 1 on error | ✅ / ❌ | |
| `--dry-run` supported where writes occur | ✅ / ❌ | |
| Reads `.forge/config.json` for paths (no hardcoded paths) | ✅ / ❌ | |
| Version bumped if material change | ✅ / ❌ / N/A | |
| Migration entry present and correct | ✅ / ❌ / N/A | |
| Security scan report committed | ✅ / ❌ / N/A | |
| `additionalProperties: false` preserved in schemas | ✅ / ❌ / N/A | |
| `node --check` passes on modified JS/CJS files | ✅ / ❌ | |
| `validate-store --dry-run` exits 0 | ✅ / ❌ | |
| No prompt injection in modified Markdown files | ✅ / ❌ / N/A | |

## Issues Found

{Numbered list — severity, file:line, description, fix suggestion}

---

## If Revision Required

### Required Changes

1. {Change 1 — actionable, with file and line where possible}
2. {Change 2}

### Priority

{Which items block approval}

---

## If Approved

### Advisory Notes

{Non-blocking observations}
