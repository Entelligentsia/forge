# PLAN REVIEW — FORGE-BUG-011: UX polish (tomoshibi prefix, progress IPC, ensure-ready banner)

🌿 *Forge Supervisor*

**Task:** FORGE-BUG-011

---

**Verdict:** Revision Required

---

## Review Summary

The plan's three-part decomposition is sound and correctly identifies root causes in `tomoshibi.md`, `store-cli.cjs::cmdProgress`, and `ensure-ready.cjs::_renderAnnouncement`. Implementation sketches look syntactically correct and the TDD order is specified. However, the plan ships with a wrong migration `regenerate` target, an incomplete gh#51 fix that still leaves uppercase prefix output in the `{old}`/`{new}` impact table example, and several loose ends in the proposed test assertions that will make it hard to know when the new contract has actually been satisfied. These are blocking.

## Feasibility

All three files identified are correct. The fixes are in the right layer (plugin source, not `.forge/`). `banners.cjs` exports `BANNERS` (line 485) and each entry has an `emoji` field — so `banners.BANNERS[bannerKey].emoji` is a valid access pattern. The `progress-entry.schema.json` `bannerKey` pattern enforces lowercase (`^[a-z0-9][a-z0-9_.:-]{0,127}$`), so the direct lookup without re-lowercasing is safe in practice, matching banners.cjs's own `_get()` which lowercases before index. The scope (one agent, two small CJS functions) fits a single bug-fix task comfortably.

One feasibility note on gh#51: Setup-block `PREFIX_LOWER` only helps at *reading* time. The impact-table row under **Config change** (line 67) still uses the literal tokens `{old}` and `{new}`, which are natural-language placeholders, not shell interpolations. The plan says to "update the example to show the lowercase form" but does not prescribe the replacement text precisely, nor does it specify how Tomoshibi should render a concrete before/after path when acting on a live change (it must lowercase both the current and proposed values before showing the table). Re-verify that Tomoshibi's `Config change` protocol step 3 renders `.claude/commands/{currentLower}/ → .claude/commands/{newLower}/` — the plan's current wording doesn't clearly tie this together.

## Plugin Impact Assessment

- **Version bump declared correctly?** No — bump target is fine, but the **baseline is wrong in the migration entry**. See below.
- **Migration entry targets correct?** **No.**
- **Security scan requirement acknowledged?** Yes — `/security-watchdog:scan-plugin forge:forge --source-path forge/` with report at `docs/security/scan-v0.19.0.md` and README/index updates.

### Wrong migration baseline

`forge/.claude-plugin/plugin.json` currently reads `"version": "0.18.1"` and the most recent migrations.json entry key is `"0.18.0"` (migrating TO `0.18.1`). So the next migration entry key — which is `from` implicitly — MUST be `"0.18.1"`. The plan's `"from": "0.18.1"` is correct; the review-prompt's assertion that current version is `0.18.0` is itself mistaken. **However** the plan still needs to be explicit: add a keyed top-level entry `"0.18.1": { "version": "0.19.0", ... }` (following the existing migrations.json shape where the outer key is the `from` version). The plan shows the inner object only, not the keyed form — call this out so the implementer does not invent an object shape that breaks `forge:update`'s migration chain parser.

### Wrong `regenerate` target — BLOCKING

`"regenerate": ["agents"]` is **not a valid category** for `/forge:regenerate`. The categories actually accepted by `forge/commands/regenerate.md` (lines 105–123) are exactly: `personas`, `skills`, `workflows`, `commands`, `templates`, `knowledge-base`. There is no `agents` target. Moreover, `forge/agents/tomoshibi.md` is a **plugin-shipped agent**, referenced by `$FORGE_ROOT/agents/tomoshibi.md` in `commands/ask.md:32`, and has no generated mirror under `.forge/agents/` (directory does not exist). When users run `/forge:update`, the plugin copy is replaced in-place — they get the tomoshibi fix automatically with zero regeneration.

**Required change:** `"regenerate": []`, with a rationale note that tomoshibi is plugin-shipped and ships with the plugin update itself. Delete the "users have a copy at .forge/agents/tomoshibi.md" claim from the rationale — that path does not exist.

## Security

No new attack surface. Progress-stdout output is already schema-constrained via `progress-entry.schema.json` (agentName/bannerKey regex, detail maxLength:500). The `require('./banners.cjs')` inside `cmdProgress()` is a local built-in-module-shape relative require — **no new npm deps**, passes the no-npm rule. The single-line ensure-ready render strips no sanitisation that the multi-line version had — same inputs, new shape. Prompt-injection risk in `tomoshibi.md` is unchanged; the PREFIX_LOWER addition reads from `.forge/config.json` (trusted) through `node -e`, not from user chat input.

## Architecture Alignment

- Built-ins only: Yes — the `require('./banners.cjs')` is an intra-tools relative import, not npm.
- `additionalProperties: false`: No schema changes proposed, so invariant preserved by omission.
- Hook-exit discipline: N/A (no hook changes).
- Paths from `.forge/config.json`: `cmdProgress` uses hardcoded `path.join('.forge', 'store', 'events', sprintOrBugId)` on line 743 — this is pre-existing and not changed by the plan. Not a blocker, but worth flagging as an unrelated latent issue (BUG-candidate for a future task, not in scope here).
- The `BANNERS[bannerKey]` direct-index access bypasses banners.cjs's `_get()` lowercase normalisation. This is safe today because the progress-entry schema already enforces lowercase on `bannerKey`, but it is a brittle coupling. **Advisory:** prefer `banners.mark(bannerKey)` with a try/catch fallback — that reuses the library's existing lookup behaviour and keeps the emoji-resolution semantics in one place.

## Testing Strategy

### TDD order — mostly correct, one loose point

The plan correctly requires two failing tests for gh#52 (stdout summary + unknown-key fallback) and four failing tests for gh#54 (single-line, ratios+pct, refresh message, --all promote hint) BEFORE the implementation. Good. It also correctly identifies the 6 existing `ensure-ready.test.cjs` tests at lines 275–338 that will need updating (verified: `returns multi-line framed block`, `top + bottom rules are zen-blue tinted`, `shows percentages and ratios`, `uses singular "artifact"`, `already-materialised closure`, `--all with 100% materialisation`).

### Loose / insufficient test assertions

1. **gh#52 stdout test** (plan lines 84–87): `assert.ok(r.stdout.includes('🌕') || r.stdout.includes('oracle'))` — the `|| 'oracle'` fallback makes this assertion *always pass for any bannerKey whose name happens to contain the literal string "oracle"*. Since the bannerKey is `oracle`, this test would pass even if the implementation never reads the emoji at all (it could just echo the bannerKey argument). **Required:** assert strictly on the resolved emoji `🌕` for the oracle banner; use a separate test for the unknown-key fallback path.
2. **gh#52 unknown-key test** only checks `[start]` appears — it should also assert that the bannerKey string itself (`unknown-key`) appears as the emoji substitute, per the plan's own fallback semantics.
3. **gh#54 single-line tests** don't assert the expected **prefix** (`🔥 Forge capability:`). Without that, the implementer could emit any single line and pass the contract. Add `assert.ok(out.includes('Forge capability'))` to at least one single-line test.
4. **gh#54 test for added=1 singular** — the existing test at line 312 (`uses singular "artifact" for added=1`) will need updating to the new contract. The plan's update table at lines 221–229 doesn't call out the singular/plural path explicitly. Add it to the table or spell it out as a separate retained assertion.

### Verification commands

`node --check` on both modified CJS files: Yes, present. Full test suite run before and after: Yes, present. No `validate-store --dry-run` needed — no schema changes. Good.

### Baseline test count claim

The plan asserts baseline is 241 tests (matches CLAUDE.md). If any tests have been added since that figure was recorded in CLAUDE.md, the assertion `"count may increase from 241"` still holds — acceptable.

---

## If Revision Required

### Required Changes

1. **Fix migration `regenerate` target** — change `"regenerate": ["agents"]` to `"regenerate": []`. Rationale update: tomoshibi is a plugin-shipped agent at `$FORGE_ROOT/agents/tomoshibi.md`; users receive the fix automatically on `/forge:update` with no regeneration. Delete the (wrong) claim about `.forge/agents/tomoshibi.md`.
2. **Show the keyed migration-entry shape**, not the inner object alone. The top-level key in `forge/migrations.json` must be `"0.18.1"` with inner `"version": "0.19.0"` — match the existing file's convention so `forge:update` can walk the chain.
3. **Tighten the gh#51 Tomoshibi fix spec**. Specify exactly what replaces the `{old}`/`{new}` tokens in the impact table, and explicitly require that at runtime (step 3 of the Config change protocol) Tomoshibi renders the concrete lowercased before/after command-folder paths derived from `PREFIX_LOWER` and the proposed new value — not the raw stored value.
4. **Strengthen the gh#52 stdout assertions.** Drop the `|| r.stdout.includes('oracle')` fallback in the success path — assert strictly on `🌕`. Extend the unknown-key test to assert that `unknown-key` itself appears as the emoji substitute.
5. **Strengthen gh#54 single-line assertions.** Add a positive assertion that the prefix `Forge capability` appears on the single line in at least one test. Add or retain a singular/plural `artifact` test under the new contract (update the test at line 312–319 rather than deleting it).
6. **Advisory upgraded to required:** replace `banners.BANNERS[bannerKey].emoji` with `banners.mark(bannerKey)` wrapped in try/catch. Same outcome, but reuses the library's existing lookup semantics and future-proofs against BANNERS-shape changes.

### Priority

Items 1 and 2 are version-release correctness — without them `/forge:update` produces the wrong migration chain or instructs users to run a non-existent regenerate target. Items 3–5 are TDD/correctness — without them the green tests don't actually prove the bug is fixed. Item 6 is a small hardening with negligible cost.

---

## If Approved

(Not applicable — revision required.)
