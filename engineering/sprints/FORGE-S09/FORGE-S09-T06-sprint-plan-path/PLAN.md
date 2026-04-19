# PLAN — FORGE-S09-T06: SPRINT_PLAN.md output path in meta-sprint-plan

🌱 *Forge Engineer*

**Task:** FORGE-S09-T06
**Sprint:** FORGE-S09
**Estimate:** S

---

## Objective

Fix `forge/meta/workflows/meta-sprint-plan.md` to explicitly specify the output path
`engineering/sprints/{sprintId}/SPRINT_PLAN.md` in the Documentation step, so that the
generated `architect_sprint_plan.md` workflow directs the agent to write the file inside
the sprint directory rather than at an unspecified (and in practice often root-level)
location.

## Research Findings

### The Bug

`forge/meta/workflows/meta-sprint-plan.md` Algorithm Step 4 currently reads:

```
4. Documentation:
   - Generate SPRINT_PLAN.md
   ...
```

No path is specified. When `forge:regenerate workflows` produces
`.forge/workflows/architect_sprint_plan.md`, the SPRINT_PLAN.md generation instruction
is either dropped entirely (as seen in the current generated file, which has no
SPRINT_PLAN.md step at all) or produces an ambiguous, root-level location.

### Scope

Only one file requires modification:

- `forge/meta/workflows/meta-sprint-plan.md` — fix Step 4 to add the explicit path

The generated dogfooding workflow `.forge/workflows/architect_sprint_plan.md` will need to
be regenerated via `/forge:regenerate workflows:architect_sprint_plan` or by the user
after upgrading — this is not done in this task (per the two-layer architecture boundary:
`.forge/` is regenerated output, not edited directly).

### No JS Files Modified

This is a Markdown meta-workflow change. No `.js` or `.cjs` files are touched.
`node --check` applies only to JS/CJS files — there are none to check here.

`node forge/tools/validate-store.cjs --dry-run` is not required since no schema changes
are made.

## Approach

Single targeted edit to `forge/meta/workflows/meta-sprint-plan.md`:

In the Algorithm block's Step 4, replace the bare `Generate SPRINT_PLAN.md` line with
an explicit path instruction:

```
- Write SPRINT_PLAN.md at `engineering/sprints/{sprintId}/SPRINT_PLAN.md`
```

This is the minimal, precise fix. No other steps or sections need changes.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/meta/workflows/meta-sprint-plan.md` | Specify output path for SPRINT_PLAN.md in Step 4 | Bug: path was unspecified, causing ambiguous or missing file placement |

## Plugin Impact Assessment

- **Version bump required?** Yes — changes to `forge/meta/workflows/` affect generated
  workflows, which is a material change under CLAUDE.md criteria ("Bug fixes to any
  command, hook, tool spec, or workflow").
- **New version:** 0.9.3 → **0.9.4**
- **Migration entry required?** Yes — `regenerate: ["workflows:architect_sprint_plan"]`
  so users get the fixed SPRINT_PLAN.md placement on next `/forge:update`.
- **Security scan required?** Yes — any change to `forge/` requires a scan.
- **Schema change?** No — no `.schema.json` files are touched.
- **Breaking change?** No — purely additive path specification.

## Testing Strategy

- No JS/CJS files modified → `node --check` not applicable.
- No schema changes → `validate-store --dry-run` not required.
- Manual verification: read `forge/meta/workflows/meta-sprint-plan.md` after the edit
  and confirm Step 4 shows `engineering/sprints/{sprintId}/SPRINT_PLAN.md` explicitly.

## Acceptance Criteria

- [ ] `forge/meta/workflows/meta-sprint-plan.md` Step 4 explicitly states the output path
      `engineering/sprints/{sprintId}/SPRINT_PLAN.md`
- [ ] The path specification is clear and unambiguous — no prose-only mention
- [ ] Version bumped to 0.9.4 in `forge/.claude-plugin/plugin.json`
- [ ] Migration entry added to `forge/migrations.json` for 0.9.3 → 0.9.4 with
      `regenerate: ["workflows:architect_sprint_plan"]`
- [ ] Security scan report saved to `docs/security/scan-v0.9.4.md`
- [ ] README security table updated with 0.9.4 row

## Operational Impact

- **Distribution:** Users must run `/forge:update` then confirm regeneration of
  `workflows:architect_sprint_plan` to receive the fix in their project.
- **Backwards compatibility:** Fully backwards compatible. Existing sprint plans already
  placed in the correct directory are unaffected. Only future `/sprint-plan` runs gain
  the explicit path.
