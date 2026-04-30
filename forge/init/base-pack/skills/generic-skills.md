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