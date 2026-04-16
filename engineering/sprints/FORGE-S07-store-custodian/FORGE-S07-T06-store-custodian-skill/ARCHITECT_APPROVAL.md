# Architect Approval — FORGE-S07-T06

🗻 *Forge Architect*

**Status:** Approved

## Distribution Notes

- **Version bump:** Deferred to T09 (release engineering). The current version is
  0.8.10. T06 is a material change (new meta-definitions alter regeneration
  output) but the sprint bundles all version bumps into T09.
- **Migration entry:** Deferred to T09. The migration entry must include
  `skills` in `regenerate` targets so users receive the store custodian skill
  after running `/forge:regenerate skills`.
- **Security scan:** Deferred to T09. Required per policy for any `forge/`
  modification.
- **User-facing impact:** Users will need to run `/forge:regenerate skills` after
  T09's version bump to get the `/forge:store` skill in their project. No
  action needed before that.

## Operational Notes

- Two new files only: `forge/meta/skills/meta-store-custodian.md` and
  `forge/meta/tool-specs/store-cli.spec.md`. No existing files modified.
- The `role: Shared` frontmatter convention is new. Future cross-cutting skills
  can use the same pattern. This should be documented in
  `engineering/architecture/routing.md` if adopted broadly.
- The tool spec uses `.spec.md` suffix (matching existing convention) rather than
  the `.md` suffix stated in the task prompt. Correct deviation.

## Follow-Up Items

- T07 will migrate all 16 meta-workflows to reference `/forge:store` instead of
  direct writes. The skill file's invocation patterns table is ready for that.
- The skill generation path (how `meta-store-custodian.md` gets into
  `.forge/skills/store-custodian.md`) may need a minor update to
  `generate-skills.md` to handle `role: Shared` skills as standalone outputs.
- The `/forge:store` skill invocation currently has no corresponding command
  wrapper in `forge/commands/`. A command wrapper may be needed for the slash
  command to be invocable as `/forge:store` rather than through the Skill tool.