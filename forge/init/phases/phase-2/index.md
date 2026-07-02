<!-- kb-doc-fragment: index -->
# Substance — `index` step

**Output paths:** `{kbFolder}/architecture/INDEX.md`,
`{kbFolder}/business-domain/INDEX.md`, and `{kbFolder}/MASTER_INDEX.md`.

**Topic focus:** build the navigation indexes that link the KB docs already
written to disk. You run *after* all 10 leaf docs exist. Describe *how to
navigate the knowledge base*, linking only what is present.

**Discovery input to read:** the filesystem — list the docs actually written
under `architecture/` and `business-domain/`. Do NOT anticipate files that were
not produced.

**Required output:**
1. `architecture/INDEX.md` — list and link every architecture doc on disk.
2. `business-domain/INDEX.md` — list and link `domain-model.md` and
   `domain-concepts.md` if present.
3. `MASTER_INDEX.md` — link both INDEX files and include a `## Domain Entities`
   section listing discovered entities, one per line.
- Link **only** docs that exist on disk at write time (AC3).
- Confidence header on the first line of each written index.

**Not applicable:** never fully skipped — if a section has no docs, write the
index with an explicit `(none generated)` note rather than a broken link.
