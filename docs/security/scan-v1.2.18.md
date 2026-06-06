## Security Scan — forge:forge — 2026-06-06

**SHA**: pending (v1.2.18 release commit) | **Installed**: n/a (in-tree source scan) | **Last updated**: 2026-06-06
**Scope**: source — `forge/forge/` (plugin payload) | **Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary
394 files scanned | 0 critical | 0 warnings | 2 info

### Scan basis

v1.2.18 gives the event-type vocabulary a spec owner (forge-engineering#39).
Because the last filed scan report is v1.2.3, this scan ran the full-tree
pattern sweep across all 394 files (3.9 MB), plus a deep manual review of the
v1.2.18 delta:

- `schemas/event.schema.json` — enum: +`fix-revision-requested`,
  +`bug-commit-failed`, +`bug-skipped` (with its own `bugId`-only conditional),
  −`bug-fixed`. Data-only JSON schema change.
- `meta/workflows/_fragments/event-vocabulary.md` — NEW canonical phase→type
  token tables (prose spec; no executable content, no tool grants).
- `meta/workflows/meta-fix-bug.md`, `meta-orchestrate.md`,
  `_fragments/event-emission-schema.md`, `meta/store-schema/event.schema.md` —
  cross-reference prose edits only.
- `init/base-pack/workflows-js/wfl-fix-bug.js` — skip-emit payload corrected
  (`bug-skipped` token, adds `eventId`/`model:"n/a"`/`provider:"n/a"`, `reason`→
  `notes`). Same `store-cli.cjs emit` local invocation as before; no new
  capability, no network, no filesystem access in the driver body.
- `tools/build-manifest.cjs` — one FRAGMENT_MAP registry row.
- Tests (`event-schema-variants`, new `wfl-fix-bug-events`, `wfl-fix-bug`),
  `plugin.json`/`migrations.json`/`CHANGELOG.md`, regenerated
  `structure-manifest.json`/`enum-catalog.json`/`integrity.json`.

Full-tree sweep results (Checks A–D): no network calls outside the documented
update endpoint, no credential-path reads, no secret-bearing env reads, no
`eval`/decode-to-shell obfuscation, no shell-init writes or persistence
mechanisms, no prompt-injection phrases, no zero-width Unicode, no binaries or
compiled artifacts, no misleading extensions.

### Findings

#### [INFO] hooks/check-update.cjs:65 — version-check poll to official endpoint
- **Check**: A — hook network call
- **Issue**: `https.get(remoteUrl, { timeout: 2000 }, …)` polls the plugin's
  declared `updateUrl` (fallback `raw.githubusercontent.com/Entelligentsia/forge/main/...plugin.json`).
  This is the explicitly permitted version-check pattern; 2 s timeout, read-only.
- **Excerpt**: `https.get(remoteUrl, { timeout: 2000 }, (res) => {`
- **Recommendation**: Safe to ignore — documented update mechanism, unchanged
  since prior scans.

#### [INFO] commands/health.md:200 — embedded sha256 constant
- **Check**: B — base64/hex-like blob in markdown
- **Issue**: `EXPECTED="3ec3c970…cc3f"` is the pinned sha256 of
  `tools/verify-integrity.cjs` (anti-tamper self-check). Verified this scan:
  the live file hash still matches the pinned constant (verify-integrity.cjs
  unchanged in v1.2.18).
- **Excerpt**: `EXPECTED="3ec3c970dd3d7c3001f8f373bcc40556803eadd2fc2afafb14f1c232cba4cc3f"`
- **Recommendation**: Safe to ignore — integrity feature, not obfuscation.

### Clean Areas
- `hooks/` — 7 hooks + lib; only network use is the documented update poll above.
- `tools/` (58 scripts) + `tools/lib/` — no network, no credential paths, no
  eval; built-ins only (fs/path/os/https/crypto/child_process for local
  store-cli/git invocations).
- `meta/`, `commands/`, `skills/`, `personas/`, `init/base-pack/` — prose/
  template content; no injection phrases, no hidden instructions, no
  zero-width characters.
- `schemas/*.json` — deterministic data; integrity verified (29 hashed assets,
  all unmodified after `gen-integrity` regeneration).

### Verdict

**SAFE TO USE**

v1.2.18 is a schema/prose/test change set with one corrected emit payload in a
JS driver; the full-tree sweep found nothing beyond the two long-standing,
documented INFO items.
