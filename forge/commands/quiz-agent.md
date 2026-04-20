---
name: quiz-agent
description: Verify an agent has loaded and understood the project knowledge base — run a short factual quiz before starting high-stakes tasks
---

# /forge:quiz-agent

Verify that the active agent has correctly read and understood this project's
knowledge base before beginning a high-stakes task (schema changes, migrations,
release engineering, significant refactors).

## Locate plugin root

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

## Arguments

$ARGUMENTS

## How to Run

Read `.forge/workflows/quiz_agent.md` and follow it exactly.

Pass `$ARGUMENTS` to the workflow so the agent can include task context in its
responses if provided.

## On error

If `.forge/workflows/quiz_agent.md` does not exist, tell the user:

> △ The quiz_agent workflow is missing. Run `/forge:regenerate workflows` to
> regenerate it, then retry.

If any other step fails unexpectedly, describe what went wrong and ask:

> "This looks like a Forge bug. Would you like to file a report to help improve it? Run `/forge:report-bug` — I'll pre-fill the report from this conversation."
