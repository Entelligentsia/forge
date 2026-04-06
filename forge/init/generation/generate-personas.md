# Generation: Personas

## Purpose

Generate project-specific agent persona context from meta-personas,
the discovery context, and the generated knowledge base.

## Inputs

- `$FORGE_ROOT/meta/personas/meta-*.md` (6 meta-personas)
- Discovery context (from Phase 1)
- Generated knowledge base (from Phase 2)

## Outputs

Persona context is NOT written as separate files. It is incorporated
into the generated workflows (Phase 5) as the opening section of each
workflow that establishes the agent's identity, knowledge, and constraints.

This phase produces an intermediate persona context document at
`.forge/personas-context.md` (add to `.gitignore`). Phase 5 reads this
file as its persona input. Phases 3 and 5 must share the same agent
context — do not spawn a separate agent between them.

## Instructions

For each meta-persona, read its Generation Instructions section and
produce a project-specific version that incorporates:
- The project's actual stack, test commands, build commands
- The project's actual entity names and business rules
- The project's actual auth patterns and conventions
- The project's actual directory structure and paths

**Persona block format** — each generated workflow opens with a single line using the
persona's symbol (from its `## Symbol` section) and a quiet first-person announcement.
Follow the `Persona block format` template in each meta-persona's Generation Instructions,
substituting `{Project}` with the project's name. The line should be brief, present-tense,
and speak to what the persona is about to do — not a role description, but a voice.

## Skill Invocation Wiring

Read `.forge/config.json` for `installedSkills`. For each installed skill
that is relevant to a persona's domain, add an explicit invocation instruction
to that persona's workflow steps.

Read `$FORGE_ROOT/meta/skill-recommendations.md` for the persona integration
pattern. Apply it: the instruction must be a YOU MUST directive placed at the
relevant workflow step (not buried in a notes section).

Example — if `vue-best-practices` is installed and the persona is Supervisor:

> "When reviewing Vue components, YOU MUST invoke the `vue-best-practices`
> skill before applying the stack checklist. That skill provides universal
> Vue technique depth; the checklist provides project conventions. Both are required."

This wiring is what distinguishes Forge-generated personas from plain skill
invocation: the persona carries project-specific knowledge *and* knows exactly
when to reach for a universal technique skill. Neither layer alone is sufficient.
