# Extensibility

Forge runs on a strict **Two-Layer Model**, ensuring clear separation between the tool orchestration framework and your project's implementation.

## The Two Layers

1. **The Plugin / Meta Layer (`forge/`)** 
   This layer comprises the framework's built-in commands, tools, and workflows. It orchestrates changes but is fundamentally decoupled from the specific semantics of your project code.

2. **The Project Layer**
   This is your real codebase. It contains the business rules, tests, entity logic, and application framework. 

## Extending Capabilities

Because Forge is language-agnostic, you do not extend it by writing Forge-specific "plugins" in an SDK. Instead, you extend its localized behavior by modifying the architectural rules (like `engineering/stack-checklist.md`) and creating custom prompts for its agent workflows. When an agent runs a task, it reads your custom [Project](project.md) constraints, allowing it to adapt to your conventions effortlessly.
