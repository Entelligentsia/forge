# CODE REVIEW — FORGE-S09-T03: Init — calibration baseline write + incomplete init guard

🌿 *Forge Supervisor*

**Task:** FORGE-S09-T03

---

**Verdict:** Approved

---

## Review Summary

The implementation matches the approved PLAN.md exactly: a completeness guard and calibration
baseline write were added at the end of Phase 5 in `forge/init/sdlc-init.md`, before the
`init-progress.json` checkpoint. Both features use only hardcoded field names and literal file
paths; no user-supplied values are interpolated. Version bump and migration entry are correct.
Security scan report exists and verdict is SAFE TO USE.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | Only `crypto` and `fs` Node.js built-ins in inline scripts |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | N/A | No tools modified |
| `--dry-run` supported where writes occur | N/A | No tools modified |
| Reads `.forge/config.json` for paths (no hardcoded paths) | N/A | No tools modified; Markdown references are literal template paths, not tool-code |
| Version bumped if material change | 〇 | 0.9.9 → 0.9.10 in `forge/.claude-plugin/plugin.json` |
| Migration entry present and correct | 〇 | `0.9.9 → 0.9.10`, `regenerate: []`, `breaking: false` — correct per plan |
| Security scan report committed | 〇 | `docs/security/scan-v0.9.10.md` — SAFE TO USE |
| `additionalProperties: false` preserved in schemas | N/A | No schemas modified |
| `node --check` passes on modified JS/CJS files | N/A | No JS/CJS files modified |
| `validate-store --dry-run` exits 0 | 〇 | 53 pre-existing errors, 0 new errors introduced |
| No prompt injection in modified Markdown files | 〇 | No injection patterns in `sdlc-init.md` additions |

## Correctness Verification

1. **Completeness guard** — Checks all required top-level fields (`version`, `project`, `stack`,
   `commands`, `paths`) and nested required sub-fields (`project.prefix`, `project.name`,
   `commands.test`, `paths.engineering/store/workflows/commands/templates`). Matches
   `sdlc-config.schema.json` exactly.
2. **Guard halt message** — Uses `△` mark (Forge display style), lists each missing field with
   a dot-prefixed hint, and prompts the user without writing a partial config. Correct.
3. **Calibration baseline** — Computes all four required fields (`lastCalibrated`, `version`,
   `masterIndexHash`, `sprintsCovered`). The SHA-256 hash strips blank lines and `<!--` comment
   lines before hashing, as specified in the plan.
4. **Placement** — Both features are at the end of Phase 5, after skill generation and before
   the `init-progress.json` write. The ordering (guard → baseline → checkpoint) is correct.
5. **No regression** — Existing Phase 5 skill generation block is preserved verbatim.
6. **Files to Modify advisory from PLAN_REVIEW** — Both `forge/migrations.json` and
   `forge/.claude-plugin/plugin.json` were updated, addressing the reviewer's advisory notes.

## Issues Found

None.

---

## If Approved

### Advisory Notes

1. The PLAN_REVIEW noted that `forge/migrations.json` was not in the Files to Modify table.
   The implementation correctly included this file despite the omission in the plan. Future
   plans should ensure the Files to Modify table is exhaustive.

2. The `sprintsCovered` filter uses `['done', 'retrospective-done']`. If Forge ever adds
   additional terminal sprint statuses, this list will need updating. This is a non-blocking
   concern — the plan review flagged it as well.