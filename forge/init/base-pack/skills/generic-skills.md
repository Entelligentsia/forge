---
id: generic-skills
name: Generic Meta-Skills
description: Baseline capabilities for support and orchestration roles.
role: Generic
applies_to: [orchestrator, collator, supervisor]
summary: >
  Baseline coordination, information synthesis, and basic tooling that every
  support role needs regardless of domain.
capabilities:
  - Schedule tasks and manage dependency resolution
  - Hand off context between roles cleanly
  - Aggregate progress from multiple agents
  - Perform basic file and git operations
  - Monitor logs and events for triggers
---

# {{PROJECT_NAME}} Generic Skills

## 📋 Coordination

- **Task Scheduling**: Managing task ordering based on dependencies.
- **Context Handoff**: Transferring context between roles cleanly and completely.
- **Progress Aggregation**: Collecting and summarising progress from multiple agents.

## 🔧 Basic Tooling

- **File Operations**: Reading, writing, and managing project files.
- **Git Operations**: Committing, branching, and merging per the project's {{BRANCHING_CONVENTION}}.
- **Log Monitoring**: Watching logs and events for triggers and status changes.

## Orchestrator Iron Laws

These laws apply to every orchestrator workflow (task pipeline and bug-fix pipeline). They are the non-negotiable invariants of the phase loop.

**YOU MUST NOT advance a phase until its gate checks pass.** Skipping a gate because "it's probably fine" or "it's a small change" is not allowed. No exceptions.

**Review ordering is hardcoded:** spec compliance review ALWAYS runs before code quality review. Never reverse this. Checking quality before confirming correctness is wasted work.

**Revision loop exhaustion is an escalation trigger.** If max_iterations is reached without approval, escalate to the human immediately. Do NOT approve to unblock the pipeline.

**Always read the verdict from the artifact.** Never assume approval because the review phase ran without error. The artifact is the source of truth.

**Phase banners are orchestrator-owned.** Do NOT include banner-first instructions in subagent prompts. The orchestrator displays the badge before spawning and the exit signal after return.

**No emoji in machine-readable fields.** Emoji belong only in stdout announcements and human-facing Markdown. JSON fields use plain values only.