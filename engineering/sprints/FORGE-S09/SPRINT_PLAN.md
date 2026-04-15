# Sprint Plan — FORGE-S09: Calibration, Guardrails, and Bug Closure

**Sprint:** FORGE-S09
**Status:** active
**Created:** 2026-04-15

---

## Goals

1. Forge agents stay synchronized with a changing knowledge base — drift is detected, quantified, and resolved surgically.
2. Forge commands reject incomplete or broken configuration before it cascades into malformed sprint artifacts.
3. All pre-existing validate-store errors are closed, and all remaining open bugs are fixed.

---

## Task Registry

| Task | Title | Estimate | Dependencies | Layer |
|------|-------|----------|-------------|-------|
| T01 | Renumber sdlc-init.md phases to sequential integers | M | — | command+init |
| T02 | Config schema: add calibrationBaseline + required-field annotations | S | — | schema |
| T03 | Init: calibration baseline write + incomplete init guard | M | T01, T02 | command |
| T04 | Health: KB freshness check + config-completeness check | M | T02 | command |
| T05 | Calibrate command — drift detection, categories, surgical patches | L | T03, T04 | command |
| T06 | SPRINT_PLAN.md output path in meta-sprint-plan | S | — | meta-workflow |
| T07 | Add-task mid-sprint command | M | — | command |
| T08 | Close BUG-002/003 validate-store pre-existing errors | M | — | data |
| T09 | Release engineering — version bump, migration, security scan | S | T01–T07 | release |

---

## Dependency Graph

```
Wave 1:  T01 ── T02 ── T06 ── T07 ── T08   (all independent)
Wave 2:  T03 (→T01, T02) ── T04 (→T02)
Wave 3:  T05 (→T03, T04)
Wave 4:  T09 (→T01, T02, T03, T04, T05, T06, T07)
```

---

## Wave Execution Plan

### Wave 1 — Independent tasks (can run in parallel)

- **T01** — Renumber init phases (eliminate Phase 1.5, Phase 3b)
- **T02** — Add `calibrationBaseline` to config schema
- **T06** — Fix SPRINT_PLAN.md output path
- **T07** — Create `/forge:add-task` command
- **T08** — Fix validate-store pre-existing errors (data only)

### Wave 2 — Depends on Wave 1

- **T03** — Add calibration baseline write + incomplete init guard to `/forge:init`
  (needs T01: renumbered phases; T02: schema with calibrationBaseline)
- **T04** — Add KB freshness + config completeness checks to `/forge:health`
  (needs T02: schema with required fields)

### Wave 3 — Depends on Wave 2

- **T05** — Create `/forge:calibrate` command
  (needs T03: init writes baseline; T04: health reports drift)

### Wave 4 — Capstone

- **T09** — Version bump, migration entry, security scan

---

## Total Estimates

| Size | Count | Hours |
|------|-------|-------|
| S | 3 | ~3h |
| M | 5 | ~10h |
| L | 1 | ~5h |
| **Total** | **9** | **~18h** |

---

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `/forge:calibrate` drift categories too coarse/granular | Medium | Start with four categories defined in #33; iterate based on dogfooding |
| KB hash comparison is brittle — minor formatting changes trigger false drift | Medium | Hash only semantic content lines (strip whitespace/comments) |
| Incomplete init guard rejects valid configs on edge cases | Low | Validate against existing `sdlc-config.schema.json` required fields |
| add-task mini-intake is too shallow | Medium | Reuse sprint-intake interview pattern at task scope |
| BUG-002/003 automated fix introduces data loss | Low | Run with `--dry-run` first; only backfill missing fields |