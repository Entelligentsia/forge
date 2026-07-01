<!-- kb-doc-fragment: entity-model -->
# Substance — `architecture/entity-model`

**Output path:** `{kbFolder}/architecture/entity-model.md`

**Topic focus:** the *technical* inventory of what is stored — every entity with
its full field list, types, and structural relationships as they exist in code.
This is the exhaustive structural catalogue; `domain-model` is its conceptual,
business-facing counterpart.

**Discovery input to read:** the `database` domain findings from Phase 1 (models,
schema definitions, type declarations).

**Required output:**
- Confidence header on line 1.
- One section per entity with the complete field inventory (name, type, nullability).
- Structural relationships (FK, embedding, references).
- Entity names used exactly as they appear in the brief's `## Domain Entities`.
- Technical inventory only — no business invariants (those live in `domain-model`).

**Not applicable:** if nothing is stored, write: `No entities — this project
persists no structured data.` and set confidence low.
