# PLAN — FORGE-S02-T08: forge:health — per-feature FEAT-ID test coverage reporting

🌱 *Forge Engineer*

**Task:** FORGE-S02-T08
**Sprint:** FORGE-S02
**Estimate:** M

---

## Objective

Extend the `/forge:health` command to include a **Feature Test Coverage** check that scans the project for `FEAT-NNN` tagged tests and warns if an active feature has zero coverage. Additionally, implement an optional **Concepts Freshness** check that compares the modification dates of concept documentation against store schemas to warn about potentially stale conceptual docs.

## Approach

The task involves modifying the instruction set within the `/forge:health` command. Since this command is driven by instructions handed to the LLM agent, the implementation requires adding detailed, step-by-step guidance on how the agent should extract active features, perform string/grep operations across test directories in a language-agnostic manner, and aggregate the findings. Three acceptable tag forms (filename, block label, and docblock comment) will be explicitly documented. The concepts freshness check will be included as an additional, simple mtime check step.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/commands/health.md` | Add "Feature Test Coverage" table entry and process steps; Add "Concepts freshness" row and process step. | Fulfills Sprint S02-T08 requirements to improve developer experience around test metrics. |

## Plugin Impact Assessment

- **Version bump required?** No — Deferred to T10 release engineering.
- **Migration entry required?** No — No user config or structural changes.
- **Security scan required?** Yes — Deferred to T10, which handles all `forge/` mutations for S02.
- **Schema change?** No.

## Testing Strategy

- Syntax check: `node --check forge/commands/health.md` (even though it's markdown, this acts as a no-op safety pass).
- Store validation: `node forge/tools/validate-store.cjs --dry-run` (does not apply to `.md` but standard practice).
- Manual smoke test: Inspect the updated markdown source to ensure instructions are clear, sequentially logical, and that existing checks are unmodified.

## Acceptance Criteria

- [x] Feature Test Coverage check is added to the Checks table.
- [x] Execution step to read active features and scan tests is documented.
- [x] All three FEAT-NNN tag forms are specified.
- [x] Uncovered active features explicitly trigger a `⚠ FEAT-NNN has 0 tagged tests` warning.
- [x] Concepts freshness check is incorporated.
- [x] Existing checks in `health.md` remain intact.

## Operational Impact

- **Distribution:** Command update takes effect naturally upon next plugin reload/install.
- **Backwards compatibility:** Preserved completely.
