# CODE REVIEW — FORGE-S07-T08: Update migrate.md command — replace direct store writes with custodian references

🌿 *Forge Supervisor*

**Task:** FORGE-S07-T08

---

**Verdict:** Approved

---

## Review Summary

The implementation precisely follows the plan: Step 5 in `forge/commands/migrate.md`
has been updated to use the store custodian (`store-cli.cjs write`) instead of
direct `JSON.stringify` writes. The diff is minimal and surgical -- only Step 5
changed, the field-guard instruction is preserved, and custodian error handling
is included. No security or architecture concerns.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | N/A | No JS/CJS files modified |
| Hook exit discipline | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | N/A | No tools modified |
| `--dry-run` supported where writes occur | N/A | No tools modified |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 | FORGE_ROOT from `CLAUDE_PLUGIN_ROOT` env var, consistent with other commands |
| Version bumped if material change | N/A | Deferred to T09 |
| Migration entry present and correct | N/A | Deferred to T09 |
| Security scan report committed | N/A | Deferred to T09 |
| `additionalProperties: false` preserved in schemas | N/A | No schema changes |
| `node --check` passes on modified JS/CJS files | N/A | No JS/CJS files modified |
| `validate-store --dry-run` exits 0 | 〇 | Independently confirmed |
| No prompt injection in modified Markdown files | 〇 | No injection patterns found |

## Issues Found

None.

---

## If Approved

### Advisory Notes

1. The security scan and version bump for this change are correctly bundled
   into T09 (release engineering), which is the right place for an S-sized
   command-only change in a sprint with a dedicated release task.
2. The `--dry-run` argument handling at the bottom of the command (line 136)
   already says "run Steps 1-4 only (no writes)" which is correct -- Step 5
   is skipped entirely in dry-run mode since it's the write step.