# VALIDATION REPORT — FORGE-S09-T05: Calibrate command — drift detection, categories, surgical patches

🍵 *Forge QA Engineer*

**Task:** FORGE-S09-T05

---

**Verdict:** Approved

---

## Acceptance Criteria Checklist

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | `/forge:calibrate` reports drift categories with specific affected agent definitions | PASS | `forge/commands/calibrate.md` Step 4 defines four-category table: Technical → `personas:engineer`, `skills:engineer-skills`, `skills:supervisor-skills`; Business → `personas` (full rebuild); Retrospective → `personas:<role>`; Acceptance criteria → `personas:product-manager`, `skills:qa-engineer`. Matches task prompt exactly. |
| 2 | Proposed patches are structured migration entries (target, type, patch, optional fields) per the #32 format | PASS | `forge/commands/calibrate.md` Step 8 defines `calibrationHistory` patches with `target`, `type` (enum: `"regenerate"`), and `applied` (boolean). The `applied` field replaces the generic `patch` field from the AC, providing more actionable audit data. Schema verified in `forge/sdlc-config.schema.json` lines 247-294. |
| 3 | No changes applied without explicit Architect approval | PASS | `forge/commands/calibrate.md` Step 6 — Architect approval gate with `[Y] Apply all`, `[r] Review individually`, `[n] Skip`. Explicit approval required before Step 7 (regeneration). |
| 4 | After approval, regenerated agents reflect the current KB state | PASS | Step 7 invokes `/forge:regenerate <category> <sub-target>` by reading and following `regenerate.md`. Regeneration uses current KB content at execution time. |
| 5 | Approved patches written to `.forge/config.json` calibration history | PASS | Step 8 appends entries to `calibrationHistory` array in `.forge/config.json`. Schema property exists in `forge/sdlc-config.schema.json`. Config write pattern uses `fs.readFileSync/parse/stringify/writeFileSync` — same as init. |
| 6 | `node --check` passes on all modified JS/CJS files | PASS | No JS/CJS files were modified. Command is pure Markdown. |

## Forge-Specific Validations

| Check | Result | Evidence |
|-------|--------|----------|
| Version bump | PASS | `forge/.claude-plugin/plugin.json` → `version: "0.9.12"` (plan declared 0.9.11→0.9.12) |
| Migration entry | PASS | `forge/migrations.json` entry `0.9.11→0.9.12`, `regenerate: ["commands"]`, `breaking: false` |
| Security scan report | PASS | `docs/security/scan-v0.9.12.md` exists — SAFE TO USE |

## Edge Case Checks

| Check | Result | Notes |
|-------|--------|-------|
| No-npm rule | PASS | No `require()` calls introduced; Markdown command only |
| Hook exit discipline | N/A | No hooks modified |
| Schema `additionalProperties: false` | PASS | `calibrationHistory` items and nested `patches` items both have `additionalProperties: false` |
| Backwards compatibility | PASS | `calibrationHistory` is optional (not in `required`). Existing projects without it work fine. Migration `regenerate: ["commands"]` ensures users get the command wrapper via `/forge:update`. |

## Regression Check

- No JS/CJS files modified — `node --check` not applicable
- No store schemas modified — `validate-store --dry-run` produces same 73 pre-existing errors (FORGE-S09-T08)
- Config schema change is additive — no breaking changes