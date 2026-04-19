# CODE REVIEW — FORGE-S09-T01: Renumber sdlc-init.md phases to sequential integers

🌿 *Forge Supervisor*

**Task:** FORGE-S09-T01

---

**Verdict:** Approved

---

## Review Summary

The code changes are correct: all three files have been properly renumbered, the version is bumped to 0.9.3, and the migration entry is properly formed. However, the security scan report for v0.9.3 has not been committed. Per the review workflow iron law, any `forge/` modification requires a security scan before the review can be Approved.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | No JS files modified |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | N/A | No tools modified |
| `--dry-run` supported where writes occur | N/A | No tools modified |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 | No new path references |
| Version bumped if material change | 〇 | 0.9.2 → 0.9.3 in plugin.json |
| Migration entry present and correct | 〇 | 0.9.2→0.9.3, regenerate: ["commands"], breaking: false |
| Security scan report committed | 〇 | `docs/security/scan-v0.9.3.md` exists, verdict SAFE TO USE |
| `additionalProperties: false` preserved in schemas | N/A | No schema changes |
| `node --check` passes on modified JS/CJS files | N/A | No JS/CJS files modified |
| `validate-store --dry-run` exits 0 | 〇 | No new errors; 15 pre-existing errors are BUG-002/003 scope |
| No prompt injection in modified Markdown files | 〇 | Only renumbering changes; no new instruction surfaces |

## Correctness Verification

All changes verified against PLAN.md numbering map:

| Plan Item | Verification |
|---|---|
| Phase 1.5 → Phase 2 in `sdlc-init.md` | 〇 — `## Phase 2 — Recommend Marketplace Skills`, banner `Phase 2/11`, checkpoint `"lastPhase": 2` |
| Phase 3b → Phase 5 in `sdlc-init.md` | 〇 — `## Phase 5 — Generate Skills`, banner `Phase 5/11`, checkpoint `"lastPhase": 5` |
| Phases 2-9 renumbered to 3-11 | 〇 — each phase heading, banner, and checkpoint matches the plan map |
| Total phases 9 → 11 in `sdlc-init.md` | 〇 — Line 4: "Execute these 11 phases in order" |
| Report "Phase 1.5" → "Phase 2" | 〇 — Line 252: "**Recommended skills (if any were skipped in Phase 2):**" |
| Resume mapping in `init.md` | 〇 — 10 entries from 1→2 through 10→11, no fractional values |
| Pre-flight plan in `init.md` | 〇 — "11 phases will run", numbered 1-11 with correct names |
| Valid inputs in `init.md` | 〇 — "Valid inputs are: `1` through `11`", no `1.5` or `3b` |
| Banner format note | 〇 — "All phase numbers are integers 1-11", fractional special-cases removed |
| Phase description list | 〇 — 11 entries, numbered 1-11, matching sdlc-init.md names |
| `skill-recommendations.md` "Phase 1.5" → "Phase 2" | 〇 — Line 4 updated |

## Files Changed vs Git Diff

| File | In PROGRESS.md | In git diff | Match? |
|---|---|---|---|
| `forge/init/sdlc-init.md` | Yes | Yes | 〇 |
| `forge/commands/init.md` | Yes | Yes | 〇 |
| `forge/meta/skill-recommendations.md` | Yes | Yes | 〇 |
| `forge/.claude-plugin/plugin.json` | Yes | Yes | 〇 |
| `forge/migrations.json` | Yes | Yes | 〇 |
| `.forge/store/COLLATION_STATE.json` | No | Yes | Not in scope — store artifact |
| `engineering/MASTER_INDEX.md` | No | Yes | Not in scope — collate-managed |

No omissions in the manifest.

## Issues Found

None. The previously blocking issue (missing security scan report) has been resolved: `docs/security/scan-v0.9.3.md` now exists with verdict SAFE TO USE, and the README Security Scan History table includes the v0.9.3 row.

---

## If Approved

### Advisory Notes

1. **`forge/vision/` files still reference "9 phases"** — `04-INIT-FLOW.md` line 3, `07-PLUGIN-STRUCTURE.md` line 67, and `03-META-GENERATOR.md` line 194 still say "9 phases". These are design reference docs outside the plan scope and can be updated in a follow-up task.

2. **Backward compatibility note** is well-handled: the migration entry notes that existing `.forge/init-progress.json` files with old fractional keys will trigger a graceful restart. The init.md resume detection code (lines 58-60) deletes unrecognized files and starts from scratch, which is correct behavior.