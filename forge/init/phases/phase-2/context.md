<!-- kb-doc-fragment: context -->
# Substance — `context` step

**Output path:** `.forge/project-context.json`

**Topic focus:** construct the machine-readable project context from discovered
facts. You run *after* the indexes are written. Describe *the project as
structured data*, mapping findings onto the schema fields.

**Discovery input to read:** the `x-placeholder` annotations in
`{bundleRoot}/schemas/project-context.schema.json` (the field guide) plus all KB
docs and Phase-1 findings for the values.

**Required output:**
- A valid `.forge/project-context.json` matching the schema.
- Required fields `project.name` and `project.prefix` must be non-empty strings.
- Every array field must be an array (never null or a bare string).
- Map only observed facts; mark uncertain values conservatively rather than
  inventing them.

**Not applicable:** never skipped — `project-context.json` is mandatory. A
missing or empty `project.name` is a hard Phase-2 validation failure:
`× Phase 2 validation failed: project.name is missing or empty.`
