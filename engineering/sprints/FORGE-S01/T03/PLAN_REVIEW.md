# PLAN REVIEW — FORGE-S01-T03: Orchestrator meta-workflow — subagent self-reporting and sidecar merge

**Reviewer:** Supervisor
**Task:** FORGE-S01-T03

---

**Verdict:** Approved

---

## Review Summary

The plan is well-structured, correctly scoped to a single Markdown meta-definition file, and faithfully addresses every acceptance criterion from the task prompt. The sidecar file pattern is consistent with the existing verdict-detection approach (read results from disk, not conversation context). The graceful fallback for missing sidecars ensures full backwards compatibility.

## Feasibility

The approach is realistic. The plan correctly identifies `forge/meta/workflows/meta-orchestrate.md` as the only file to modify. The changes are purely additive Markdown instructions -- no code logic, no schema changes, no new dependencies. The scope is appropriate for an M-sized task: four distinct additions to the meta-workflow (Token Self-Reporting section, updated Execution Algorithm, updated Event Emission table, Generation Instructions bullet), all within a single file.

The plan correctly notes that `eventId` must be computed by the orchestrator before spawning and passed to the subagent in the prompt, which is essential for the sidecar naming convention. The leading underscore convention for sidecar filenames is sound and consistent with how validate-store skips non-event files.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes -- the plan explicitly states the version bump is bundled with T08 at sprint end, which matches the sprint plan and the task prompt's "Operational Impact" section.
- **Migration entry targets correct?** Yes -- `regenerate: ["workflows"]` is correct since the meta-definition change will produce a different generated `orchestrate_task.md`. Bundled with T08.
- **Security scan requirement acknowledged?** Yes -- the plan states "Yes -- any change to `forge/` requires a scan. Bundled with T08 per the task prompt and sprint plan."

## Security

This task modifies only a Markdown meta-definition file. The changes are instructions for the orchestrator and subagents to run `/cost` and write/read a sidecar JSON file. No new hook scripts, no new CJS tools, no schema changes, no new command files. Prompt injection risk is negligible -- the new instructions are operational directives to Forge's own agents, not user-facing input surfaces. The sidecar file is ephemeral (written then immediately deleted after merge) and contains only numeric token counts, posing no data exfiltration risk.

The security scan is correctly deferred to T08 as part of the version bump.

## Architecture Alignment

- The sidecar pattern follows the established Forge convention of reading results from disk rather than conversation context (same as verdict detection for review phases).
- No npm dependencies introduced -- the plan only adds Markdown instructions.
- No schema changes -- the five token fields already exist from T01.
- Paths use the `.forge/store/events/{sprintId}/` pattern from config, consistent with existing event emission.
- The `additionalProperties: false` constraint is preserved (no schema modifications in this task).

## Testing Strategy

The plan correctly identifies that this is a Markdown-only change with no JS/CJS files to syntax-check. It includes `validate-store.cjs --dry-run` as a sanity check, and a detailed five-point manual smoke test covering all acceptance criteria. This is adequate for a Markdown meta-definition change.

---

## If Approved

### Advisory Notes

1. When implementing the subagent prompt extension, keep the sidecar write instruction concise -- the prompt is already moderately long and each additional instruction competes for attention in the subagent's context window. Consider using a single-line instruction rather than a multi-line block.

2. Ensure the `eventId` format passed to the subagent exactly matches the format specified in the Event Emission section (`{ISO_TIMESTAMP}_{TASK_ID}_{role}_{action}`) so the orchestrator can reliably locate the sidecar after the subagent returns.

3. When adding the Token Self-Reporting section, place it immediately after the Context Isolation section as the plan specifies -- this ordering is logical since self-reporting is a subagent responsibility explained right after the subagent isolation principle.
