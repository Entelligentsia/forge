# Generation: Atomic Workflows

## Purpose

Generate project-specific workflow files from meta-workflows, incorporating
persona context, templates, and the knowledge base.

## Inputs

- `$FORGE_ROOT/meta/workflows/meta-*.md` (16 meta-workflows)
- Persona context (from Phase 3)
- Generated templates (from Phase 4)
- Discovery context (from Phase 1)
- Generated knowledge base (from Phase 2)

## Outputs

`.forge/workflows/` with 15 project-specific workflow files:
- `architect_sprint_intake.md`
- `architect_sprint_plan.md`
- `architect_approve.md`
- `architect_review_sprint_completion.md`
- `engineer_plan_task.md`
- `engineer_implement_plan.md`
- `engineer_update_plan.md`
- `engineer_update_implementation.md`
- `engineer_fix_bug.md`
- `engineer_commit_task.md`
- `supervisor_review_plan.md`
- `supervisor_review_implementation.md`
- `collator_agent.md`
- `sprint_retrospective.md`
- `quiz_agent.md`

## Instructions

For each meta-workflow:
1. Read its Algorithm and Generation Instructions
2. Embed the project-specific persona as the opening section
3. Replace all placeholders with concrete project values:
   - `{SYNTAX_CHECK}` → project's syntax checker
   - `{TEST_COMMAND}` → project's test runner
   - `{BUILD_COMMAND}` → project's build step
4. Reference architecture sub-docs by their actual names
5. Reference entities by their actual names
6. Reference templates by their actual paths in `.forge/templates/`
7. Include the Knowledge Writeback step in every workflow
8. Include the Event Emission step in every workflow

After writing each workflow file, record it in the generation manifest:
```sh
node {paths.tools}/generation-manifest.cjs record {paths.workflows}/{filename}.md
```

This must happen immediately after the file is written, before moving to the
next workflow. If `generation-manifest.cjs` is not yet installed, skip silently
and note that `/forge:update-tools` should be run to install it.

## Enforcement Quality

Generated workflows must resist rationalization. For any workflow with gate
checks or review steps, include:

**Iron Law framing** — critical gates use "YOU MUST" and "No exceptions" language,
not suggestions. Example: "YOU MUST run tests before proceeding. Skipping because
the change looks small is not allowed."

**Rationalization table** — for review workflows, include a table of common
agent excuses and factual rebuttals drawn from the project's domain. Format:

| Agent says | Reality |
|---|---|
| "It's a small change, tests aren't needed" | Small changes break things. Run the tests. |
| "The previous review approved the approach" | Each implementation is reviewed independently. |

**Announcement pattern** — require the agent to declare intent at the start of
any gate-heavy workflow: "I am running [workflow name] to [specific purpose]."
This commitment increases follow-through.
