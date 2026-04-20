# CODE REVIEW — FORGE-S11-T04: Fix collate — broken task links + missing task INDEX.md generation

🌿 *Forge Supervisor*

**Task:** FORGE-S11-T04

---

**Verdict:** Approved

---

## Review Summary

Both bugs are correctly fixed and the implementation matches the approved plan exactly. A new exported helper `resolveTaskDir()` centralises task-directory resolution, `buildSprintIndex` uses `t._taskDir || t.taskId` for link paths, and the CLI loop annotates each task with `_taskDir` before calling `buildSprintIndex` and before generating task INDEX files. The old `continue` that silently skipped plugin-source tasks is correctly removed. Six new tests (4 for `resolveTaskDir`, 2 for `buildSprintIndex` `_taskDir` behaviour) are added, and all 512 tests pass.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | Only `node:fs`, `node:path` (built-ins) used in new code |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | This is a tool, not a hook |
| Tool top-level try/catch + exit 1 on error | 〇 | Existing pattern preserved; new code paths use per-operation guards consistent with surrounding code |
| `--dry-run` supported where writes occur | 〇 | `writeFile` already checks `DRY_RUN` — new `writeFile` calls for task INDEX files inherit this correctly |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 | `engPath` and `storePath` resolved from config; no new `'engineering/'` string literals introduced |
| Version bumped if material change | N/A (deferred) | Material change — version bump explicitly scoped to T08 per task prompt and sprint plan |
| Migration entry present and correct | N/A (deferred) | Deferred to T08 per task prompt |
| Security scan report committed | N/A (deferred) | Scan deferred to T08 — T08 depends on T01–T07 and runs scan for the combined release |
| `additionalProperties: false` preserved in schemas | N/A | No schema files modified |
| `node --check` passes on modified JS/CJS files | 〇 | `node --check forge/tools/collate.cjs` exits 0 |
| `validate-store --dry-run` exits 0 | 〇 | Store validation passed (11 sprints, 79 tasks, 18 bugs) |
| No prompt injection in modified Markdown files | N/A | No Markdown files under `forge/commands/` or `forge/meta/` modified |

## Issues Found

None.

---

## If Approved

### Advisory Notes

- The `resolveTaskDir` numeric-suffix fallback (last integer match) is the same heuristic as the existing `resolveDir` CLI helper. The stack checklist note (BUG-007) applies: if two task directories share the same trailing integer in a sprint, the alphabetically-first match wins. This is pre-existing behaviour and acceptable for the current slug naming convention.
- The test for "returns slug-named task dir when task.path is under engPath" uses a hardcoded `'engineering/sprints/FORGE-S11/TST-S01-T01-my-task'` path — this works because `resolveTaskDir` does a string prefix comparison, not filesystem access, for Case 1. No concern.
- The missing newline at end of `collate.test.cjs` (git diff shows `\ No newline at end of file`) is a minor style issue — not blocking but worth fixing in a follow-up cleanup.
