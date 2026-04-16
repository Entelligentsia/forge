# PLAN REVIEW — FORGE-S09-T04: Health — KB freshness check + config-completeness check

🌿 *Forge Supervisor*

**Task:** FORGE-S09-T04

---

**Verdict:** Approved

---

## Review Summary

The plan correctly identifies the two required checks (KB freshness and config-completeness), targets the right file (`forge/commands/health.md`), and correctly classifies the change as material (version bump + migration required). All six task acceptance criteria are addressed. The approach of using inline `node -e` commands rather than new JS/CJS tools is consistent with the calibration baseline pattern in `sdlc-init.md` Phase 5.

## Feasibility

The approach is realistic and correctly scoped for an M-size task. Only one command file needs Markdown edits, plus the standard version/migration/security triad. No new JS/CJS tools are required. The inline `node -e` approach follows established patterns.

Files to modify are correct:
- `forge/commands/health.md` — the single source of truth for health checks
- `forge/.claude-plugin/plugin.json` — version bump (0.9.10 → 0.9.11)
- `forge/migrations.json` — migration entry

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — command file changes alter user-visible behaviour.
- **Migration entry targets correct?** Yes — `regenerate: ["commands"]` is correct; the health command is a generated artifact that `/forge:update` regenerates.
- **Security scan requirement acknowledged?** Yes — any `forge/` change triggers a scan.

## Security

No new JS/CJS files are introduced. The Markdown command changes instruct a Claude agent to run `node -e` inline commands using only `crypto` and `fs` built-ins (consistent with the existing calibration baseline pattern in `sdlc-init.md`). No prompt injection risk — the command reads from known files (`.forge/config.json`, `engineering/MASTER_INDEX.md`) and does not execute user-supplied strings.

## Architecture Alignment

- Follows established patterns: Markdown command + inline `node -e` for deterministic hash computation.
- Reads paths from `.forge/config.json` rather than hardcoding.
- No schema changes, so `additionalProperties: false` preservation is not applicable.
- No new hooks or tools, so hook/tool discipline checks are not applicable.

## Testing Strategy

- Syntax check: N/A (no JS/CJS files modified) — correctly identified.
- Store validation: `node forge/tools/validate-store.cjs --dry-run` — correctly planned as a regression check.
- Manual smoke test: four concrete scenarios described (normal run, drift detection, missing fields, existing checks). Adequate for this change.

---

## Advisory Notes

1. **Config-completeness check integration with existing step 1.** The current health.md already has step 1 that checks for config existence ("If it does not exist, stop and tell the user to run `/forge:init`"). The new config-completeness check should extend this existing step (existence AND completeness), not be a separate step that could silently skip the existence check. During implementation, merge these into one guard step.

2. **Drift categorization mechanism.** The plan describes categorizing drift by parsing MASTER_INDEX.md sections, but does not explicitly state how the agent determines which sections changed since only a hash (not the full content) is stored in the baseline. During implementation, the command should instruct the agent: after a hash mismatch, read the current MASTER_INDEX.md content and categorize changes based on section headings (technical: architecture, routing, stack, database, deployment, processes, schemas; business: entity-model, domain, features, acceptance criteria). The hash tells you THAT drift exists; the agent's reading of the current content categorizes WHERE.

3. **"technical + business" category.** The plan adds a combined category not specified in the task prompt's acceptance criteria ("technical" or "business"). This is a reasonable extension but the task AC says "where category is 'technical' or 'business'" — ensure the implementation covers both single and combined drift, and that the AC wording in PLAN.md matches what validation will check.