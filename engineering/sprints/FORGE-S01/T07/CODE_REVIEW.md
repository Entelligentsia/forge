# CODE REVIEW — FORGE-S01-T07: Bug report opt-in — token data in bug reports with user prompt

**Reviewer:** Supervisor
**Task:** FORGE-S01-T07

---

**Verdict:** Approved

---

## Review Summary

The implementation correctly adds Step 2b to `forge/commands/report-bug.md` with
the three-path token data opt-in logic (no sprint, config override, user prompt)
and extends the Step 4 body template with a conditional `<details>` collapsible
block. The schema change to `forge/sdlc-config.schema.json` is minimal and
correctly placed under the `pipeline` object. All changes match the approved plan
exactly, and the supervisor advisory note about using sprint store JSONs for
sprint detection was adopted.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | N/A | No JS/CJS files modified |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | N/A | No tools modified |
| `--dry-run` supported where writes occur | N/A | No tools modified |
| Reads `.forge/config.json` for paths (no hardcoded paths) | ✅ | Step 2b reads config for store path |
| Version bumped if material change | N/A | Bundled with T08 as planned |
| Migration entry present and correct | N/A | Bundled with T08 as planned |
| Security scan report committed | N/A | Bundled with T08 as planned |
| `additionalProperties: false` preserved in schemas | ✅ | `pipeline` object does not use `additionalProperties: false`; no drift |
| `node --check` passes on modified JS/CJS files | N/A | No JS/CJS files modified |
| `validate-store --dry-run` exits 0 | ✅ | 32 pre-existing errors confirmed identical before and after — no regression |
| No prompt injection in modified Markdown files | ✅ | Scanned `report-bug.md` — clean |

## Issues Found

None.

---

## If Approved

### Advisory Notes

1. **Store path fallback.** Step 2b says "Read `.forge/config.json` to confirm the
   store path (default `.forge/store`)" — this is correct, but the actual path
   lookup relies on the `forge_config` variable loaded in Step 2. If that load
   failed (config absent), the fallback path `.forge/store` is used inline. This is
   fine for the common case but worth noting for future maintainers.

2. **Version bump and security scan are deferred to T08.** This review is Approved
   on the understanding that T08 will cover the version bump (`0.4.0`), migration
   entry with `regenerate: ["commands"]`, and the security scan. T07 must not be
   shipped without T08.
