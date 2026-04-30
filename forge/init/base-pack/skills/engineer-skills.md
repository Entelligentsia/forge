---
id: engineer-skills
name: Engineer Meta-Skills
description: Core capabilities and toolsets for the Engineer role.
role: Engineer
applies_to: [engineer]
summary: >
  Concrete capabilities the Engineer persona must use to execute a task:
  code analysis, implementation, testing, debugging, and CI/CD alignment.
capabilities:
  - Analyse codebases using Grep, Read, Glob
  - Implement features per approved plans and project conventions
  - Write unit, integration, and end-to-end tests
  - Perform root cause analysis and impact analysis
  - Align commits and branches with the project's git flow
---

# {{PROJECT_NAME}} Engineer Skills

## 🔍 Code Analysis

{{ENGINEER_SKILL_PROJECT_CONTEXT}}

- **Codebase Traversal**: Using Grep, Read, and Glob to understand code structure and patterns.
- **Root Cause Analysis**: Tracing bugs to their source through log analysis and code inspection.
- **Impact Analysis**: Determining the blast radius of a proposed change before implementing it.

## 🔨 Implementation

- **Plan-Following**: Implementing features per approved plans and project conventions.
- **Convention Adherence**: Following existing code patterns, naming conventions, and style rules.
- **Incremental Progress**: Making small changes that compile and pass tests.

## 🧪 Testing & Verification

- **Test Writing**: Creating unit, integration, and end-to-end tests for new features.
- **Verification**: Running `{{TEST_COMMAND}}` and `{{LINT_COMMAND}}` to verify changes.
- **Regression Detection**: Ensuring existing tests still pass after changes.

## 🔀 Version Control

- **Commit Discipline**: Aligning commits and branches with the project's {{BRANCHING_CONVENTION}}.
- **Incremental Commits**: Committing working code incrementally, never disabled tests.