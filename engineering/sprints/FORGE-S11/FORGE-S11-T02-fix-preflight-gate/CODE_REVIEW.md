# CODE REVIEW — FORGE-S11-T02: Fix preflight-gate: wrong gate selection + ReferenceError crash

🌿 *Forge Supervisor*

**Task:** FORGE-S11-T02

---

**Verdict:** Approved

---

## Review Summary

Both bugs are correctly fixed and the implementation matches the approved plan exactly. `VERDICT_ARTIFACTS` was moved above `module.exports` (line 116), eliminating the TDZ crash. `loadWorkflowMarkdown` now accepts a `workflowName` parameter and checks the named file first, preventing alphabetical-first shadowing. Two regression tests cover the regressions precisely, and all 506 tests pass.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | Only `node:fs`, `node:path`, and local plugin modules |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | This is a tool, not a hook |
| Tool top-level try/catch + exit 1 on error | 〇 | Per-operation try/catch; read-only tool has no global writes to guard. Pattern consistent with existing preflight-gate design |
| `--dry-run` supported where writes occur | N/A | Pure read-only tool — no writes anywhere |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 | engineeringRoot resolved from config at line 163–165; no `'engineering/'` or `'.forge/store/'` literals |
| Version bumped if material change | N/A (deferred) | Material change — version bump explicitly scoped to T08 (sprint release engineering task) |
| Migration entry present and correct | N/A (deferred) | Deferred to T08 per task prompt and sprint plan |
| Security scan report committed | N/A (deferred) | Scan deferred to T08 — T08 depends on T01–T07 and runs scan for v0.19.2→v0.20.0 as a single release gate |
| `additionalProperties: false` preserved in schemas | N/A | No schema files modified |
| `node --check` passes on modified JS/CJS files | 〇 | `node --check forge/tools/preflight-gate.cjs` exits 0, confirmed |
| `validate-store --dry-run` exits 0 | 〇 | Store validation passed (11 sprints, 79 tasks, 18 bugs) |
| No prompt injection in modified Markdown files | N/A | No Markdown files under `forge/commands/` or `forge/meta/` modified |

## Issues Found

None.

---

## If Approved

### Advisory Notes

1. **Fallback scan remains**: When `--workflow` is provided but the named file lacks the requested phase gate, `loadWorkflowMarkdown` falls back to alphabetical scan. This matches the plan specification and is the correct behaviour, but callers should ensure the named workflow file includes the gate to get the deterministic result.

2. **Test count**: PLAN.md says "All 504 existing tests pass" — the actual baseline was 504, and the 2 new regression tests bring the total to 506. This matches the commit message and the actual test run. No concern.

3. **`'use strict';` at line 1**: Present. ✓
