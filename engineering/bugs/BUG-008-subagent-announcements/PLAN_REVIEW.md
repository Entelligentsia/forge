# PLAN REVIEW — FORGE-BUG-008: Fix subagent announcements (PERSONA_MAP + noun-based lookup + regeneration)

🌿 *Forge Supervisor*

**Task:** FORGE-BUG-008
**GitHub Issue:** https://github.com/Entelligentsia/forge/issues/39
**Plan reviewed:** `engineering/bugs/BUG-008-subagent-announcements/BUG_FIX_PLAN.md`

---

**Verdict:** Approved

---

## Review Summary

The plan correctly identifies all three compounding root causes and proposes
the right structural fix: a verbatim `PERSONA_MAP + spawn_subagent` block in
`meta-fix-bug.md` that mirrors the established `meta-orchestrate.md` pattern
(lines 168–217), paired with regeneration of `workflows`, `personas`, and
`skills` so the running `.forge/` instance stops using stale role-based
filenames. The algorithm spec, noun-based injection target, event-store root,
version-bump scoping, migration targets, and security-scan requirement are all
correct. A handful of minor advisory items below — none of them blocking.

## Feasibility

- Files-to-modify set is minimal and correct: the only source edit is
  `forge/meta/workflows/meta-fix-bug.md`; the remaining changes are metadata
  (`plugin.json`, `migrations.json`) plus regeneration. Cross-checked against
  `forge/meta/personas/` — `meta-bug-fixer.md` and
  `forge/meta/skills/meta-bug-fixer-skills.md` already exist, so the
  regenerate:personas / regenerate:skills steps will correctly produce
  `.forge/personas/bug-fixer.md` and `.forge/skills/bug-fixer-skills.md`.
- Scope is well-contained: no JS, no schema, no hook changes. One meta-workflow
  edit plus four regeneration targets.
- The plan correctly identifies that `meta-orchestrate.md` already carries the
  fix for root cause 2 and that only regeneration is required to propagate it.

## Completeness

- All three root causes from `ANALYSIS.md` are addressed.
- Acceptance criteria list is comprehensive (12 items) and covers: source edit
  content, generated-file content after regeneration, persona/skill filename
  presence, version bump, migration entry shape, store validation, and the
  security scan artifact.
- Manual smoke test sequence (6 steps) exercises each regeneration target.
- One gap worth noting in advisory: the plan's "Files to Modify" table omits
  the stack-checklist writeback step that appears later in Testing Strategy
  ("After implementation, add a checklist item..."). The writeback is
  mentioned but not enumerated in the acceptance criteria — adding it to the
  acceptance checklist would close the loop. Not blocking.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes. 0.9.4 → 0.9.5. A meta-workflow
  change that alters generated `fix_bug.md` behaviour is material per
  `CLAUDE.md` (any change to `forge/meta/workflows/` that affects generated
  workflow behaviour requires a version bump).
- **Migration entry targets correct?** Yes. The four granular targets
  `workflows:fix_bug`, `workflows:orchestrate_task`, `personas`, `skills` map
  exactly to the stale artefacts identified in the analysis. Granular
  `workflows:*` subtarget syntax is already supported (precedent in
  `0.7.2` → `0.7.3`, `0.8.1` → `0.8.2`, `0.8.9` → `0.8.10`, etc.).
- **Security scan requirement acknowledged?** Yes — planned explicit scan
  saved to `docs/security/scan-v0.9.5.md`, with row to be added to the
  README Security table. Plan correctly notes the scan targets the `forge/`
  source directory (not the installed plugin cache).
- **Schema change?** No — confirmed. No `forge/schemas/` files modified.
- **`breaking: true`?** Correctly `false` — no manual steps are required
  before regeneration; `/forge:update` + regenerate is the full upgrade path.

## No-npm Rule

No new `require()` of non-built-in modules planned. All changes are Markdown.
Pass.

## Architecture Alignment

- **Algorithm pattern match to `meta-orchestrate.md` (lines 168–217):**
  Verified. The plan's proposed algorithm reproduces the five load-bearing
  elements exactly:
  1. `PERSONA_MAP` dictionary keyed by phase role, yielding
     `(emoji, persona_name, tagline)`. ✓
  2. `print(f"\n{emoji} **Forge {persona_name}** — ... [{phase_model}]\n")`
     announcement prior to spawn. ✓
  3. Symmetric injection read_file(persona) + read_file(skill) ordered
     before `spawn_subagent`. ✓
  4. `spawn_subagent` prompt opens with the "print this exact line first —
     before any tool use or file reads" instruction, then injects persona,
     skill, working-context block, workflow path, and /cost sidecar mandate. ✓
  5. Default-fallback tuple in `PERSONA_MAP.get(...)` preserves graceful
     degradation. ✓
- **Noun `"bug-fixer"` used for injection** — correct, no role-literal
  filename (`plan.md`, `implement.md`, etc.). The `.forge/personas/` and
  `.forge/skills/` directories currently hold stale role-based filenames —
  the `regenerate: ["personas", "skills"]` targets will replace them with
  noun-based files sourced from `meta-bug-fixer.md` / `meta-bug-fixer-skills.md`.
- **Event store root `.forge/store/events/bugs/`** — correct. Verified
  against `.forge/store/events/bugs/` on disk, which already contains
  `FORGE-BUG-008_*` events from current sprint phases and historical
  `BUG-007_*` events. The plan's sidecar path
  `.forge/store/events/bugs/_{event_id}_usage.json` matches current
  generated-workflow behaviour.
- **PERSONA_MAP covers all bug-fix phase roles** — The bug-fix pipeline roles
  in the current `fix_bug.md` table (plan, review-plan, implement, review-code,
  approve, commit) all resolve to the same `bug-fixer` persona, and the plan's
  default fallback `("🍂", "Bug Fixer", "I find what has decayed and restore it.")`
  handles any misalignment gracefully. See advisory note 1 below for a
  naming-consistency refinement.

## Testing / Verification Strategy

- `node --check` correctly skipped (no JS files touched).
- `validate-store --dry-run` is in the plan — good.
- Manual smoke-test checklist exercises all four regeneration targets at the
  filesystem level (persona filenames, workflow `ROLE_TO_NOUN` presence,
  announcement-line composition).
- Stack-checklist writeback item is drafted and included. Good regression
  guard: "changes to announcements go in `forge/meta/`, never in `.forge/` directly".

## Security

- Markdown-only change in `forge/meta/workflows/meta-fix-bug.md`. The new
  content is an algorithm specification consumed by the generator; it does
  not execute user input and does not read from untrusted paths. Prompt
  injection surface is unchanged: the regenerated `fix_bug.md` will inject
  persona/skill content that itself lives under Forge control.
- Security scan is explicitly required and planned, with correct output
  artifact path (`docs/security/scan-v0.9.5.md`) and the Security table
  update in `README.md` as required by `CLAUDE.md`.
- No hook, tool, or schema is modified — no new exfiltration or permission
  surface.

## Risk

- **Worst case:** regeneration produces a malformed `fix_bug.md` that fails
  to announce or spawn. Mitigation: the plan's manual smoke test step 5
  confirms `PERSONA_MAP` block, announcement print, and "print this exact
  line first" instruction are present in the regenerated file before
  shipping. That is the right gate.
- **Partial execution:** if only 3 of 4 regeneration targets run, the orchestrator
  may still hit a stale artefact. The migration entry correctly enumerates
  all four, so `/forge:update` will prompt users to run all of them.
- **Backwards compatibility:** existing `.forge/` instances that have not
  yet regenerated continue the pre-existing degraded behaviour
  (empty-string persona/skill content, missing announcement) — not a
  regression, as the plan notes.

---

## Advisory Notes (non-blocking)

1. **PERSONA_MAP key naming.** The plan's proposed `PERSONA_MAP` uses keys
   `triage`, `plan-fix`, `implement`, `review`, `approve`, `commit`. The
   actual bug-fix pipeline roles (per `.forge/workflows/fix_bug.md` table at
   lines 54–61) are `plan`, `review-plan`, `implement`, `review-code`,
   `approve`, `commit`. All collapse to the same `bug-fixer` persona, so the
   default fallback handles any mismatch correctly — but consider aligning
   the keys with the actual phase.role strings (`plan`, `review-plan`,
   `review-code`) during implementation so the lookup succeeds explicitly
   rather than via fallback. This also makes the map self-documenting.

2. **Stack-checklist writeback in acceptance criteria.** The Testing Strategy
   section includes a stack-checklist item, but it does not appear in the
   Acceptance Criteria list. Consider adding a checkbox:
   `engineering/stack-checklist.md contains the meta-fix-bug.md regression guard item`.

3. **Migration date.** Plan uses `"date": "2026-04-15"` — matches today.
   Good. Double-check during implementation that this remains current; if
   implementation slips to the next day, bump the date.

4. **README Security table row.** The `CLAUDE.md` requirement to add a row
   to the README Security Scan History table is implied by the plan's
   reference to `docs/security/scan-v0.9.5.md` but not explicitly called
   out in the Files to Modify table. Implementation should include the
   README edit as part of the same commit as the scan artifact.

5. **Acceptance criterion 5 wording.** The criterion states the regenerated
   `orchestrate_task.md` must use
   `persona_noun = ROLE_TO_NOUN.get(phase.role, phase.role)` — verified
   against `meta-orchestrate.md` lines 209–211, which this exactly matches.
   No change needed; this is a strong, specific assertion.

---

**Verdict:** Approved
