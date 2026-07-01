<!-- kb-doc-fragment: domain-concepts -->
# Substance — `business-domain/domain-concepts`

**Output path:** `{kbFolder}/business-domain/domain-concepts.md`

**Topic focus:** the ubiquitous language — the core domain concepts, terms, and
vocabulary the project uses, with precise definitions. Describe *the words the
team uses and what they mean*, so a newcomer can read the codebase's language.

**Discovery input to read:** all Phase-1 discovery findings, mined for recurring
domain vocabulary (names of entities, states, actions, roles). Lean on the
`database` and `routing` findings for the richest terminology.

**Required output:**
- Confidence header on line 1.
- A glossary: each core concept/term with a one-to-two-sentence definition.
- Note synonyms and any terms with a project-specific (non-obvious) meaning.
- Concepts only — no field types or route tables (those are other docs).

**Not applicable:** if no distinct domain vocabulary emerges, write: `No
specialized domain vocabulary — this project uses only general programming terms.`
and set confidence low.
