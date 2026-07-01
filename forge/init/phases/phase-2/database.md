<!-- kb-doc-fragment: database -->
# Substance — `architecture/database`

**Output path:** `{kbFolder}/architecture/database.md`

**Topic focus:** the persistence layer — storage engine(s), entities/tables,
their relationships, field types, indexes, and migration mechanism. Describe
*how data is stored at the technical level*.

**Discovery input to read:** the `database` domain findings from Phase 1 (schema
files, ORM models, migrations, connection config).

**Required output:**
- Confidence header on line 1.
- Storage engine(s) and connection/config location.
- Entities/tables with field types and key relationships.
- Migration mechanism and where migrations live.
- Technical field types — conceptual business meaning belongs to `domain-model`.

**Not applicable:** if the project has no persistence layer, write the explicit
stub: `No persistence layer — this project stores no data; it is stateless.` and
set confidence accordingly. Do not invent tables.
