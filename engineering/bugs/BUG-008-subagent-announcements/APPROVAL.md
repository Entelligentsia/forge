# Architect Approval — FORGE-BUG-008

🗻 *Forge Architect*

**Bug ID:** FORGE-BUG-008
**GitHub Issue:** https://github.com/Entelligentsia/forge/issues/39
**Plan Reference:** `engineering/bugs/BUG-008-subagent-announcements/BUG_FIX_PLAN.md`
**Code Review Verdict:** Approved (🌿 Forge Supervisor)

**Status:** Approved

---

## Verification of Approval Context Items

1. **Plugin-source edit location (iron-law compliance).** Confirmed. The substantive edit lives in `forge/meta/workflows/meta-fix-bug.md` (lines 72–127 — new `## Announcement Algorithm` block). The downstream `.forge/workflows/fix_bug.md`, `.forge/workflows/orchestrate_task.md`, and the new noun-based files in `.forge/personas/` and `.forge/skills/` are acknowledged in `PROGRESS.md` as regeneration output, not hand edits. This is the correct shape for a Forge fix: the meta drives the instance, so any future `/forge:regenerate` preserves the fix rather than wiping it — which was exactly the third root cause of this bug.

2. **Security scan present and non-empty.** Confirmed. `docs/security/scan-v0.9.5.md` exists (5311 bytes) and carries a complete report: 106 files scanned against the source at `/home/boni/src/forge/forge/` (not plugin cache), 0 critical findings, 1 warning (update.md size — carry-forward, cosmetic), 2 info items (outbound HTTPS in check-update.js and dual hook registration — both legitimate and previously audited). The report explicitly calls out the new v0.9.5 `meta-fix-bug.md` algorithm under "Clean Areas" and confirms it is additive Markdown with no injection patterns or executable side effects. Verdict: **SAFE TO USE**. The README Security Scan History table has a row for 0.9.5 dated 2026-04-15 linking to the report.

3. **Version string.** Confirmed. `forge/.claude-plugin/plugin.json` carries `"version": "0.9.5"` (bump from 0.9.4). `updateUrl` and `migrationsUrl` both still point at the `main` branch — correct for this canary distribution; no skillforge-specific patching needed.

4. **Migration entry.** Confirmed. `forge/migrations.json` `"0.9.4"` key has `"version": "0.9.5"`, `"date": "2026-04-15"`, `"regenerate": ["workflows:fix_bug", "workflows:orchestrate_task", "personas", "skills"]`, `"breaking": false`, `"manual": []`, and a descriptive `notes` field identifying all three addressed root causes. All fields required by CLAUDE.md are present and the regenerate targets precisely cover what changed.

5. **Architectural soundness.** Confirmed. All three root causes from the BUG_FIX_PLAN are addressed at the right layer:
   - Root cause 1 (missing announcements in `meta-fix-bug.md`) is fixed in the meta-workflow — future regenerations will carry the algorithm forward.
   - Root cause 2 (role-based lookups in `orchestrate_task.md`) is fixed via `ROLE_TO_NOUN` dict resolution with `persona_noun` — no `{phase.role}.md` residue remains (grep-verified).
   - Root cause 3 (stale role-based persona/skill filenames) is fixed by generating noun-based files — symmetric injection now reads `bug-fixer.md` / `bug-fixer-skills.md` rather than returning empty on missing `plan-fix.md` etc.
   A regression guard is added at `engineering/stack-checklist.md` lines 50–53 so this class of regression surfaces on future meta-workflow edits.

## Architectural Review

**Backwards compatibility.** Yes. The migration is marked `"breaking": false` with an empty `manual` array, which is correct: the regenerate targets are automatic (`/forge:update` drives them), stale role-based persona files in `.forge/personas/` are left in place but harmless (never read by the new orchestrator), and no schema field was added or removed. Users on 0.9.4 get a clean forward path.

**Migration correctness.** The four `regenerate` targets (`workflows:fix_bug`, `workflows:orchestrate_task`, `personas`, `skills`) exactly match the four artifact classes that were regenerated in this fix. Users will need `/forge:update` after installing 0.9.5 — the migration notes are clear about this, and the targets will drive the regeneration automatically.

**Update path.** This change does not touch `/forge:update`, `check-update.js`, or the migrations engine itself. No update-path exercise required.

**Cross-cutting concerns.** The change touches announcement and persona-injection machinery only. The event emission table in `orchestrate_task.md` (lines 302–319) and the sidecar merge flow (lines 198–202) are preserved unchanged — verified in the code review. No other commands, hooks, or tools are affected. The regeneration protocol itself is unchanged.

**Operational impact.** Six new files are added to `.forge/personas/` (noun-based `engineer.md`, `supervisor.md`, `qa-engineer.md`, `architect.md`, `collator.md`, `bug-fixer.md`) and seven new files to `.forge/skills/` (matching `*-skills.md`). These are additive — no existing files removed. No new directories, no new disk-write sites in tools or hooks. Disk footprint on upgrade is ~24 KB of markdown total.

**Security posture.** No new trust boundaries. The security scan (`docs/security/scan-v0.9.5.md`) is present, audits the v0.9.5 changes specifically, and finds no injection patterns, no exfiltration, no permission escalation. The scan was correctly run against the source directory, not the plugin cache.

## Distribution Notes

- **Version bump:** 0.9.4 → 0.9.5 (patch — bug fix).
- **Migration entry:** present, `breaking: false`, `regenerate` includes the four correct targets.
- **Security scan:** `docs/security/scan-v0.9.5.md` committed, SAFE TO USE, 0 critical.
- **README:** Security Scan History table updated with 0.9.5 row.
- **User-facing impact:** After `/forge:update`, users get a reliable announcement banner on every subagent spawn in both `/run-task` and `/fix-bug` pipelines — restoring the principal-agent clarity the 🗻/🌿/🍂/🌳 persona system was designed to provide.

## Operational Notes

- Users on 0.9.4 install via `/plugin install forge@forge` (canary) or `/plugin install forge@skillforge` (stable, once promoted) and then run `/forge:update`. The migration engine will regenerate `workflows:fix_bug`, `workflows:orchestrate_task`, `personas`, and `skills` automatically.
- No manual steps required. No config edits needed.
- Stale role-based files in `.forge/personas/` (`plan.md`, `implement.md`, `review-plan.md`, etc.) and their `*-skills.md` counterparts remain on disk after the upgrade but are never read (the new `ROLE_TO_NOUN` dict resolves phase roles to noun filenames). They are harmless but visually confusing if a user browses `.forge/personas/` by hand.

## Follow-Up Items

1. **Stale role-based persona/skill cleanup.** A future maintenance pass should add a `forge:regenerate` step that removes legacy role-based files (`.forge/personas/{plan,implement,review-plan,review-code,validate,approve,commit}.md` and matching `*-skills.md`) when noun-based equivalents exist. Not blocking — current orchestrator correctly resolves noun files — but worth tidying for operator ergonomics. Carry as a minor maintenance item.

2. **Pre-existing `validate-store --dry-run` errors.** 28–29 pre-existing errors remain (9 sprint path errors, 1 bug field error, 18–19 event-field errors concentrated in `FORGE-S09/plan-sprint-plan.json` and `sprint-start.json`). Not introduced by this fix — confirmed via file-timestamp analysis. Tracked under BUG-002/003 and scheduled for FORGE-S09-T08.

3. **Default-fallback persona awareness.** `.forge/workflows/orchestrate_task.md` line 161 uses a default tuple of `("🌊", "Orchestrator", ...)` for any unmapped role. If a new role lands in `config.pipelines` without a `PERSONA_MAP` entry, subagents announce as "Orchestrator". This is the pre-existing behaviour and matches the plan scope — note for future awareness when adding new pipeline phases.

---

**Verdict:** Approved — cleared for commit.
