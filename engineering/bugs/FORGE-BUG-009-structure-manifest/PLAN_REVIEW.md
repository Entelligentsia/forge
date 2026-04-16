# PLAN REVIEW — FORGE-BUG-009: Structure manifest and stale generation-manifest fix

🌿 *Forge Supervisor*

**Bug:** FORGE-BUG-009
**Review iteration:** 2 (revised plan)

---

**Verdict:** Approved

---

## Review Summary

The revised plan addresses all six required changes from the previous review and
carries them through into explicit phases, file edits, mapping tables, acceptance
criteria, and Risk Notes. I independently re-verified the meta/ layout, the
contents of `.forge/templates/`, the `.forge/config.json` `paths.*` shape, and
the cross-reference from `forge/commands/add-pipeline.md` to
`CUSTOM_COMMAND_TEMPLATE.md`. The plan is now internally consistent and
actionable.

Minor advisory notes remain for the implementor but none block approval.

## Verification of the Six Required Changes

### 1. CUSTOM_COMMAND_TEMPLATE.md handling — RESOLVED

The previous review required either adding it to TEMPLATE_MAP with a
re-record step, or exempting it from `clear-namespace`. The revised plan
takes option (1) and executes it in full:

- Phase B1 TEMPLATE_MAP now includes `[null, 'CUSTOM_COMMAND_TEMPLATE.md']`
  (line 259) — same `null`-source pattern used for orchestration-generated
  workflows.
- Phase A2 adds an explicit re-record step guarded by `[ -f … ]` after the
  templates regeneration loop (lines 120-125).
- Expected total updated from 56 → **57** (line 355).
- Acceptance criterion added at line 662 for the file surviving a full
  templates regenerate cycle.

Cross-checked against filesystem: `forge/commands/add-pipeline.md` is the
only referrer of `CUSTOM_COMMAND_TEMPLATE.md` in the plugin source. The plan
matches reality. 〇

### 2. Decouple structure-manifest from hardcoded paths — RESOLVED

The revised plan introduces a `logicalKey` field on each namespace entry
(lines 303-346) and a config-aware resolution path in `check-structure.cjs`
(Phase C, lines 396-411):

1. Read `logicalKey` from the namespace.
2. Look up `.forge/config.json` `paths.<logicalKey>`.
3. Fall back to the manifest `dir` field if no config override.
4. Emit a single warning if `.forge/config.json` is absent/unreadable.

Cross-checked against actual `.forge/config.json`: `paths` contains
`workflows`, `commands`, `templates` keys but not `personas`, `skills`, or
`schemas`. The fallback-to-`dir` path will cover those namespaces
correctly. Acceptance criterion at line 661 verifies the behaviour.

### 3. Skills namespace in default regenerate — RESOLVED (by documentation)

The revised plan does not add `skills` to the default regenerate set
(consistent with keeping scope tight) but explicitly documents the
limitation:

- Overview paragraph (lines 26-34) states the limitation upfront and names
  it as the root cause of the 14 stale entries.
- Phase A2 table (line 99-105) marks `skills` as "No — skills is NOT in the
  default run".
- Risk Notes (lines 689-694) reiterate the limitation by design.
- `update.md` post-migration warning (Phase E, lines 508-509) explicitly
  tells users they must run `/forge:regenerate skills` for skill gaps.

This is the "silence not acceptable" standard from the previous review —
the plan now speaks four times. Acceptable resolution. 〇

### 4. Prefix-shape guard on `clear-namespace` — RESOLVED

Phase A1 (lines 51-59) requires the subcommand to reject prefixes that do
not start with `.forge/` or `.claude/` AND do not end with `/`, exiting
with code 2 and a clear usage error. Usage-block text in the file header
includes the guard rule (lines 62-65). Two acceptance criteria (lines
651-652) cover both rejection cases. 〇

### 5. Reverse-drift detection — RESOLVED

Phase B1 (lines 273-287) adds a scan of `forge/meta/personas/meta-*.md`,
`forge/meta/workflows/meta-*.md`, and `forge/meta/templates/meta-*.md` for
meta files not referenced by any mapping table. Emits a non-fatal `△`
warning with a concrete message pointing to the unreferenced file.
Exit 0 regardless — developer signal only. Acceptance criterion at line
659 verifies the warning behaviour.

The plan also retains the forward-drift warning (source exists in mapping
but file missing on disk, lines 289-292), so both directions are covered.
〇

### 6. Smoke-test acceptance criterion for Phase E — RESOLVED

Phase E (lines 519-530) adds two tiers of verification:

- Minimum: read `update.md` and confirm three specific conditions —
  (a) `check-structure.cjs` invocation line is present, (b) placement is
  after the regeneration loop and before Step 5, (c) skills-limitation
  warning text is included.
- Ideal: live upgrade simulation in `/tmp/forge-test/` if the environment
  supports it.

Acceptance criterion at line 665 captures the file-reading check. This is
practical and verifiable — good resolution. 〇

## Feasibility

No changes from previous review. Files identified are correct.

The updated total of 57 files (18 workflows + 6 personas + 6 skills + 9
templates + 13 commands + 5 schemas) is arithmetically correct and matches
the mapping tables as written.

I re-verified:
- `forge/meta/templates/` has 8 files — TEMPLATE_MAP entries with
  non-null sources are 8 → 〇
- `forge/meta/workflows/` has 16 files — WORKFLOW_MAP entries with non-null
  sources are 16 → 〇
- `forge/meta/personas/` has 8 files — PERSONA_MAP has 6 entries, 2
  exclusions (`meta-orchestrator.md`, `meta-product-manager.md`) declared
  in B1 comment → 〇
- `forge/schemas/` has 5 `.schema.json` files → 〇
- `.forge/skills/` in the dogfooding instance has exactly the 6 skills
  derived by `SKILL_NAMES = PERSONA_MAP.map(…)` → 〇

## Completeness

All acceptance criteria from the bug prompt are covered. Acceptance criteria
list has expanded appropriately (line 650-671) to cover the new
requirements.

No edge case gaps detected. Rollback path: `regenerate: []` and
`breaking: false` mean users can roll back to 0.9.7 cleanly if needed (the
new tools are additive; removal is non-destructive).

Hook exit discipline: not applicable — all tools are synchronous shell
invocations, not hooks.

## Plugin Impact Assessment

- Version bump 0.9.7 → 0.9.8 is correct (0.9.7 is consumed by the fix-bug
  persona-assignment migration). Plan acknowledges (lines 566-568).
- `regenerate: []` is correct — the new tools ship with the plugin and are
  invoked directly; `structure-manifest.json` ships in
  `forge/schemas/` as a new plugin file.
- Security scan requirement acknowledged (Phase G3, lines 596-607) with
  correct `--source-path forge/` argument and output path
  `docs/security/scan-v0.9.8.md`.
- README security table row formatted correctly (line 606).
- `breaking: false` is correct given that the
  CUSTOM_COMMAND_TEMPLATE.md re-record step handles the manifest drift
  transparently during the first regenerate after upgrade.

## No-npm Rule

Compliant. The plan only uses Node built-ins (`fs`, `path`, `crypto`). 〇

## Architecture Alignment

- Tools live under `forge/tools/` — matches existing pattern. 〇
- Invocation via `$FORGE_ROOT/tools/*.cjs` from commands — matches
  `routing.md` discipline. 〇
- `check-structure.cjs` now reads `.forge/config.json` `paths.*` — config
  convention honoured. 〇
- `additionalProperties`: not applicable (no JSON Schema edits; the
  `structure-manifest.json` is a data file, not a schema).
- Hook exit discipline: not applicable (no hooks added).

## Testing / Verification Strategy

- `node --check` on all modified/created `.cjs` files — explicit in
  acceptance criteria (line 669). 〇
- `validate-store --dry-run` — not applicable (no store schema touched).
- Manual smoke test for Phase E — specified (lines 519-530). 〇
- Dogfooding verification — A3 step removes stale entries and verifies via
  `list --modified` showing 0 missing (lines 176-181). 〇

## Security

- No untrusted input paths. `clear-namespace` prefix is operator-supplied
  from `regenerate.md`. Prefix-shape guard (Phase A1) closes the main
  footgun.
- No prompt-injection risk in the Markdown edits — all edits are internal
  Forge command text, not user-supplied.
- Security scan planned and properly scoped to `forge/` source (Phase G3).
  〇

## Risk

The revised Risk Notes section (lines 676-717) covers:
- `clear-namespace` footgun — mitigated by prefix guard.
- CUSTOM_COMMAND_TEMPLATE.md orphaning — mitigated by TEMPLATE_MAP entry +
  re-record step.
- Skills default-regenerate gap — explicit by-design limitation.
- Mapping drift from meta/ — mitigated by CLAUDE.md process + reverse-drift
  detection.
- FORGE_ROOT resolution — documented and correct.
- Partial-execution leaves manifest in incomplete state — documented;
  recovery = re-run regenerate.
- Version divergence between manifest and plugin.json — mitigated by
  embedding plugin.json version at build time + CLAUDE.md process.

All reasonable risks addressed with either mitigation or documented
trade-off.

---

## Advisory Notes (for implementation)

1. **`logicalKey` vs `dir` in the manifest.** The plan includes both fields
   per namespace. Consider whether `dir` is still needed (it is the fallback
   for projects without `.forge/config.json`). Keeping both is fine; just
   document that `dir` is fallback-only and `logicalKey` is authoritative.

2. **Reverse-drift warning message format.** The proposed wording in B1
   (line 283) is good. Make sure the emitted line uses the Japanese
   marks style (`△`) consistently. Also consider including the mapping
   table name in the message (`PERSONA_MAP` / `WORKFLOW_MAP` / `TEMPLATE_MAP`)
   so the fixer knows where to edit.

3. **A3 dogfooding repair shell loop.** The loop in A3 (lines 153-172) uses
   `remove` rather than the new `clear-namespace`. That is fine — both work —
   but consider running the `clear-namespace` variant instead to exercise
   the new subcommand before the migration ships. Either approach meets
   the acceptance criterion.

4. **Security scan narrative.** When scan-v0.9.8.md is written, include a
   short note that the scan covered the three new artifacts
   (`build-manifest.cjs`, `check-structure.cjs`, `generation-manifest.cjs`
   delta) so the report is self-explanatory. This is a nice-to-have.

5. **Update.md banner math.** Confirmed correct — the new post-migration
   check is within Step 4, so the `Step N/6` banners don't need adjustment.

6. **Future enhancement worth flagging (not in scope).** Splitting the
   five mapping tables into a sibling data file
   (`forge/tools/build-manifest.maps.json`) would make future edits
   reviewable as data-only diffs. Advisory only; the current in-code
   tables are acceptable for this fix.

---

## Knowledge Writeback

Added to `engineering/stack-checklist.md` (deferred — no new check required
as a pre-commit gate; the structure check runs via `/forge:health` and
`/forge:update` post-migration, both of which are user-facing, not plugin
pre-commit). No writeback needed.

---

**Verdict:** Approved
