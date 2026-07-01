<!-- kb-doc-fragment: domain-model -->
# Substance — `business-domain/domain-model`

**Output path:** `{kbFolder}/business-domain/domain-model.md`

**Topic focus:** the *conceptual* business model — the real-world entities the
system represents, their relationships, and the business invariants/rules that
govern them. This is business meaning, distinct from `entity-model`'s technical
field inventory.

**Discovery input to read:** the `database` domain findings from Phase 1, read
through a business lens (what does each stored thing *mean* to the domain).

**Required output:**
- Confidence header on line 1.
- Business entities with their conceptual purpose (not field types).
- Relationships expressed in domain terms (e.g. "a Sprint owns many Tasks").
- Business invariants and rules (e.g. "a Task cannot be committed before approval").
- Entity names exactly as in the brief's `## Domain Entities`.

**Not applicable:** if the project has no discernible business domain (e.g. a
pure tool/utility), write: `No business domain — this is a technical utility with
no domain entities.` and set confidence low.
