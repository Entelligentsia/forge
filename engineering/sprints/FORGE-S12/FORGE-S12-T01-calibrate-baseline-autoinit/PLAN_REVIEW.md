# PLAN REVIEW — FORGE-S12-T01: Calibrate baseline auto-initialization — remove dead end

*Forge Supervisor*

**Task:** FORGE-S12-T01

---

**Verdict:** Approved

---

## Review Summary

The plan correctly identifies the dead-end in `/forge:calibrate` Step 2 and proposes replacing it with auto-initialization that mirrors the existing init Phase 5 algorithm. The scope is minimal (single file change to `calibrate.md`) and the approach reuses existing, proven code patterns. No new executable code is introduced — only Markdown instructions for Claude to follow.

## Feasibility

The approach is realistic and correctly scoped. The baseline computation algorithm already exists in two places (init Phase 5/6-b and calibrate Step 8), so the auto-initialization in Step 2 reuses a well-tested pattern. The only file modified is `forge/commands/calibrate.md`, with a minor follow-on change to `forge/commands/health.md` to update the recommendation text.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — material change to distributed command behavior requires version bump.
- **Migration entry targets correct?** Yes — `regenerate: ["commands"]` is correct; users need the updated calibrate command.
- **Security scan requirement acknowledged?** Yes — `forge/` is modified.

## Security

No security risks. The change is Markdown-only (no hooks, no tools, no executable code). The auto-initialization algorithm uses the same `node -e` one-liners that already exist in init Phase 5. No new trust boundaries are introduced.

## Architecture Alignment

- The approach follows established patterns: baseline computation uses the same hash + sprint-ID listing algorithm as init.
- No schema changes — `calibrationBaseline` schema already exists.
- `additionalProperties: false` is preserved (no schema changes at all).

## Testing Strategy

Adequate. The plan specifies:
- `node --check` on modified files (N/A — all changes are Markdown)
- `validate-store --dry-run` to confirm no regressions
- Full test suite: `node --test forge/tools/__tests__/*.test.cjs`
- Manual smoke test for both missing and existing baseline scenarios

---

## If Approved

### Advisory Notes

- The `health.md` change (recommending `/forge:calibrate` instead of `/forge:init` for missing baseline) is a natural follow-on that should be included in the same commit.
- Ensure the Step 2 auto-init one-liners match the init Phase 5/6-b algorithm exactly to avoid behavioral divergence.