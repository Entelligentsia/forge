# PLAN — FORGE-S11-T06: Create quiz-agent slash command file (#50)

🌱 *Forge Engineer*

**Task:** FORGE-S11-T06
**Sprint:** FORGE-S11
**Estimate:** S

---

## Objective

`forge/commands/quiz-agent.md` does not exist. Without it, the `quiz_agent.md`
workflow is unreachable via slash command — users cannot invoke `/forge:quiz-agent`
to run a knowledge-base verification quiz before starting high-stakes tasks.

This plan creates the missing command file following the standard Forge command
template: a YAML frontmatter block with `name` and `description`, a heading, a
FORGE_ROOT setup block, and a body that reads the quiz-agent workflow and follows
it. No JS/CJS files are touched; the change is a single new Markdown file.

## Approach

1. Study existing command files (`ask.md`, `calibrate.md`, `store-repair.md`)
   to confirm the template pattern.
2. Read `forge/meta/workflows/meta-quiz-agent.md` and `.forge/workflows/quiz_agent.md`
   to understand what the workflow does and what the command entry point should say.
3. Write `forge/commands/quiz-agent.md` with:
   - Frontmatter: `name: quiz-agent`, accurate description.
   - `FORGE_ROOT` setup block.
   - Brief purpose paragraph explaining what the quiz does.
   - `$ARGUMENTS` passthrough.
   - Invocation block reading `$FORGE_ROOT/...workflows/quiz_agent.md` and
     following it.
   - Standard on-error footer.
4. Syntax-check: no JS/CJS to check (`node --check` not applicable).
5. Run `node forge/tools/validate-store.cjs --dry-run` — no schema changes, so
   this is a sanity pass only.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/commands/quiz-agent.md` | **Create new** | Missing command file; slash command cannot be invoked without it |

## Plugin Impact Assessment

- **Version bump required?** Yes — adding a new command is a material change
  (new command = new user-visible capability). The version bump is handled by
  FORGE-S11-T08 (release engineering), which covers all S11 changes together.
  This task does NOT bump the version independently.
- **Migration entry required?** Yes — covered by FORGE-S11-T08.
  `regenerate: ["commands"]` so users' generated command lists are refreshed.
- **Security scan required?** Yes — any change to `forge/` requires a scan,
  covered by FORGE-S11-T08.
- **Schema change?** No.

## Testing Strategy

- No JS/CJS files touched — `node --check` is not applicable.
- `node forge/tools/validate-store.cjs --dry-run` — run as sanity pass; must
  exit 0 (no schema changes expected to affect this).
- Manual inspection: open `forge/commands/quiz-agent.md` and confirm:
  - Frontmatter parses correctly (name, description present).
  - FORGE_ROOT setup block is present.
  - Workflow invocation references `.forge/workflows/quiz_agent.md` via
    `$FORGE_ROOT`.
  - On-error footer is present.

## Acceptance Criteria

- [ ] `forge/commands/quiz-agent.md` exists with valid frontmatter (`name: quiz-agent`)
- [ ] Frontmatter `description` accurately describes the quiz-agent command
- [ ] File body includes `FORGE_ROOT` setup block and invokes the quiz_agent workflow
- [ ] On-error footer present ("`/forge:report-bug`" suggestion)
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0

## Operational Impact

- **Distribution:** Users who already have Forge installed will not get this command
  until they run `/forge:update` (and regenerate commands). FORGE-S11-T08 adds
  the migration entry with `regenerate: ["commands"]` to drive that automatically.
- **Backwards compatibility:** Fully backwards compatible. The command is additive.
  No existing command is modified.
