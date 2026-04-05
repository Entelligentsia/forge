# PLAN REVIEW — FORGE-S01-T06: Retrospective meta-workflow — cost analysis and baselines

**Reviewer:** Supervisor
**Task:** FORGE-S01-T06

---

**Verdict:** Approved

---

## Review Summary

The plan is well-structured and correctly scoped. It extends the retrospective
meta-workflow with cost analysis (aggregation, reporting, baseline tracking) by
modifying only Markdown artifacts — no JS/CJS tools or schemas are touched. The
approach follows the established meta-workflow -> generated workflow pattern and
all acceptance criteria from the task prompt are addressed.

## Feasibility

The approach is realistic. The single `forge/` artifact being modified
(`forge/meta/workflows/meta-retrospective.md`) is the correct source of truth
for the retrospective workflow. The downstream regeneration targets (generated
workflow and template) are correctly identified. The scope is appropriate for an
M-estimate task — it is primarily instructional Markdown authoring with a clear
data model for the baselines JSON file.

The plan correctly identifies that `COST_REPORT.md` (produced by T05) can be
read as a pre-computed view, avoiding redundant recomputation in Step 2.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — deferred to T08 as specified in the task prompt.
- **Migration entry targets correct?** Yes — `regenerate: ["workflows"]` is the correct target since the meta-workflow changes.
- **Security scan requirement acknowledged?** Yes — bundled with T08.

## Security

No new security risks. The changes are entirely Markdown instructions for an LLM
agent operating within the existing sprint retrospective workflow. The new step
reads from the project's own `.forge/store/` and writes a JSON file to the same
location. No external data sources, no new hook scripts, no prompt injection
vectors introduced.

## Architecture Alignment

- Follows the established meta-workflow -> generated workflow pattern exactly.
- No schema changes. `COST_BASELINES.json` is correctly treated as a
  project-internal artifact (not a validated schema record).
- Reads paths from standard store conventions (`.forge/store/events/`,
  `.forge/store/tasks/`), consistent with other workflows.
- No npm dependencies. No new CJS tools.

## Testing Strategy

Testing strategy is adequate for this change type:

- `node --check` is N/A (no JS/CJS files modified) — correctly stated.
- `validate-store.cjs --dry-run` included as a regression guard — good practice
  even though no schemas are touched.
- Manual review checklist is thorough and covers all acceptance criteria.
- Generated workflow review is explicitly planned.

---

## If Approved

### Advisory Notes

1. When implementing Step 5.5 instructions in the meta-workflow, be explicit
   about the directory iteration pattern: the agent must list subdirectories of
   `.forge/store/events/` and then read events from each. A vague "read all
   events" instruction may lead to the agent missing the subdirectory structure.

2. Consider adding a note in the meta-workflow that `COST_BASELINES.json` should
   not be committed to version control if the project treats `.forge/store/` as
   gitignored — this is context-dependent but worth a defensive comment.

3. The baseline comparison in Step 2 uses a ">2x baseline" threshold for
   flagging expensive tasks. This is reasonable for an initial implementation but
   could be made configurable in a future iteration.
