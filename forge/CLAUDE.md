# forge/forge — Plugin Source Notes

This directory is the installable Forge plugin source. See the parent
[`forge/CLAUDE.md`](../CLAUDE.md) for the full development guidelines,
versioning rules, and Iron Laws.

This file documents only the **CI gates** that protect this plugin source,
introduced by FORGE-S25-T28.

---

## CI Gates

Four gates run on every push/PR to `main` via
`.github/workflows/plugin-ci.yml` (`tests-and-skip-gate` job):

| Gate | Command | What it checks |
|------|---------|----------------|
| No-skip / no-only gate | `node forge/tools/check-no-skipped-tests.cjs` | No `it.skip`, `test.skip`, `describe.skip`, `it.only`, `describe.only`, `test.only`, `xit`, `xdescribe` in committed tests |
| Plugin test suite | `npm test` | All `forge/tools/__tests__/*.test.cjs` and `forge/hooks/__tests__/*.test.cjs` pass; schema `additionalProperties` gate runs inside `validate-write.test.cjs` |
| Manifest drift check | `node forge/tools/build-manifest.cjs --forge-root forge/ --check` | `structure-manifest.json` and `enum-catalog.json` / `transitions/*.json` match what `build-manifest.cjs` would generate; exits 1 if stale |
| Integrity verification | `node forge/tools/verify-integrity.cjs` | `integrity.json` matches the actual file hashes of bundled tool assets |

### Fixing drift failures locally

**Manifest drift:**
```bash
node forge/tools/build-manifest.cjs --forge-root forge/forge/
# commit updated forge/forge/schemas/structure-manifest.json and
#         forge/forge/schemas/enum-catalog.json + transitions/*.json
```

**Integrity drift:**
```bash
node forge/tools/build-integrity.cjs --forge-root forge/forge/
# commit updated forge/forge/integrity.json
```

**Skipped-test failure:** Remove or fix the skip/only marker — do not bypass
the gate. A documented Iron Law amendment is required if a skip must land.
