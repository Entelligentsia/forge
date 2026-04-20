# Forge — Init Context

## Commands
{SYNTAX_CHECK} = [object Object]
{TEST_COMMAND}  = node forge/tools/validate-store.cjs --dry-run
{BUILD_COMMAND} = 
{LINT_COMMAND}  = node --check forge/tools/collate.cjs forge/tools/validate-store.cjs forge/tools/seed-store.cjs forge/tools/manage-config.cjs forge/tools/estimate-usage.cjs forge/hooks/check-update.js forge/hooks/triage-error.js forge/hooks/list-skills.js

## Paths
commands     = .claude/commands
customCommands = engineering/commands
engineering  = engineering
forgeRoot    = /home/boni/.claude/plugins/cache/forge/forge/0.21.0
store        = .forge/store
templates    = .forge/templates
workflows    = .forge/workflows

## Personas
architect | .forge/personas/architect.md | · | Run this command using the Bash tool as your first action (before any file reads or other tool use):
bug-fixer | .forge/personas/bug-fixer.md | · | Run this command using the Bash tool as your first action (before any file reads or other tool use):
collator | .forge/personas/collator.md | · | Run this command using the Bash tool as your first action (before any file reads or other tool use):
engineer | .forge/personas/engineer.md | · | Run this command using the Bash tool as your first action (before any file reads or other tool use):
product-manager | .forge/personas/product-manager.md | 🌸 | 🌸 **Forge Product Manager** — I capture what we're building and why. I do not move forward until requirements are clear.
qa-engineer | .forge/personas/qa-engineer.md | 🍵 | 🍵 **Forge QA Engineer** — I validate against what was promised. The code compiling is not enough.
supervisor | .forge/personas/supervisor.md | · | Run this command using the Bash tool as your first action (before any file reads or other tool use):

## Templates
CODE_REVIEW_TEMPLATE, CUSTOM_COMMAND_TEMPLATE, PLAN_REVIEW_TEMPLATE, PLAN_TEMPLATE, PROGRESS_TEMPLATE, RETROSPECTIVE_TEMPLATE, SPRINT_MANIFEST_TEMPLATE, SPRINT_REQUIREMENTS_TEMPLATE, TASK_PROMPT_TEMPLATE

## Architecture Docs
INDEX.md, database.md, deployment.md, processes.md, routing.md, stack.md

## Domain Entities


## Installed Skill Wiring
agent-sdk-dev → engineer
frontend-design → engineer, supervisor
