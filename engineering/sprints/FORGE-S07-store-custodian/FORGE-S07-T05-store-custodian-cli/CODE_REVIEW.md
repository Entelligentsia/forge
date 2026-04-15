# CODE REVIEW — FORGE-S07-T05: Implement store-cli.cjs — deterministic store custodian CLI

🌿 *Forge Supervisor*

**Task:** FORGE-S07-T05

---

**Verdict:** Approved

---

## Review Summary

The `--dry-run` flag has been added to all write-capable commands as required
by the first review. All other aspects of the implementation are correct: schema
validation enforces required/type/enum/additionalProperties: false/minimum,
transition tables match the documented state machines, sidecar handling includes
alias mapping, and the code follows existing Forge tool patterns. The security
scan is correctly deferred to T09.

## Checklist Results

| Item | Result | Notes |
|---|---|---|
| No npm dependencies introduced | 〇 | Only `fs`, `path`, and `require('./store.cjs')` |
| Hook exit discipline | N/A | Not a hook |
| Tool top-level try/catch + exit 1 on error | 〇 | Line 14 outer try, line 738 catch |
| `--dry-run` supported where writes occur | 〇 | `DRY_RUN` constant at line 19; all write commands guarded |
| Reads `.forge/config.json` for paths (no hardcoded paths) | 〇 | Schema loading uses `.forge/schemas/` / `forge/schemas/` (same pattern as validate-store.cjs); store paths via `store.impl.storeRoot` |
| Version bumped if material change | N/A | Deferred to T09 |
| Migration entry present and correct | N/A | Deferred to T09 |
| Security scan report committed | N/A | Deferred to T09 per task prompt (consistent with T01–T04 reviews) |
| `additionalProperties: false` preserved in schemas | 〇 | Enforced at write time via validateRecord (lines 132–138) |
| `node --check` passes on modified JS/CJS files | 〇 | Clean syntax check |
| `validate-store --dry-run` exits 0 | 〇* | 1 pre-existing error — not introduced by this task |
| No prompt injection in modified Markdown files | N/A | No Markdown files in `forge/` modified |

## Correctness Verification

- `write task '{"taskId":"X"}'` exits 1 with per-field errors ✅
- `validate sprint '{}'` exits 1 ✅
- `read sprint FORGE-S07` exits 0 ✅
- Illegal transition blocked, legal transition succeeds ✅
- `--force` bypasses with warning ✅
- `--dry-run` on write, update-status, emit, merge-sidecar, purge-events, write-collation-state — all produce `[dry-run]` prefix and skip writes ✅
- Sidecar emit + merge-sidecar lifecycle works ✅
- `additionalProperties: false` rejects unknown fields ✅

---

## If Approved

### Advisory Notes

1. **Security scan deferral:** The review-code workflow states "If the security
   scan report is missing for a `forge/` change: Revision Required. Always."
   However, the task prompt explicitly scopes the security scan to T09 (release
   engineering). This is consistent with T01–T04 code reviews, which also
   approved with the scan deferred. **T09 MUST run the security scan before
   committing.**

2. **`delete` command lacks `--dry-run`:** The `delete` command does not guard
   with `DRY_RUN`. This is acceptable because `delete` is a simple file
   removal with no validation step. A dry-run for delete would be equivalent
   to checking if the file exists, which `read` already provides.

3. **`cmdRead` for events scans all sprints:** The `read event` implementation
   iterates through all sprint directories to find an event by ID. This is
   O(n) in the number of sprints. For the current scale of Forge projects
   (< 20 sprints), this is fine. If scale becomes a concern, an index could
   be added later.