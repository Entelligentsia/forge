# Architect Approval — FORGE-BUG-009

🗻 *Forge Architect*

**Status:** Approved

---

## Distribution Notes

**Version bump:** 0.9.7 → 0.9.8
**Migration entry:** `"0.9.7"` → `version: "0.9.8"`, `regenerate: []`, `breaking: false`, `manual: []`

The migration is correctly marked non-breaking with no required regeneration. The new tools
(`check-structure.cjs`, `build-manifest.cjs`) and the `clear-namespace` extension are additive.
Existing installed projects continue to function without any user action on `/forge:update`.

**Security scan:** `docs/security/scan-v0.9.8.md` — 111 files, 0 critical, 1 warning (accepted,
pre-existing PostToolUse hook). New tools are filesystem-local only: no network calls, no credential
reads, no eval. Verdict: SAFE TO USE.

**User-facing impact:** Users who run `/forge:update` after upgrading to 0.9.8 will see a
post-migration structure check that validates all 57 expected generated files are present. Any gaps
produce a non-blocking warning with a suggested `/forge:regenerate` command. No breaking changes;
no manual steps required.

---

## Operational Notes

**New installed artifacts:**
- `forge/tools/build-manifest.cjs` — plugin-dev tool (invoked manually per CLAUDE.md item 4, not by user CLI)
- `forge/tools/check-structure.cjs` — invoked by `forge:health` (Step 7) and `forge:update` (post-migration)
- `forge/schemas/structure-manifest.json` — static data file, 57 expected generated files across 6 namespaces

**Regeneration requirements for users:** None. `regenerate: []` is correct.

**Manual steps for users:** None. `manual: []` is correct.

**Dogfooding cleanup:** 14 stale role-based entries removed from `.forge/generation-manifest.json`.
This is a one-time dogfooding fix; it does not affect user projects (users never had role-based
entries unless they are on the main branch with this same history).

**Note on meta/ carry-forward:** `forge/meta/personas/meta-*.md` (6 files) and
`forge/meta/workflows/meta-fix-bug.md`, `forge/meta/workflows/meta-orchestrate.md` have uncommitted
changes from 0.9.9 banner work. These are intentionally out of scope for the FORGE-BUG-009 commit
and must be committed separately as part of the 0.9.9 banner library work. The code reviewer has
explicitly flagged this; the commit scope in `CODE_REVIEW.md` lists these files under "Do NOT stage."

---

## Follow-Up Items

1. **`build-manifest.cjs` has no `--check` mode** (surfaced by code reviewer as advisory note 1).
   A future `--check` flag that prints expected output without writing would enable CI invariant
   verification. Low priority; tool is invoked only during plugin development.

2. **`check-structure.cjs` undifferentiated config warning** (advisory note 3): L60 and L63 emit
   the same "config.json not found or unreadable" message for both "file absent" and "JSON parse
   error" cases. Minor UX nit; not a correctness issue. Consider improving in a future pass.

3. **`clear-namespace` calls in `regenerate.md` are unguarded by `MANIFEST_TOOL` existence**
   (advisory note 4). Consistent with pre-existing pattern for `record` calls. Acceptable as-is;
   revisit when/if manifest-tool existence checks are standardised across the command.
