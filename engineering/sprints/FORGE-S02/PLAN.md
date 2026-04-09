# Sprint Plan — FORGE-S02: Foundational Concepts Documentation + Feature Tier (v1.0)

**Planned:** 2026-04-09
**Sprint ID:** FORGE-S02
**Status:** active
**Execution mode:** sequential

---

## Task Summary

| Task | Title | Layer | Estimate | Dependencies |
|---|---|---|---|---|
| T01 | `docs/concepts/` — write all nine conceptual documentation pages | docs | L | — |
| T02 | `feature.schema.md` — author Feature store-schema documentation | schema | S | — |
| T03 | JSON schemas — add `feature.schema.json`; add nullable `feature_id` to sprint + task schemas | schema | S | T02 |
| T04 | `seed-store.cjs` — scaffold `features/` on init | tool | S | T03 |
| T05 | `validate-store.cjs` — `feature_id` referential integrity | tool | M | T03 |
| T06 | `collate.cjs` — `engineering/features/INDEX.md` + MASTER_INDEX cross-link | tool | M | T03 |
| T07 | `meta-sprint-intake` + `meta-sprint-plan` — feature linkage + `feature_id` propagation | meta-workflow | M | T02, T03 |
| T08 | `forge:health` — per-feature FEAT-ID test coverage reporting | command | M | T06 |
| T09 | README + vision alignment — containment diagram, absorb default-workflows.md, sync vision | docs | M | T01 |
| T10 | Release engineering — version bump to v0.6.0, migration entry, security scan | meta-workflow | S | ALL |

**Total estimate:** L + S + S + S + M + M + M + M + M + S = **~14–20h of model work**

---

## Dependency Graph

```
T01 ─────────────────────────────────────────────┐
                                                  ▼
T02 ──► T03 ──► T04                              T09 ──►
              ├──► T05                                   T10
              └──► T06 ──► T08                          ▲
                                                   (all)
         T02 ──► T07 ◄── T03
```

### Wave Structure (for reference — sprint runs sequential)

| Wave | Tasks | Can run in parallel? |
|---|---|---|
| 1 | T01, T02 | Yes — no shared files |
| 2 | T03 | After T02 |
| 3 | T04, T05, T06, T07 | Yes — after T03 (T07 also after T02) |
| 4 | T08, T09 | Yes — after T06 (T08), after T01 (T09) |
| 5 | T10 | After all |

---

## Cross-Task Risk Notes

| Risk | Affected Tasks | Mitigation |
|---|---|---|
| `feature.md` state diagram depends on T02 being frozen | T01 | Write `feature.md` last in T01 (after T02 returns); or leave placeholder |
| `collate.cjs` tests require `.forge/store/features/` to exist | T06 | Handle missing directory gracefully; use Forge repo itself as dry-run target |
| Two tasks edit tool files simultaneously in wave 3 | T04, T05, T06 | Sequential mode prevents merge conflicts |
| vision doc update depends on concepts being frozen | T09 | Vision update is last step within T09 |

---

## Carry-over from FORGE-S01

None — S01 closed cleanly (retrospective-done, 0 carry-over items).

---

## Version Target

`0.5.9 → 0.6.0` — locked at T10 release gate.
