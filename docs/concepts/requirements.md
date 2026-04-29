# Requirements

In Forge, **Requirements** do not exist as a standalone construct. They are integrated directly into the architectural hierarchy and testing framework.

## Where Requirements Live

1. **Strategic Intent:** Defined within the documentation for [Features](feature.md) and the ultimate Project vision.
2. **Business Constraints:** Documented in `engineering/business-domain/`.
3. **Execution Instructions:** Formalized in `TASK_PROMPT.md` for specific [Tasks](task.md).
4. **Verifiable Contracts:** Enforced via [Feature Testing](feature-testing.md). The tests are the ultimate source of truth for what a requirement implies structurally.

By distributing requirements across the structure, Forge guarantees that the orchestrating AI assistant has localized context instead of wrestling with a single, monolithic requirements document.
