# PLAN — FORGE-S11-T03: Fix orchestrate_task ROLE_TIER model fallback not applied (#57)

🌱 *Forge Engineer*

**Task:** FORGE-S11-T03
**Sprint:** FORGE-S11
**Estimate:** M

---

## Objective

Fix `forge/meta/workflows/meta-orchestrate.md` so that when no cluster environment variables
(`ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`)
are set, the orchestrator falls back to ROLE_TIER-based model defaults with canonical model
identifiers, and displays the resolved model name in every phase announcement line. The current
`"unknown"` cluster branch ignores ROLE_TIER entirely and shows `"inherited"` — causing
pipelines to stall before spawning subagents when users run Forge outside an Anthropic-managed
environment.

## Approach

Two sections in `meta-orchestrate.md` need surgical edits:

1. **Cluster Detection prose** (Dispatch Behavior table + Phase Announcements) — update to document
   the ROLE_TIER fallback for unknown clusters.

2. **Execution Algorithm `else` branch** — replace the current "unknown" branch (which uses
   `CLAUDE_CODE_SUBAGENT_MODEL` / `"inherited"`) with a ROLE_TIER lookup that resolves to
   canonical defaults:
   - `opus` tier → `claude-opus-4-5`
   - `sonnet` tier → `claude-sonnet-4-6`
   - `haiku` tier → `claude-haiku-4-5`

   The `dispatch_model` should also be set to the resolved full model identifier so the Agent
   tool spawns the correct model instead of inheriting the orchestrator's own model.

No other sections of the workflow are touched — phase structure, verdict detection, event
emission, and progress IPC all remain unchanged.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/meta/workflows/meta-orchestrate.md` | Update Dispatch Behavior table + Phase Announcements prose; update `else` branch in Execution Algorithm model resolution | Primary fix — source of truth for the generated orchestrator |

**Not touching:**
- `.forge/workflows/orchestrate_task.md` — this is a generated artifact; users regenerate it via `/forge:update`

## Plugin Impact Assessment

- **Version bump required?** No — addressed in T08 (this task's changes are bundled with T08's version bump)
- **Migration entry required?** No — handled by T08
- **Security scan required?** No — addressed in T08
- **Schema change?** No — this is a meta-workflow (Markdown) edit only

## Testing Strategy

- No `.cjs` files are modified, so `node --check` is not applicable.
- Manual verification: read the updated `else` branch and confirm the ROLE_TIER lookup is present with the three canonical defaults.
- The generated `.forge/workflows/orchestrate_task.md` will be updated by users after T08 ships — do not edit it directly.

## Acceptance Criteria

- [x] When no cluster env vars are set, the `else` branch in the Execution Algorithm resolves
      each phase model via `ROLE_TIER` with canonical fallback defaults:
      - `opus` tier → `claude-opus-4-5`
      - `sonnet` tier → `claude-sonnet-4-6`
      - `haiku` tier → `claude-haiku-4-5`
- [x] `display_model` in the `else` branch shows `"{tier} → {canonical_model}"` format
- [x] `dispatch_model` in the `else` branch is set to the canonical model string (not `None`)
- [x] The Dispatch Behavior table in the Model Resolution section documents the unknown-cluster
      fallback behaviour
- [x] No phase structure, verdict detection, or event emission logic is altered
- [x] Fix is confined to `forge/meta/workflows/meta-orchestrate.md` only

## Operational Impact

- **Distribution:** Users must run `/forge:update` (workflows target) after T08 ships to receive
  the fixed orchestrator at `.forge/workflows/orchestrate_task.md`
- **Backwards compatibility:** Fully backwards-compatible — existing tiered and single-cluster
  setups are unaffected; only the previously-broken `else` (unknown cluster) branch is changed
