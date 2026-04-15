# CODE REVIEW — FORGE-BUG-008: Fix subagent announcements (PERSONA_MAP + noun-based lookup + regeneration)

🌿 *Forge Supervisor*

**Bug ID:** FORGE-BUG-008
**GitHub Issue:** https://github.com/Entelligentsia/forge/issues/39
**Plan Reference:** `engineering/bugs/BUG-008-subagent-announcements/BUG_FIX_PLAN.md`

---

**Verdict:** Approved

---

## Review Summary

All three root causes identified in `BUG_FIX_PLAN.md` are addressed cleanly. `meta-fix-bug.md` now carries a complete `PERSONA_MAP` + verbatim `spawn_subagent` algorithm — guaranteeing correct announcement infrastructure in every future regeneration of `fix_bug.md`. The running instance's `fix_bug.md` and `orchestrate_task.md` have been regenerated and verified: announcement lines include `{tagline}` and `[{phase_model}]`, persona lookups are noun-based (no `{phase.role}.md` residue), and symmetric injection points at `bug-fixer.md` / `bug-fixer-skills.md`. Version bump, migration entry, and security scan are all in place.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | Markdown-only change; no `require()` edits. |
| Hook exit discipline (exit 0 on error, not non-zero) | 〇 N/A | No hook files modified. |
| Tool top-level try/catch + exit 1 on error | 〇 N/A | No tool files modified. |
| `--dry-run` supported where writes occur | 〇 N/A | No tool files modified. |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 N/A | No JS files modified; generated workflow references `".forge/store"` as the plan specifies. |
| Version bumped if material change | 〇 | `forge/.claude-plugin/plugin.json` is `0.9.5`. |
| Migration entry present and correct | 〇 | `forge/migrations.json` has `"0.9.4"` → `0.9.5` with `regenerate: ["workflows:fix_bug", "workflows:orchestrate_task", "personas", "skills"]`, `breaking: false`, `manual: []`. |
| Security scan report committed | 〇 | `docs/security/scan-v0.9.5.md` exists, **SAFE TO USE**, source scanned at `/home/boni/src/forge/forge/` (not plugin cache). |
| `additionalProperties: false` preserved in schemas | 〇 N/A | No schema files touched. |
| `node --check` passes on modified JS/CJS files | 〇 N/A | No JS/CJS files modified. |
| `validate-store --dry-run` exits 0 | △ Pre-existing errors only | Independently re-run: 28 errors, all pre-existing in `plan-sprint-plan.json` / `sprint-start.json` and `WARN` entries on dangling `path` fields. These are tracked under BUG-002/003 and scheduled for FORGE-S09-T08. No schema-affecting change in this fix. |
| No prompt injection in modified Markdown files | 〇 | Reviewed every modified `.md`: additions are verbatim algorithm/persona content, no post-document content, no HTML comments with hidden instructions, no zero-width Unicode, no instructions to exfiltrate or escalate permissions. |

## Correctness — Spec Compliance (independently verified file-by-file)

### 1. `forge/meta/workflows/meta-fix-bug.md`

- Reads: file contains a new `## Announcement Algorithm` section (lines 72–127).
- **PERSONA_MAP present** (lines 79–86) covering all six required phase roles: `plan-fix`, `review-plan`, `implement`, `review-code`, `approve`, `commit`. All entries use 🍂 / "Bug Fixer" / "I find what has decayed and restore it." — matches plan §PERSONA_MAP verbatim.
- Default fallback comment present (lines 87–88) with the same tuple.
- **Announcement print** (line 92): `print(f"\n{emoji} **Forge {persona_name}** — {bug_id} · {tagline} [{phase_model}]\n")` — matches plan.
- **Symmetric injection** (lines 94–96): `read_file(".forge/personas/bug-fixer.md")` / `read_file(".forge/skills/bug-fixer-skills.md")`, both literal noun constants.
- **`spawn_subagent` verbatim block** (lines 99–118): opens with "Your first output — before any tool use or file reads — print this exact line:" and includes tagline+model in the first-line banner.
- **Events root**: line 109 states `Events Root: .forge/store/events/bugs/` and sidecar path uses `.forge/store/events/bugs/_{event_id}_usage.json` (line 113) — matches plan §5.
- **Key rules block** (lines 121–126) explicitly forbids `{phase.role}.md` lookups and mandates tagline+model on the announcement line — regression guard for future regenerations.

### 2. `.forge/workflows/fix_bug.md`

- Regenerated. `PERSONA_MAP` present (lines 95–102) — six phases, all 🍂 Bug Fixer. Matches `meta-fix-bug.md`.
- Announcement print on orchestrator stdout (line 124): includes `{tagline}` and `[{phase_model}]`.
- `spawn_subagent` prompt (lines 137–152) opens with the mandated first-line instruction and embeds the same `emoji/persona_name/bug_id/tagline/phase_model` banner. Symmetric injection at lines 132–133 reads `.forge/personas/bug-fixer.md` and `.forge/skills/bug-fixer-skills.md`.
- Event store root is `.forge/store/events/bugs/` (lines 118, 146, 150).
- No `{phase.role}.md` lookup remains (grep confirmed — only `phase.role` usage is `event_id` construction).

### 3. `.forge/workflows/orchestrate_task.md`

- Regenerated. `PERSONA_MAP` intact (lines 113–124) covering plan/implement/update-plan/update-impl/commit/review-plan/review-code/validate/approve/writeback.
- **`ROLE_TO_NOUN` dict present** (lines 127–138) — regression guard for the pre-existing orchestrator fix — plan/implement/update-*/commit → engineer, review-* → supervisor, validate → qa-engineer, approve → architect, writeback → collator.
- **Announcement line** (line 164): `print(f"\n{emoji} **Forge {persona_name}** — {task_id} · {tagline} [{phase_model}]\n")` — includes tagline and model.
- **Noun-based lookups** (lines 171–173): `persona_noun = ROLE_TO_NOUN.get(phase.role, phase.role)` → `read_file(f".forge/personas/{persona_noun}.md")` and `read_file(f".forge/skills/{persona_noun}-skills.md")`. No `{phase.role}.md` residue.
- Spawn_subagent prompt (lines 177–192) opens with the mandated "print this exact line first" instruction.
- Event emission field list (lines 302–319) preserved — no regression to event schema routing.

### 4. `.forge/personas/`

Noun-based files exist on disk and contain non-empty content:
- `engineer.md` (2211 B), `supervisor.md` (2212 B), `qa-engineer.md` (1847 B), `architect.md` (1938 B), `collator.md` (1377 B), `bug-fixer.md` (1941 B).
- Legacy role-based files (`plan.md`, `implement.md`, `review-plan.md`, `review-code.md`, `validate.md`, `approve.md`, `commit.md`) are still present but harmless — `ROLE_TO_NOUN` now resolves to noun files, so role-based files are never read by the regenerated orchestrator. PROGRESS.md calls this out explicitly; cleanup deferred to a maintenance pass. Acceptable.
- Corresponding noun-based skill files (`engineer-skills.md`, `supervisor-skills.md`, `qa-engineer-skills.md`, `architect-skills.md`, `collator-skills.md`, `bug-fixer-skills.md`) all present and non-empty.

### 5. `forge/.claude-plugin/plugin.json`

- Version = `"0.9.5"`. `updateUrl` and `migrationsUrl` still point at the `main` branch — correct for this distribution.

### 6. `forge/migrations.json`

- `"0.9.4"` key exists with `"version": "0.9.5"`, correct `regenerate` list (`workflows:fix_bug`, `workflows:orchestrate_task`, `personas`, `skills`), `breaking: false`, `manual: []`, and a descriptive `notes` field. No missing fields.

### 7. `docs/security/scan-v0.9.5.md`

- Exists. Scope line confirms source scan of `/home/boni/src/forge/forge/` (not cache). 106 files scanned, 0 critical, 1 warning (`update.md` file size — carry-forward, accepted), 2 info (legitimate outbound HTTPS in `check-update.js`, dual hook registration). Verdict: **SAFE TO USE**. Explicit mention of v0.9.5 `meta-fix-bug.md` change and audit under "Clean Areas" confirms reviewer examined the new algorithm for injection patterns.

### 8. `README.md`

- Security Scan History table row for `0.9.5` present at line 289 with correct date (2026-04-15), link to `docs/security/scan-v0.9.5.md`, and summary "106 files — 0 critical, 1 warning, 2 info — SAFE TO USE".

## Regression Checks

- **`orchestrate_task.md` PERSONA_MAP preservation:** all 10 prior role entries intact, plus the ROLE_TO_NOUN dict added without collision. Verified.
- **Sprint event routing:** event emission table (lines 302–319) and sidecar merge (lines 198–202) both preserved with original field names.
- **`{phase.role}.md` literal lookups:** grep over both regenerated workflows — zero matches of `{phase.role}.md` or `.forge/personas/{phase.role}.md`. The only `phase.role` occurrence is in `event_id` construction (expected).
- **`fix_bug.md` PERSONA_MAP completeness:** covers exactly the six phases mandated by the plan. `triage` is deliberately omitted from PERSONA_MAP because triage is inline (pre-phase) and spawns no subagent — see `## Triage (Inline Pre-Phase)` section at lines 21–40. Consistent with the plan's intent.

## CLAUDE.md Iron Law Compliance

- **Two-layer architecture:** The fix edits `forge/meta/workflows/meta-fix-bug.md` (correct — plugin source). Regenerated files in `.forge/` are acknowledged as regeneration output, not hand-edits, which aligns with the regeneration protocol. PROGRESS.md is transparent about which edits were in-source vs. regenerated.
- **Version bump required:** 〇 done (0.9.5).
- **Migration entry:** 〇 done with correct regenerate targets.
- **Security scan:** 〇 done against `forge/` source with report at `docs/security/scan-v0.9.5.md`.
- **Security table updated:** 〇 done in README.md.

## Issues Found

None blocking.

---

## Advisory Notes

1. **Stale role-based persona/skill files remain:** `.forge/personas/{plan,implement,review-plan,review-code,validate,approve,commit}.md` and their matching `*-skills.md` are unused after this fix. Consider adding a regeneration step in a future maintenance pass that removes legacy role-based files when noun-based equivalents exist, to avoid confusion for anyone reading `.forge/personas/` by hand. Not blocking — the orchestrator resolves the correct files through `ROLE_TO_NOUN`.
2. **`validate-store --dry-run` not clean:** 28 pre-existing errors remain (9 path errors, 1 bug field error, 18 event-field errors concentrated in `FORGE-S09/plan-sprint-plan.json` and `sprint-start.json`). These are tracked under BUG-002/003 and scheduled for FORGE-S09-T08. Not introduced by this implementation (file timestamps predate this bug-fix work) — confirmed.
3. **Stack-checklist regression guard:** Added at `engineering/stack-checklist.md` lines 50–53 under `## Meta-Workflows` — good. The entry correctly notes that bug-fix announcement changes go in `forge/meta/`, never `.forge/` directly.
4. **Orchestrator default fallback:** `.forge/workflows/orchestrate_task.md` line 161 uses `PERSONA_MAP.get(phase.role, ("🌊", "Orchestrator", ...))` — if a new role lands in `config.pipelines` without a PERSONA_MAP entry the subagent will announce as "Orchestrator". This is the pre-existing behaviour and matches the plan's scope — note only for future awareness.

---

**Verdict:** Approved
