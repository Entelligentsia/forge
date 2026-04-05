# PLAN — FORGE-S01-T04: estimate-usage.cjs — token estimation fallback tool

**Task:** FORGE-S01-T04
**Sprint:** FORGE-S01
**Estimate:** M

---

## Objective

Create `forge/tools/estimate-usage.cjs`, a deterministic Node.js CLI tool that
back-fills token usage estimates on event records that lack self-reported token
data. The tool uses `durationMinutes` and `model` heuristics to compute
`inputTokens`, `outputTokens`, and `estimatedCostUSD`, writing the results back
to the event JSON files without overwriting records that already carry
self-reported data.

## Approach

Follow the patterns established by `collate.cjs` and `validate-store.cjs`:

1. **Read config** — load `.forge/config.json` to resolve `paths.store`.
2. **Argument parsing** — `process.argv`-based, two mutually exclusive modes:
   - `--event <path>` — process a single event file given as a relative or
     absolute path.
   - `--sprint <SPRINT_ID>` — scan `.forge/store/events/<SPRINT_ID>/` and
     process every non-sidecar JSON file in that directory.
3. **Skip guard** — if the event already has `inputTokens` defined (not
   `undefined`), skip it and count it as "already populated".
4. **Heuristic estimation** — look up the event's `model` field in a documented
   constant table (`TOKENS_PER_MINUTE`) to get an estimated throughput rate.
   Multiply by `durationMinutes` to get total tokens. Split via a
   phase-sensitive ratio table (`PHASE_SPLIT`) keyed on `phase`: implementation
   phases (e.g. `implement`) use 70 % input / 30 % output; review/plan phases
   use 50 % / 50 %. Fall back to 60/40 for unknown phases. Also look up
   `PRICE_PER_1M` to derive `estimatedCostUSD` from the token counts.
5. **Write back** — update the event file in place (atomic write via a `.tmp`
   file + `fs.renameSync`) adding `inputTokens`, `outputTokens`, and
   `estimatedCostUSD` fields. Do not touch any other fields.
6. **Dry-run** — `--dry-run` flag logs what would be written without modifying
   files.
7. **Summary** — print `N events updated, M skipped (already populated)` then
   exit 0. Exit 1 on hard errors (missing config, unreadable files).

### Heuristic Tables (initial values — documented in source)

**`TOKENS_PER_MINUTE`** — estimated total tokens processed per minute by model:

| Model key pattern | tokens/min |
|---|---|
| `claude-opus-4` | 3000 |
| `claude-sonnet-4` | 4500 |
| `claude-haiku-4` | 8000 |
| `claude-opus-3-7` | 3000 |
| `claude-sonnet-3-7` | 4500 |
| `claude-sonnet-3-5` | 5000 |
| `claude-haiku-3-5` | 8000 |
| `(default)` | 4000 |

Model matching is substring-based (longest match wins), so
`claude-sonnet-4-5` matches `claude-sonnet-4`.

**`PRICE_PER_1M`** — USD cost per 1 M tokens (input price, same for output as
a simplification until real pricing is confirmed; annotated in source):

| Model key pattern | USD/1M |
|---|---|
| `claude-opus-4` | 15.00 |
| `claude-sonnet-4` | 3.00 |
| `claude-haiku-4` | 0.80 |
| `claude-opus-3-7` | 15.00 |
| `claude-sonnet-3-7` | 3.00 |
| `claude-sonnet-3-5` | 3.00 |
| `claude-haiku-3-5` | 0.80 |
| `(default)` | 3.00 |

**`PHASE_SPLIT`** — `{ input: <fraction>, output: <fraction> }` per phase:

| Phase | Input | Output |
|---|---|---|
| `plan` | 0.50 | 0.50 |
| `review` | 0.50 | 0.50 |
| `review-plan` | 0.50 | 0.50 |
| `review-code` | 0.50 | 0.50 |
| `approve` | 0.50 | 0.50 |
| `implement` | 0.70 | 0.30 |
| `commit` | 0.60 | 0.40 |
| `(default)` | 0.60 | 0.40 |

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/tools/estimate-usage.cjs` | **Create new** | Core deliverable — token estimation CLI tool |

No other files require modification. The event schema already includes
`inputTokens`, `outputTokens`, and `estimatedCostUSD` as optional fields
(added in T01). `validate-store.cjs` already handles them (T02).

## Plugin Impact Assessment

- **Version bump required?** Yes — bundled with T08 as per task prompt. A new
  executable CJS tool is added to the distributed plugin.
- **Migration entry required?** Yes (in T08) — `regenerate: ["tools"]` so users
  run `/forge:update-tools` to receive the new tool.
- **Security scan required?** Yes — any change to `forge/` requires a scan. This
  introduces new executable code in the plugin distribution.
- **Schema change?** No — schema fields were added in T01. This task only reads
  and writes those existing optional fields.

## Testing Strategy

- Syntax check: `node --check forge/tools/estimate-usage.cjs`
- Manual smoke test (single event): run against a real event file lacking
  `inputTokens` and verify the file is updated with plausible integers and a
  non-negative `estimatedCostUSD`.
- Manual smoke test (sprint batch): run `--sprint FORGE-S01` against the
  project's own store; verify the summary line reports updated vs. skipped
  counts correctly; verify already-populated events are not overwritten.
- Dry-run check: `--dry-run` produces log lines but leaves files unchanged.
- Store validation: `node forge/tools/validate-store.cjs --dry-run` must still
  pass after the tool writes new fields (since the schema allows them).

## Acceptance Criteria

- [ ] `forge/tools/estimate-usage.cjs` exists
- [ ] `node --check forge/tools/estimate-usage.cjs` exits 0
- [ ] `node forge/tools/estimate-usage.cjs --event <path>` updates one event file
- [ ] `node forge/tools/estimate-usage.cjs --sprint <SPRINT_ID>` updates all events in that sprint
- [ ] Events with `inputTokens` already set are skipped (not overwritten)
- [ ] Node.js built-ins only (`fs`, `path`) — no npm dependencies
- [ ] Source contains a documented heuristic table (model → tokens/min) as a `const`
- [ ] Outputs summary: `N events updated, M skipped (already populated)`
- [ ] Reads `.forge/config.json` for store path
- [ ] `--dry-run` flag supported — logs writes without modifying files
- [ ] Top-level `try/catch` with `process.exit(1)` wrapping all logic
- [ ] `node forge/tools/validate-store.cjs --dry-run` exits 0 after tool runs

## Operational Impact

- **Distribution:** Users must run `/forge:update-tools` after the T08 version
  bump to receive `estimate-usage.cjs` in their project's `engineering/tools/`
  copy. The tool is bundled at `forge/tools/estimate-usage.cjs` in the plugin.
- **Backwards compatibility:** Fully additive. Existing event records without
  token fields are unchanged unless the user explicitly invokes the tool. Events
  with self-reported token data are never overwritten.
