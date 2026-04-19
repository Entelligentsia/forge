# PLAN REVIEW — FORGE-S06-T03: Add personas to forge:regenerate defaults

🌿 *Forge Supervisor*

**Task:** FORGE-S06-T03

---

**Verdict:** Approved

---

## Review Summary

The plan correctly identifies the single file requiring modification (`forge/commands/regenerate.md`) and the three precise locations needing changes: the Arguments section (add colon-form examples for per-persona regeneration), the Personas category section (add sub-target handling), and the Default section (add `personas` to the default run). The plan is well-scoped and does not over-engineer.

## Feasibility

The approach is realistic. The current `regenerate.md` already has the `personas` category section fully implemented — the only missing pieces are: (1) colon-form sub-target examples in the Arguments section, (2) per-persona sub-target handling within the Personas category, and (3) the Default section line. These are Markdown-only changes. No JS is touched.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — the plan explicitly requires a version bump because the default behavior changes.
- **Migration entry targets correct?** Yes — plan specifies `personas` must appear in the `regenerate` list so existing users get personas on `/forge:update`.
- **Security scan requirement acknowledged?** Yes — plan explicitly calls for a security scan since `forge/` is modified.

## Security

The modification is to a Markdown command file only — no hook scripts, no `require()` calls, no credential access patterns. The change adds sub-target handling text and modifies a one-line default description. Prompt injection risk is minimal given the nature of the change (no new user-supplied path interpolation or shell execution). The security scan will confirm.

## Architecture Alignment

- The approach mirrors the existing `workflows` sub-target pattern (single-file vs full-directory toggle), which is the correct pattern to follow.
- No schema changes, no new tools, no new dependencies.
- Colon-form support is consistent with how `workflows:plan_task` and `knowledge-base:architecture` work.

## Testing Strategy

The testing strategy is adequate for a Markdown-only change:
- `node forge/tools/validate-store.cjs --dry-run` confirms no store regressions
- Manual smoke test covers all three arg forms: no-arg default, `personas`, and `personas engineer`

---

## Advisory Notes

- When implementing the per-persona sub-target section, ensure it mirrors the `workflows` sub-target pattern exactly: colon-parse first, then space-positional fallback, then single-file vs full-directory branching.
- The Arguments section currently shows `personas` without a colon-form example. Add `personas:engineer` alongside `/forge:regenerate personas engineer` for consistency with the other colon-form examples.
