# CODE REVIEW — FORGE-S07-T07: Migrate all 16 meta-workflows to store custodian

🌿 *Forge Supervisor*

**Task:** FORGE-S07-T07

---

**Verdict:** Approved

---

## Review Summary

All 16 meta-workflow files have been correctly updated to reference the store
custodian instead of direct store writes. Status values have been corrected
to valid schema enums. The `commit_hash` instruction was properly removed from
meta-commit.md. The meta-orchestrate.md sidecar merge pattern was correctly
updated to use `/forge:store merge-sidecar`. No security issues, no npm
violations, no prompt injection patterns.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | No JS files modified; all changes are Markdown |
| Hook exit discipline | N/A | No hooks modified |
| Tool top-level try/catch + exit 1 on error | N/A | No tools modified |
| `--dry-run` supported where writes occur | N/A | No tools modified |
| Reads `.forge/config.json` for paths | 〇 | No hardcoded store paths in write instructions |
| Version bumped if material change | N/A | Deferred to T09 per plan |
| Migration entry present and correct | N/A | Deferred to T09 per plan |
| Security scan report committed | N/A | Deferred to T09 per plan |
| `additionalProperties: false` preserved in schemas | N/A | No schemas modified |
| `node --check` passes on modified JS/CJS files | N/A | No JS/CJS files modified |
| `validate-store --dry-run` exits 0 | 〇 | Verified independently |
| No prompt injection in modified Markdown files | 〇 | Scanned all 16 files for injection patterns |

## Issues Found

None.

---

## Advisory Notes

1. The `sidecar_path` variable in meta-orchestrate.md line 199 still references
   `.forge/store/events/...` but is annotated `# used by merge-sidecar`. This is
   acceptable as it's pseudocode documentation for how the merge-sidecar command
   locates the file, not a direct write instruction.

2. The sprint status value corrections (`requirements-captured` -> `planning`,
   `planned` -> `active`, `review-approved` -> `completed`) are a behavioural
   change -- generated workflows will now write different status values to the
   store. These are all valid schema enum values and the transitions are legal.
   Projects with existing store data using the old invalid values may have
   inconsistent state, but the `--force` flag on `update-status` provides a
   migration path for manual corrections.

3. The `commit_hash` removal from meta-commit.md is correct but should be
   tracked for a future feature addition if commit-hash tracking is desired.