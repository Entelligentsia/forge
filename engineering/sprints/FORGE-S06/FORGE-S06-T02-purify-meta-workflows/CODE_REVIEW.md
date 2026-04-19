# CODE REVIEW — FORGE-S06-T02: Purify meta-workflows — remove Persona sections, reassign sprint-intake to PM

*Forge Supervisor*

**Task:** FORGE-S06-T02

---

**Verdict:** Approved

---

## Review Summary

The implementation correctly removes all 16 `## Persona` sections from meta-workflow templates, adds proper `Persona Self-Load` Generation Instructions to the 6 standalone command workflows, and reassigns sprint-intake from Architect to Product Manager. The two previously-flagged blocking issues have been resolved: (1) the security scan report for v0.7.7 now exists at `docs/security/scan-v0.7.7.md` with SAFE TO USE verdict, and (2) the README security table now includes a row for v0.7.7.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | N/A | All modified files are Markdown |
| Hook exit discipline (exit 0 on error, not non-zero) | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | N/A | No tools modified |
| `--dry-run` supported where writes occur | N/A | No write-capable files modified |
| Reads `.forge/config.json` for paths (no hardcoded paths) | N/A | No JS files modified |
| Version bumped if material change | Pass | `plugin.json` bumped 0.7.6 -> 0.7.7 |
| Migration entry present and correct | Pass | `migrations.json` has entry for 0.7.6->0.7.7 with `regenerate: [{target: "workflows"}]`, `breaking: false` |
| Security scan report committed | Pass | `docs/security/scan-v0.7.7.md` exists, verdict: SAFE TO USE |
| Security scan row in README | Pass | README.md Security Scan History table updated with v0.7.7 row |
| `additionalProperties: false` preserved in schemas | N/A | No schema changes |
| `node --check` passes on modified JS/CJS files | Pass | No JS files modified by this task |
| `validate-store --dry-run` exits 0 | Pass | 110 errors are all pre-existing; no new errors introduced |
| No prompt injection in modified Markdown files | Pass | All modified files are structural meta-workflow templates; no injection vectors |

## Correctness Verification (independent of PROGRESS.md)

| Acceptance Criterion | Verified | Evidence |
|---|---|---|
| No `## Persona` section in any `forge/meta/workflows/meta-*.md` | Pass | `grep -r "^## Persona" forge/meta/workflows/` returns zero matches |
| All 10 orchestrator-spawned meta-workflows have no persona-related content | Pass | No `## Persona` sections, no `See meta-` references, no `{Project}` placeholders |
| All 6 standalone command meta-workflows have `Persona Self-Load` instruction | Pass | Grep for `Persona Self-Load` returns exactly 6 matches |
| Persona Self-Load references correct noun-based filenames | Pass | bug-fixer.md, collator.md, product-manager.md, architect.md (x3) |
| `meta-sprint-intake.md` references Product Manager | Pass | H1: `# Meta-Workflow: Sprint Intake`; Self-Load: `.forge/personas/product-manager.md` |
| Version bumped in `plugin.json` | Pass | `"version": "0.7.7"` |
| Migration entry correct in `migrations.json` | Pass | Entry for 0.7.6->0.7.7 with correct regenerate, breaking, manual fields |
| Security scan report exists | Pass | `docs/security/scan-v0.7.7.md` present, verdict SAFE TO USE |
| README security table updated | Pass | v0.7.7 row present with correct summary |

## Advisory Notes

1. The current `.forge/personas/` dogfooding directory still has role-based filenames from before T01's noun-based convention. After running `/forge:update` with the v0.7.7 migration, regeneration should produce noun-based filenames. The Self-Load instructions will resolve correctly only after regeneration.

2. The `meta-orchestrate.md` file still uses model names `claude-3-opus`, `claude-3-5-sonnet`, and `claude-3-haiku` in its Capability Table, while the generated `.forge/workflows/orchestrate_task.md` uses `opus`, `sonnet`, `haiku`. This pre-existing inconsistency is not introduced by T02.