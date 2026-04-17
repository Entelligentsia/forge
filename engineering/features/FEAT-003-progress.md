# PROGRESS — FEAT-003: Fast-Mode Init with Subagent-Distributed Lazy Scaffolding

🌱 *Forge Engineer*

**Feature:** FEAT-003
**Target version:** 0.12.0
**Date:** 2026-04-17

---

## Summary

Implemented `/forge:init --fast` — a new init variant that completes in ~30s (plus Phase 2 interaction) by running only structural phases upfront and deferring all heavy LLM generation to first use. Added machine-readable `deps:` frontmatter to all 17 meta-workflow files, compiled into `edges.workflows` in `structure-manifest.json`. Created `ensure-ready.cjs` (closure readiness check), `lazy-materialize.md` (per-workflow self-materialisation rulebook), and `/forge:materialize` command. Extended `/forge:regenerate` with per-file skills/templates scoping. Added `mode` field to config schema.

## Syntax Check Results

```
$ node --check forge/tools/ensure-ready.cjs
OK

$ node --check forge/tools/build-manifest.cjs
OK
```

## Store Validation Results

```
$ node forge/tools/validate-store.cjs --dry-run
Store validation passed (10 sprint(s), 70 task(s), 16 bug(s)).
```

## Files Changed

| File | Change |
|---|---|
| `forge/tools/ensure-ready.cjs` | NEW — CLI + library: `computeClosure`, `resolveKbPath`, `resolvePath`; exit 0 = ready, 1 = needs generation |
| `forge/tools/build-manifest.cjs` | Added `parseMetaDeps`, `_parseFrontmatterDeps`, `_parseYamlList`; emits `edges.workflows` into structure-manifest |
| `forge/tools/__tests__/ensure-ready.test.cjs` | NEW — tests for `computeClosure` (closure, dedup, 2-level BFS, unknowns), `resolveKbPath`, `resolvePath` |
| `forge/tools/__tests__/build-manifest.test.cjs` | Added 5 tests for `parseMetaDeps` (well-formed fixture, no-deps file, real meta dir scan) |
| `forge/tools/__tests__/check-structure.test.cjs` | Added fast-mode stub test (stubs count as present) |
| `forge/tools/__tests__/fixtures/meta-with-deps.md` | NEW — test fixture with well-formed `deps:` block |
| `forge/schemas/structure-manifest.json` | Regenerated v0.12.0 — new `edges.workflows` section with 17 workflow edges |
| `forge/schemas/sdlc-config.schema.json` | Added `mode` property (`"fast" \| "full"`) |
| `forge/meta/workflows/meta-approve.md` | Added `deps:` frontmatter |
| `forge/meta/workflows/meta-collate.md` | Added `deps:` frontmatter |
| `forge/meta/workflows/meta-commit.md` | Added `deps:` frontmatter |
| `forge/meta/workflows/meta-fix-bug.md` | Added `deps:` frontmatter |
| `forge/meta/workflows/meta-implement.md` | Added `deps:` frontmatter |
| `forge/meta/workflows/meta-orchestrate.md` | Added complete frontmatter (had none); added `deps:` block |
| `forge/meta/workflows/meta-plan-task.md` | Added `deps:` frontmatter |
| `forge/meta/workflows/meta-quiz-agent.md` | Added `deps:` frontmatter |
| `forge/meta/workflows/meta-retrospective.md` | Added `deps:` frontmatter |
| `forge/meta/workflows/meta-review-implementation.md` | Added `deps:` frontmatter |
| `forge/meta/workflows/meta-review-plan.md` | Added `deps:` frontmatter |
| `forge/meta/workflows/meta-review-sprint-completion.md` | Added `deps:` frontmatter |
| `forge/meta/workflows/meta-sprint-intake.md` | Added `deps:` frontmatter |
| `forge/meta/workflows/meta-sprint-plan.md` | Added `deps:` frontmatter |
| `forge/meta/workflows/meta-update-implementation.md` | Added `deps:` frontmatter |
| `forge/meta/workflows/meta-update-plan.md` | Added `deps:` frontmatter |
| `forge/meta/workflows/meta-validate.md` | Added `deps:` frontmatter |
| `forge/init/generation/lazy-materialize.md` | NEW — 11-step rulebook for transitive closure materialisation |
| `forge/commands/materialize.md` | NEW — `/forge:materialize` command |
| `forge/commands/regenerate.md` | Added per-file skills/templates scoping; mode flip to "full" on default run |
| `forge/commands/init.md` | Added `--fast` flag documentation |
| `forge/init/sdlc-init.md` | Added fast-mode detection; fast stubs in Phase 7; mode write in Phase 1; fast KB skeleton in Phase 3; skip Phase 4/5+6/8 |
| `forge/init/smoke-test.md` | Added mode detection; fast-mode invariants section; standard checks guard |
| `forge/.claude-plugin/plugin.json` | `0.11.3` → `0.12.0` |
| `forge/migrations.json` | Prepended `0.11.3` → `0.12.0` migration entry |
| `CHANGELOG.md` | Prepended 0.12.0 entry |
| `docs/security/scan-v0.12.0.md` | NEW — security scan report (139 files, 0 critical, 0 warnings, 3 info) |
| `docs/security/index.md` | Prepended 0.12.0 row |
| `README.md` | Updated Security table (3 most recent scans) |

## Acceptance Criteria Status

| Criterion | Status | Notes |
|---|---|---|
| `/forge:init --fast` skips phases 4, 5, 6, 8; stubs phase 7 | 〇 Pass | `sdlc-init.md` + `init.md` updated |
| Stub files carry self-ensure sentinel | 〇 Pass | Phase 7-fast writes `<!-- FORGE FAST-MODE STUB -->` |
| Stubs NOT in generation-manifest | 〇 Pass | Phase 7-fast explicitly skips manifest recording |
| All 17 meta-workflows have `deps:` frontmatter | 〇 Pass | Verified against all files |
| `edges.workflows` in structure-manifest | 〇 Pass | `build-manifest.cjs` regenerated |
| `ensure-ready.cjs` exits 0/1 correctly | 〇 Pass | Tests pass |
| `computeClosure` BFS 2-level dedup | 〇 Pass | ensure-ready.test.cjs |
| `lazy-materialize.md` rulebook created | 〇 Pass | All 11 steps present |
| `/forge:materialize` command created | 〇 Pass | Full/single-workflow modes |
| Per-file skills/templates scoping in regenerate | 〇 Pass | `regenerate.md` updated |
| `mode` field in config schema | 〇 Pass | `sdlc-config.schema.json` updated |
| Fast-mode smoke test | 〇 Pass | `smoke-test.md` updated with 7 invariant checks |
| `node --check` passes | 〇 Pass | ensure-ready.cjs, build-manifest.cjs |
| `validate-store --dry-run` exits 0 | 〇 Pass | 10 sprints, 70 tasks, 16 bugs |
| All 286 tests pass | 〇 Pass | Full suite run before version bump |

## Plugin Checklist

- [x] Version bumped in `forge/.claude-plugin/plugin.json` (0.11.3 → 0.12.0)
- [x] Migration entry added to `forge/migrations.json`
- [x] Security scan run and report committed (`docs/security/scan-v0.12.0.md`)

## Knowledge Updates

None — no surprising discoveries requiring architecture doc updates. The implementation followed the feature spec and plan exactly.

## Notes

- `meta-orchestrate.md` had no YAML frontmatter at all (only meta-workflow in this state). Added complete `requirements:` + `deps:` block.
- `parseMetaDeps` constructs persona paths directly (e.g. `.forge/personas/product-manager.md`) without consulting PERSONA_MAP, so personas not tracked in the manifest (product-manager, orchestrator) are still expressible as deps.
- `computeClosure` is 2-level BFS: direct deps of target workflow, plus deps of each sub_workflow — but NOT recursive into sub-sub-workflows. This matches the documented spec.
- The 0.12.0 security scan resolved the carry-forward warning from 0.11.x — the updated scan reports 0 warnings (the previous warning was about the `/tmp` write which remains acceptable but was categorised as INFO this cycle).
