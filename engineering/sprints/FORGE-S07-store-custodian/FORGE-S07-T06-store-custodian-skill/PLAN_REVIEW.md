# PLAN REVIEW — FORGE-S07-T06: Create store custodian skill and tool spec

🌿 *Forge Supervisor*

**Task:** FORGE-S07-T06

---

**Verdict:** Approved

---

## Review Summary

The plan is correctly scoped for an S-sized task: two new Markdown files in
`forge/meta/`, no code changes. All acceptance criteria from the task prompt are
addressed. The plan correctly defers version bump, migration entry, and security
scan to T09. The tool-spec naming deviation from the task prompt (`store-cli.spec.md`
vs. `store-cli.md`) is well-justified by the existing convention.

## Feasibility

The approach is realistic. Both files are pure Markdown. The skill file pattern
is new (cross-cutting rather than role-specific) but the plan acknowledges this
upfront. No code changes means low risk and fast implementation.

## Plugin Impact Assessment

- **Version bump declared correctly?** Yes — correctly identified as material
  (new meta-definitions alter what gets generated), correctly deferred to T09.
- **Migration entry targets correct?** Yes — deferred to T09; the plan
  specifies that T09's migration entry should include `skills` and `tools` in
  the `regenerate` list.
- **Security scan requirement acknowledged?** Yes — deferred to T09.

## Security

New Markdown files in `forge/meta/skills/` and `forge/meta/tool-specs/` contain
instructions for the LLM. The skill file instructs the LLM to use a deterministic
CLI tool rather than writing files directly — this is a security improvement
over the current direct-write pattern. The skill file must still be reviewed for
prompt-injection patterns during implementation (e.g., ensure no instruction
allows user-controlled input to inject arbitrary commands into the `node` call).

## Architecture Alignment

- The approach follows established meta-definition patterns.
- The tool-spec naming uses `.spec.md` to match the convention of all five
  existing specs — this is correct even though the task prompt says
  `store-cli.md`.
- FORGE_ROOT resolution pattern matches `generate-tools.md`.
- No `additionalProperties: false` concern (no schema changes).
- No hook changes, no path hardcoding issues.

## Testing Strategy

No JS/CJS files are created, so `node --check` is correctly identified as N/A.
`validate-store --dry-run` is included as a safety check. Manual verification
criteria are specific and sufficient. The acceptance criteria in the plan map
one-to-one to the task prompt's requirements.

---

## If Approved

### Advisory Notes

1. **Skill generation path:** The current `generate-skills.md` process generates
   per-role skill files in `.forge/skills/`. The store custodian is a
   cross-cutting skill, not role-specific. During implementation, determine
   how this skill gets into `.forge/skills/`:
   - Option A: Include store-custodian instructions in each role's generated
     skill set (ensures all personas have access, slight duplication).
   - Option B: Generate a standalone `.forge/skills/store.md` that any persona
     can invoke (cleaner but requires the generation process to handle
     non-role skills).
   - Option C: The skill file is the meta-definition only; workflows reference
     it directly from `$FORGE_ROOT/meta/skills/meta-store-custodian.md` without
     copying to `.forge/skills/`.
   The plan should clarify which path will be used during implementation.

2. **Skill frontmatter:** All existing meta-skills have a `role` field. The
   store custodian skill will need to decide on a `role` value. Consider using
   `shared` or omitting the field, but this may require the generation process
   to handle it. This is an implementation detail, not a plan blocker.

3. **Invocation patterns table:** The requirements R5 includes an explicit
   invocation patterns table (Intent | Skill invocation). Include this table
   verbatim in the skill file so workflows can reference it directly.

4. **Prompt injection guard:** When writing the skill file, ensure the
   FORGE_ROOT resolution command is presented as a literal string template,
   not as something the LLM would interpolate from user input. The JSON payload
   for `write` and `emit` commands comes from the LLM's own output, not from
   user-controlled input, so the injection surface is minimal — but worth
   noting in the implementation.