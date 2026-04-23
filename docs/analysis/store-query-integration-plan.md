# Store-Query Integration Plan

**Date:** 2026-04-23  
**Context:** store-query marketplace plugin (parallel experiment) → integrated into forge  
**Goal:** Merge query engine, skills, agents, hooks into forge; expose via existing `store-cli.cjs` gateway; add observability for quantifying performance gains

---

## 1. Background

`store-query` was built as a parallel plugin to experiment with deterministic NLP-based store querying. The LLM-based intent path (Ollama/Haiku) was dropped after benchmarking — small models hallucinate filter values and produce worse results than rule-based parsing. The rule-based NLP engine is working well in production.

Original design goal from `store-query-design.md`:

```
Current navigation:  5-6 tool calls / ~14k tokens per query
Target:              1-2 calls / ~5k tokens per query
```

The implementation achieves this. Integration into forge makes it available to all forge agents, commands, and workflows.

---

## 2. Architecture Decision: Two Files, One Gateway

**Problem:** forge's `store-cli.cjs` (write custodian, ~1090 lines) and store-query's `store-cli.cjs` (query engine, ~1068 lines) are both large. Merging them produces a 2000+ line unmaintainable monolith.

**Decision:** Keep them separate. Add a thin `query`/`nlp`/`schema` dispatch to forge's `store-cli.cjs` that delegates to a new `store-query.cjs`.

```
Agent/workflow invokes:
  node "$FORGE_ROOT/tools/store-cli.cjs" query [flags or intent]
  node "$FORGE_ROOT/tools/store-cli.cjs" nlp "<intent>"
  node "$FORGE_ROOT/tools/store-cli.cjs" schema

store-cli.cjs dispatch (3 new cases in switch):
  └── spawn: node "$FORGE_ROOT/tools/store-query.cjs" $ARGS
             ↑ full query engine lives here
```

**Why spawn, not require:**
- store-query.cjs has its own `StoreFacade` (reads `.forge/config.json` and flat JSON store) — no dependency on forge's `store.cjs` (which requires project-specific schema resolution)
- Keeps module boundaries clean; each file testable in isolation
- Consistent stdout/stderr/exit-code contract already works across process boundary

**Agent perspective:** zero change. The invocation path agents already know (`node "$FORGE_ROOT/tools/store-cli.cjs"`) continues to work. `query`, `nlp`, and `schema` appear as new commands in the help text.

---

## 3. store-query.cjs Decomposition

Current 1068-line monolith (`store-query/tools/store-cli.cjs`) splits into four modules:

| Module | Contents | Est. lines |
|--------|----------|-----------|
| `forge/tools/lib/store-facade.cjs` | `StoreFacade` class, `extractExcerpt()`, config loader, FK traversal | ~150 |
| `forge/tools/lib/store-nlp.cjs` | `parseIntentNLP()` — 5-stage parser, stop words, field validators, passphrase strip | ~350 |
| `forge/tools/lib/store-query-exec.cjs` | `executeQuery()`, `buildResult()`, keyword matcher, retry logic, count mode | ~250 |
| `forge/tools/store-query.cjs` | CLI entry: arg parse, mode check, dispatch to exact/nlp/keyword/schema, output | ~200 |

Test file: `forge/tools/__tests__/store-query.test.cjs` (new), split into suites matching the four modules.

### 3a. lib/store-facade.cjs

Extracts from store-query: `StoreFacade` class, `extractExcerpt()`, config loader.

Responsibilities:
- Read `.forge/config.json` → project prefix, store path, engineering path
- `listSprints/listTasks/listBugs/listFeatures(filter)` — load JSON dirs, apply filters
- `getEntity(type, id)` — single entity by ID
- `followFK(entity, fkField)` — traverse FK relationship to target entity
- `extractExcerpt(indexPath, maxSentences)` — strip frontmatter/headings/tables, return first N sentences

### 3b. lib/store-nlp.cjs

Extracts from store-query: `parseIntentNLP()` and all supporting data structures.

**5-stage parser (deterministic, no LLM):**

1. **ID patterns** — regex for `{PREFIX}-S##-T##`, `{PREFIX}-BUG-###`, `FEAT-###`, `S##`, `sprint N` — highest priority, consumed first
2. **Entity detection** — synonyms: sprint/release/iteration, task/item/todo, bug/defect/issue, feature/epic/capability — bigrams supported
3. **Status/severity mapping** — maps natural-language phrases to schema enum values per entity type; validates against `FIELD_VALIDATORS`; strips invalid values
4. **FK follow phrases** — `blocking/blocked`, `with sprint`, `with feature` → `follow` list
5. **Keyword extraction** — residual terms after prior stages, stop-word filtered, word-boundary matched

Returns a traversal plan:
```json
{
  "traverse": {
    "primary": "tasks|bugs|sprints|features",
    "filter": { ... },
    "follow": ["sprintId", "blockedBy", ...],
    "keywordMatch": { "field": "title", "terms": [...] },
    "sort": "asc|desc",
    "limit": N,
    "count": true
  }
}
```

### 3c. lib/store-query-exec.cjs

Extracts from store-query: query execution, result assembly, retry logic.

Responsibilities:
- `executeQuery(plan, store, enginePath)` — apply plan to StoreFacade
- `buildResult(entity, type, store, config)` — assemble result object with relationships, fileRefs, excerpt
- Keyword matching with word-boundary regex (prevents "store" matching "restore")
- Auto-retry: if primary query returns 0 results, retry as keyword-only search
- Count mode: return `{ count: N }` only when `plan.traverse.count === true`
- Confidence signals in `traversalTrace`: `plan confidence: high|low`

### 3d. store-query.cjs (CLI entry)

Thin CLI that ties the modules together.

Commands:
- `query [flags|intent]` — exact-args path if flags present, NLP path if intent string
- `nlp "<intent>"` — explicit NLP path (preferred for natural language)
- `schema` — dump project metadata (entity schemas, status enums, grammar reference)

---

## 4. Observability and Mode Control

Required for quantifying performance gains experimentally. Added to `store-query.cjs`.

### 4a. --mode flag

```bash
node "$FORGE_ROOT/tools/store-cli.cjs" query --mode strict   "open bugs"
node "$FORGE_ROOT/tools/store-cli.cjs" query --mode nlp      "open bugs"
node "$FORGE_ROOT/tools/store-cli.cjs" query --mode off      --bug WI-BUG-047
```

| Mode | Behavior |
|------|----------|
| `nlp` | Default for intent strings. Full NLP parser + FK traversal + excerpts. |
| `strict` | Exact-args only. Intent string input → error with suggestion. Baseline for comparison. |
| `off` | Alias for `strict`. No NLP parsing. |

Default selection: if input contains `--sprint/--task/--bug/--feature/--keyword` flags → `strict`; otherwise → `nlp`.

### 4b. meta block in response

Every response includes timing and mode metadata:

```json
{
  "query": "open bugs in S12",
  "path": "intent-nlp",
  "meta": {
    "mode": "nlp",
    "engineVersion": "1.0.0",
    "parseTimeMs": 4,
    "storeLoadTimeMs": 38,
    "totalTimeMs": 42
  },
  "traversalTrace": [...],
  "results": [...]
}
```

### 4c. Measurement protocol

To quantify the performance gain:

**Baseline (mode=strict or old navigation pattern):**
```bash
# Old: list all tasks, scan manually
node "$FORGE_ROOT/tools/store-cli.cjs" list task
# → returns all tasks, agent must read/filter manually
# Metric: token count of response + agent follow-up reads
```

**New (mode=nlp):**
```bash
node "$FORGE_ROOT/tools/store-cli.cjs" nlp "open bugs in S12"
# → returns filtered, FK-resolved, excerpt-included results
# Metric: token count of response, no follow-up reads needed
```

Comparison axis: `(response token count) × (follow-up read count)` per query.  
`meta.totalTimeMs` measures wall-clock cost of the query engine itself.

---

## 5. Plugin Artifact Mapping

| store-query artifact | Destination in forge | Action |
|---------------------|---------------------|--------|
| `tools/store-cli.cjs` (query engine) | `forge/tools/store-query.cjs` + `forge/tools/lib/store-*.cjs` | Decompose into 4 modules |
| `tools/query-logger.cjs` | `forge/tools/query-logger.cjs` | Copy verbatim |
| `skills/intent-nlp/SKILL.md` | `forge/skills/store-query-nlp/SKILL.md` | New plugin skill |
| `skills/exact-query/SKILL.md` | Absorbed into `forge/skills/store-custodian/SKILL.md` | Query section added to existing plugin skill |
| `skills/nlp-grammar/SKILL.md` | `forge/skills/store-query-grammar/SKILL.md` | Plugin skill — NLP token reference |
| `agents/query-validator.md` | `forge/agents/store-query-validator.md` | Adapt trigger language |
| `hooks/hooks.json` PreToolUse | Merged into `forge/hooks/hooks.json` | Warn-only flag validation |
| `hooks/hooks.json` PostToolUse | `forge/tools/query-logger.cjs` + hooks.json entry | Log to query-log.jsonl |

### 5a. Why skills are NOT meta

Meta skills exist for one reason: they require project-specific interpolation at `/forge:regenerate` time — entity prefixes, path values, etc. baked into the generated output under `.forge/skills/`.

The query skills don't need that. `store-query.cjs` reads `.forge/config.json` at **runtime** — it is already project-agnostic. The same skill text works for every forge project without any generation step.

`meta-store-custodian.md` has been removed — the skill now lives at `forge/skills/store-custodian/SKILL.md` as a proper plugin skill. No generation step needed; `store-cli.cjs` reads `.forge/config.json` at runtime. Query skills follow the same pattern: `forge/skills/store-query-nlp/SKILL.md`, `forge/skills/store-query-grammar/SKILL.md`.

### 5b. Skill adaptations

The intent-nlp skill execution line changes from store-query's `CLAUDE_PLUGIN_ROOT` to forge's `FORGE_ROOT` pattern:

```sh
# store-query (old)
node "${CLAUDE_PLUGIN_ROOT}/tools/store-cli.cjs" nlp "$ARGUMENTS"

# forge (new)
FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)")
node "$FORGE_ROOT/tools/store-cli.cjs" nlp "$ARGUMENTS"
```

The exact-query skill is absorbed into `forge/skills/store-custodian/SKILL.md` as a new `## Query` section.

### 5c. store-custodian skill additions

New invocation table rows added to `forge/skills/store-custodian/SKILL.md`:

| Intent | Command |
|--------|---------|
| Query sprint tasks/bugs | `node "$FORGE_ROOT/tools/store-cli.cjs" query --sprint S12` |
| Query specific entity | `node "$FORGE_ROOT/tools/store-cli.cjs" query --bug {PREFIX}-BUG-047` |
| Query by intent (NLP) | `node "$FORGE_ROOT/tools/store-cli.cjs" nlp "open bugs in S12"` |
| Keyword search | `node "$FORGE_ROOT/tools/store-cli.cjs" query --keyword panohost` |
| Project schema | `node "$FORGE_ROOT/tools/store-cli.cjs" schema` |
| Query (strict mode) | `node "$FORGE_ROOT/tools/store-cli.cjs" query --mode strict --sprint S12` |

---

## 6. Workflow Integration

No workflow files need structural changes. Two additions only.

### 6a. Navigation shortcut in context-gathering steps

Add to `meta-plan-task.md`, `meta-fix-bug.md`, `meta-sprint-plan.md` — near top, before research steps:

```markdown
### Context Gathering Shortcut

Before reading MASTER_INDEX.md manually, try the query engine:

```bash
FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)")
node "$FORGE_ROOT/tools/store-cli.cjs" nlp "<your query here>"
```

If results are sufficient (title + status + excerpt + file refs), skip manual navigation.
Fall back to reading MASTER_INDEX.md if the query returns empty or low-confidence results.
```

This is opt-in — existing workflows function unchanged. Query path is the fast route; manual navigation is the fallback.

### 6b. New slash command

`forge/commands/store-query.md` — thin wrapper exposing the query engine to humans and agents:

```
/forge:store-query <intent or flags>
```

Delegates to `node "$FORGE_ROOT/tools/store-cli.cjs" query $ARGUMENTS`. Distinct from `/forge:store` (write custodian).

---

## 7. Execution Sequence

Ordered by dependency. CLAUDE.md rule: failing test before every code change.

### Phase 1 — Infrastructure

1. Write failing tests for `lib/store-facade.cjs` (config load, entity list, FK follow, excerpt extraction)
2. Write failing tests for `lib/store-nlp.cjs` (all 5 parser stages, confidence signals)
3. Write failing tests for `lib/store-query-exec.cjs` (query execution, retry, count mode)
4. Write failing tests for `store-query.cjs` CLI (exact path, nlp path, keyword path, schema command, `--mode` flag, `meta` block)
5. Extract `lib/store-facade.cjs` from store-query's store-cli.cjs → tests pass
6. Extract `lib/store-nlp.cjs` → tests pass
7. Extract `lib/store-query-exec.cjs` → tests pass
8. Create `forge/tools/store-query.cjs` CLI entry → tests pass
9. Add `query`/`nlp`/`schema` dispatch to `forge/tools/store-cli.cjs` (3 cases in switch, spawn store-query.cjs)
10. Write tests for new dispatch cases → pass
11. Copy `query-logger.cjs` to `forge/tools/`

**Gate:** `node --test forge/tools/__tests__/*.test.cjs` — all tests pass (existing 593 + new suite).

### Phase 2 — Plugin Artifacts

12. Create `forge/skills/store-query-nlp/SKILL.md` (from intent-nlp SKILL.md, adapted)
13. Create `forge/skills/store-query-grammar/SKILL.md` (from nlp-grammar SKILL.md)
14. Update `forge/skills/store-custodian/SKILL.md` — add `## Query` section
15. Create `forge/agents/store-query-validator.md` (from query-validator.md, adapted)
16. Merge hooks into `forge/hooks/hooks.json`
17. Create `forge/commands/store-query.md`
18. Update `forge/meta/tool-specs/store-cli.spec.md` — add `query`, `nlp`, `schema` entries
19. Update `forge/tools/build-manifest.cjs` — add new meta files to SPEC_MAP
20. Run `node forge/tools/build-manifest.cjs --forge-root forge/` — regenerate structure manifest

### Phase 3 — Workflow Integration

21. Add context-gathering shortcut section to `meta-plan-task.md`
22. Add context-gathering shortcut section to `meta-fix-bug.md`
23. Add context-gathering shortcut section to `meta-sprint-plan.md`

### Phase 4 — Release

24. Version bump `forge/.claude-plugin/plugin.json`
25. Add migration entry to `forge/migrations.json`
26. Add entry to `CHANGELOG.md`
27. Regenerate `forge/integrity.json`
28. Update `forge/commands/health.md` with new verify-integrity hash
29. Security scan: `/security-watchdog:scan-plugin forge:forge --source-path forge/`
30. Save scan report to `docs/security/scan-v{VERSION}.md`
31. Update `docs/security/index.md` and `README.md` security table

---

## 8. Files Created / Modified

| File | Action |
|------|--------|
| `forge/tools/store-query.cjs` | New — CLI entry for query engine |
| `forge/tools/lib/store-facade.cjs` | New — StoreFacade + excerpt extraction |
| `forge/tools/lib/store-nlp.cjs` | New — NLP parser |
| `forge/tools/lib/store-query-exec.cjs` | New — query execution + result assembly |
| `forge/tools/query-logger.cjs` | New — PostToolUse query logger |
| `forge/tools/__tests__/store-query.test.cjs` | New — full test suite for query engine |
| `forge/tools/store-cli.cjs` | Modified — add `query`/`nlp`/`schema` dispatch (3 cases) |
| `forge/tools/__tests__/store-cli.test.cjs` | Modified — add tests for new dispatch cases |
| `forge/skills/store-query-nlp/SKILL.md` | New — intent NLP plugin skill |
| `forge/skills/store-query-grammar/SKILL.md` | New — NLP grammar reference plugin skill |
| `forge/skills/store-custodian/SKILL.md` | Modified — add query section |
| `forge/agents/store-query-validator.md` | New — result validation agent |
| `forge/hooks/hooks.json` | Modified — merge PreToolUse warn + PostToolUse logger |
| `forge/commands/store-query.md` | New — `/forge:store-query` slash command |
| `forge/meta/tool-specs/store-cli.spec.md` | Modified — add query/nlp/schema entries |
| `forge/tools/build-manifest.cjs` | Modified — add new meta files to SPEC_MAP |
| `forge/schemas/structure-manifest.json` | Regenerated |
| `forge/meta/workflows/meta-plan-task.md` | Modified — add context-gathering shortcut |
| `forge/meta/workflows/meta-fix-bug.md` | Modified — add context-gathering shortcut |
| `forge/meta/workflows/meta-sprint-plan.md` | Modified — add context-gathering shortcut |
| `forge/.claude-plugin/plugin.json` | Modified — version bump |
| `forge/migrations.json` | Modified — new migration entry |
| `CHANGELOG.md` | Modified — new version entry |
| `forge/integrity.json` | Regenerated |
| `forge/commands/health.md` | Modified — new verify-integrity hash |
| `docs/security/scan-v{VERSION}.md` | New — security scan report |
| `docs/security/index.md` | Modified — prepend new scan row |
| `README.md` | Modified — update security table |

---

## 9. Open Questions

| # | Question | Decision needed |
|---|---------|----------------|
| 1 | `store-query.cjs` spawns a child process — on Windows paths with spaces may break. Forge currently targets Linux/Mac; accept the risk or use `require()` with module isolation? | Accept for now; revisit if Windows support is needed |
| 2 | `query-log.jsonl` path: store-query writes to `.forge/store/query-log.jsonl`. Forge already owns `.forge/store/`. Accept this path or move to `.forge/store/events/query-log.jsonl`? | Decide before implementing logger |
| 3 | Should `/forge:store-query` be agent-callable (in `allowed-tools`) or human-only? | Needs decision before writing command frontmatter |
| 4 | NLP skill trigger: store-query's skill triggers on `forge-store` passphrase. In forge, passphrase is optional — skill should trigger on semantic patterns. Update trigger description? | Yes; remove passphrase dependency from skill description |
| 5 | `--mode` default when both flags and intent present (e.g. `--sprint S12 open bugs`)? | Flags take priority → `strict` mode; intent ignored |
