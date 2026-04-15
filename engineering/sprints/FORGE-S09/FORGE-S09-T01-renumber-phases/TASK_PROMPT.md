# FORGE-S09-T01: Renumber sdlc-init.md phases to sequential integers

**Sprint:** FORGE-S09
**Estimate:** M
**Pipeline:** default

---

## Objective

Eliminate fractional phase numbering (Phase 1.5, Phase 3b) in the init command and its
orchestration document, replacing them with sequential integers. This removes the class of
checkpoint bug seen in S08 T01/T02 where string-based phase identifiers caused lookup failures.

## Acceptance Criteria

1. All phases in `forge/init/sdlc-init.md` are integer-numbered (no 1.5, no 3b)
2. All phases in `forge/commands/init.md` are integer-numbered and match sdlc-init.md
3. Checkpoint/resume references in `init.md` use integer phase identifiers only
4. Progress banners use the new integer numbering
5. `/forge:init` still works end-to-end with the new numbering
6. `node --check` passes on all modified JS/CJS files

## Context

S08 retrospective identified fractional phase numbering as a recurring bug source. T01 and T02
in S08 both had findings related to Phase 1.5 and Phase 3b string-based checkpoint keys.
The sprint requirements carry this over as "Renumber sdlc-init.md phases [must-have]".

The current phase mapping (9 phases including fractional):
1 → 1.5 → 2 → 3 → 3b → 4 → 5 → 6 → 7 → 8 → 9

After renumbering (11 sequential phases):
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

## Plugin Artifacts Involved

- `forge/commands/init.md` — command entry point with pre-flight plan and resume detection
- `forge/init/sdlc-init.md` — orchestration document defining all 9→11 phases

## Operational Impact

- **Version bump:** required — changes to command and init files affect user-facing behavior
- **Regeneration:** users must run `/forge:update` to get updated init command
- **Security scan:** required — changes to `forge/` files