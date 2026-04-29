# Store-CLI Query Layer — Design Approach

**Date:** 2026-04-22
**Context:** Knowledge base navigation at scale (WalkInto: 2561 .md, 1935 .json; Carelytics: 925 .md, 228 .json)
**Goal:** Reduce agent navigation overhead from 5-6 tool calls / 14k tokens to 1-2 calls / 5k tokens per query

---

## 1. Problem Statement

Forge agents navigate the knowledge base by reading markdown index files, following links, and assembling context across multiple tool calls. This works at Forge's own scale (12 sprints, ~120 tasks). At production scale (WalkInto: 33 sprints, 256 tasks, 109 bugs, 2561 markdown files), navigation becomes the dominant cost.

### Current Navigation Sequence

```
Agent needs: "fix WI-BUG-047 blocking S23"

1. Read MASTER_INDEX.md          → 572 lines, ~8k tokens
2. Scan for BUG-047 row          → manual visual parse
3. Read bug INDEX.md             → ~2k tokens
4. Read blocked task INDEX.md    → ~2k tokens
5. Read bug JSON for current state → ~1k tokens
6. Read sprint JSON for context   → ~1k tokens

Total: ~14k tokens, 6 tool calls, ~30 seconds
```

### Cross-reference queries are worse

"Which bugs block VR sprint tasks?" requires reading every sprint INDEX.md with "VR" in the title, then following task links to bugs. At WalkInto scale: 5-8 reads, ~20k tokens, no single entry point.

---

## 2. Alternatives Evaluated

### 2a. Graph Database

Replace the JSON flat-file store with Neo4j/SPARQL.

| Aspect | Assessment |
|--------|------------|
| Relational queries | Excellent — native multi-hop traversal |
| Aggregation | Excellent — `COUNT`, `AVG`, `GROUP BY` native |
| Freshness | Excellent — always current, no stale markdown |
| Context quality | Poor — returns rows, not reasoning prose |
| LLM ergonomics | Poor — query language is a failure mode; wrong JOINs, NULL handling, casing |
| Cognitive load | Poor — new schema to learn before any query |
| Migration cost | High — all store-cli.cjs, collate.cjs, validate-store.cjs must be rewritten |
| Overkill at current scale | Yes — 256 tasks don't need Cypher |

**Verdict:** Wrong interface for LLMs. Adds indirection without solving the context problem. Rows don't carry "why."

### 2b. RDBMS + Schema

SQLite/Postgres with exposed SQL access.

| Aspect | Assessment |
|--------|------------|
| Aggregation | Excellent |
| Relational queries | Excellent |
| Context quality | Same problem as graph — rows not prose |
| LLM ergonomics | Poor — SQL is a failure mode |
| Migration cost | Medium — could wrap existing JSON as SQLite |
| Justified at scale | 50+ sprints, not 33 |

**Verdict:** Better than graph (simpler, embedded), but still wrong interface. "Give Claude SQL access" is the antipattern. The right approach: give Claude a tool that abstracts the store, whether JSON or SQLite underneath.

### 2c. Current Markdown + Query Tool (Chosen)

Keep markdown as delivery format. Add a query layer over the existing JSON store that follows foreign keys, projects prose, and returns assembled context.

| Aspect | Assessment |
|--------|------------|
| Relational queries | Good — Store facade already has FKs; query layer follows them |
| Aggregation | Adequate — count/filter via JS, not SQL |
| Freshness | Good — if collate runs after every state change (S12-T02 mandate) |
| Context quality | Excellent — excerpts from INDEX.md preserve reasoning prose |
| LLM ergonomics | Excellent — one call returns structured data + prose + file refs |
| Migration cost | Low — extends existing store-cli.cjs |
| Scales to | 50+ sprints before needing SQLite backing |

---

## 3. Architecture: Two-Path Query

The query layer has two execution paths: **exact args** (deterministic, fast) and **intent** (small LLM-assisted, probabilistic).

```
store-cli query [exact-args] | "<intent text>"
         │
         ├── Has --sprint/--task/--bug/--feature?
         │   YES → Exact path (Store facade, no LLM, <100ms)
         │   NO  → Intent path (small LLM → traversal plan → Store facade)
         │
         ▼
    Store facade traversal
         │
         ├── listTasks / listBugs / listSprints / listFeatures
         ├── Follow FKs: task.sprintId, task.featureId, bug.blockedBy
         │
         ▼
    Excerpt extraction
         │
         ├── Read INDEX.md for each matched entity
         ├── Extract first 3-4 sentences (summary)
         ├── Collect file refs (.json + .md paths)
         │
         ▼
    Assembled response (JSON to stdout)
```

### 3a. Exact Args Path

```bash
# Filter by sprint and status
store-cli query --sprint S23 --status open

# Get a specific entity with related context
store-cli query --bug WI-BUG-047 --with-blockers

# List entities for a feature
store-cli query --feature F01 --status committed
```

Implementation: direct Store facade calls. Filter objects passed to `listTasks()` / `listBugs()`. Foreign keys followed programmatically. No LLM involved.

### 3b. Intent Path

```bash
# Vague intent — needs LLM to translate
store-cli query "bugs blocking VR work"
store-cli query "what's the status of the Stripe checkout feature"
store-cli query "open tasks related to panohost"
```

Implementation: small LLM receives intent + schema context, returns traversal plan as JSON. Store facade executes the plan.

**LLM prompt template:**

```
Translate this agent intent into a store traversal plan.

Intent: "${intent}"
Available entities: sprints, tasks, bugs, features
Relationships:
  - tasks.sprintId → sprints.sprintId
  - bugs.sprintId → sprints.sprintId  
  - tasks.featureId → features.feature_id
  - bugs.blockedBy → tasks.taskId

Current sprint titles (for keyword matching):
${sprintTitles}

Return JSON:
{
  "traverse": {
    "primary": "tasks" | "bugs" | "sprints" | "features",
    "filter": { "key": "value" },
    "follow": ["sprintId", "blockedBy", "featureId"],
    "keywordMatch": { "field": "title", "terms": ["VR", "panohost"] }
  }
}
```

**LLM options:**

| Model | Latency | Cost | Privacy | Quality |
|-------|---------|------|---------|---------|
| Anthropic Haiku | 1-2s | ~$0.0001/query | External API | High |
| Ollama (qwen2.5:1.5b) | 2-4s | Free | Local | Medium |
| Ollama (qwen2.5:7b) | 3-6s | Free | Local | High |
| Gemini Flash | 1-2s | ~$0.0001/query | External API | High |

Recommendation: Start with Anthropic Haiku (fast, cheap, reliable). Add Ollama fallback for air-gapped environments.

---

## 4. Response Format

Every query returns the same JSON structure regardless of path:

```json
{
  "query": "bugs blocking VR work",
  "path": "intent",
  "traversalTrace": [
    "listed sprints with 'VR' in title → S23, S24, S26, S27",
    "listed tasks for S23, S24, S26, S27 with status != 'committed'",
    "followed blockedBy on open tasks → WI-BUG-047, WI-BUG-089"
  ],
  "results": [
    {
      "id": "WI-BUG-047",
      "title": "CloudFlare API key rotation",
      "status": "open",
      "type": "bug",
      "relationships": {
        "sprintId": "S23",
        "blocksTask": "WI-S23-T15",
        "featureId": "F01"
      },
      "excerpt": "CloudFlare API keys have no rotation mechanism. Keys are shared across Lambda functions. Rotation requires coordinated deploy of all 4 functions.",
      "fileRefs": {
        "json": ".forge/store/bugs/WI-BUG-047.json",
        "md": "engineering/bugs/BUG-047-api-key-rotation/INDEX.md"
      }
    },
    {
      "id": "WI-BUG-089",
      "title": "Panohost deletion race condition",
      "status": "open",
      "type": "bug",
      "relationships": {
        "sprintId": "S24",
        "blocksTask": "WI-S24-T03"
      },
      "excerpt": "Concurrent DELETE requests can orphan S3 objects when the deletion_status flag races between batch updates.",
      "fileRefs": {
        "json": ".forge/store/bugs/WI-BUG-089.json",
        "md": "engineering/bugs/BUG-089-panohost-race/INDEX.md"
      }
    }
  ],
  "relatedFileRefs": [
    "engineering/sprints/S23/tasks/task_15/INDEX.md",
    "engineering/sprints/S24/tasks/task_03/INDEX.md"
  ]
}
```

### Design decisions in the response format

| Field | Why |
|-------|-----|
| `path` | Agent knows if LLM was involved (can verify more carefully) |
| `traversalTrace` | Agent can audit *why* these results matched — prevents silent misinterpretation |
| `excerpt` | Verbatim from INDEX.md, not rewritten — preserves reasoning fidelity |
| `fileRefs` | Agent can Read() original files if excerpt is insufficient |
| `relationships` | Foreign keys resolved, not just IDs — agent sees dependency graph |
| `relatedFileRefs` | Flat list of all referenced files — agent can batch-read if needed |

### Why excerpts, not summaries

Summarization is lossy. "CloudFlare API keys shared across Lambda functions" is the detail the agent needs to write the fix. A summary might collapse this to "API key management issue" — information destroyed. Verbatim excerpts preserve the original reasoning. The agent can always Read() the full INDEX.md from file refs if the excerpt is insufficient.

---

## 5. Title as Primary Relevance Signal

The title column in MASTER_INDEX rows is the most important field for navigation. It allows agents to prune relevance without reading INDEX.md files.

At WalkInto scale (256 tasks), without titles the MASTER_INDEX is just a list of opaque IDs. Agents would need to read every INDEX.md to find anything. With titles, agents can skip irrelevant rows instantly.

The query layer uses titles for:
- **Exact path**: titles returned in results for display/filtering
- **Intent path**: small LLM uses titles as keyword matching targets
- **Both paths**: title is the human-readable label in every result object

In graph DB terms, title is the **semantic metadata on the node** that enables relevance pruning without traversal.

---

## 6. Scaling Tiers

| Scale | Strategy | Trigger |
|-------|----------|---------|
| < 20 sprints | Markdown indices only. Query tool nice-to-have. | Forge's current scale |
| 20-50 sprints | Query tool essential. JSON store + Store facade sufficient. | WalkInto (33 sprints) |
| 50+ sprints | Query tool essential. Consider SQLite backing store for performance. Collate must be incremental, not full-regen. | Future |
| 200+ sprints | Full RDBMS backing. Query tool abstracts it. Agent never sees SQL. | Hypothetical |

The JSON flat-file store scales to ~50 sprints before file I/O becomes a bottleneck (listing 1000+ JSON files per query). At that point, swap to SQLite as the Store implementation. The `Store` class facade means the query layer doesn't change — only `FSImpl` becomes `SQLiteImpl`.

---

## 7. Plugin Framework Integration

### Files to create/modify

| Component | Path | Action |
|-----------|------|--------|
| Implementation | `forge/tools/store-cli.cjs` | Add `query` case to dispatch + `cmdQuery()` + helpers |
| Tool spec | `forge/meta/tool-specs/store-query.spec.md` | New spec — purpose, CLI interface, output format, error handling |
| Slash command | `forge/commands/store-query.md` | New command — frontmatter + invocation |
| Skill update | `forge/meta/skills/meta-store-custodian.md` | Add `query` to capabilities |
| Tests | `forge/tools/__tests__/store-cli.test.cjs` | Add query subcommand tests |
| Build manifest | `forge/tools/build-manifest.cjs` | Add store-query.spec.md to SPEC_MAP |
| Integrity | `forge/integrity.json` | Regenerate after all changes |

### CLI interface (from tool spec)

```
<tool> store-cli query --sprint <id> [--status <status>] [--with-blockers]
<tool> store-cli query --task <id> [--with-sprint] [--with-feature]
<tool> store-cli query --bug <id> [--with-blocked-tasks]
<tool> store-cli query --feature <id> [--status <status>]
<tool> store-cli query "<intent>" [--llm haiku|ollama|none]
<tool> store-cli query --help
```

### Invocation in slash command

```sh
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

```sh
node "$FORGE_ROOT/tools/store-cli.cjs" query "$ARGUMENTS"
```

### Error handling

Follows existing store-cli.cjs pattern:

```cjs
process.on('uncaughtException', (e) => {
  process.stderr.write(`Error: ${e.message}\n`);
  process.exit(1);
});
```

LLM failures in the intent path should fall back to a helpful error, not crash:

```cjs
if (llmError) {
  process.stderr.write(`Intent translation failed: ${llmError.message}\n`);
  process.stderr.write('Try exact args: --sprint, --task, --bug, --feature\n');
  process.exit(1);
}
```

---

## 8. Test Strategy

Per CLAUDE.md mandatory rules: every `.cjs` change must be preceded by a failing test.

### Test cases for exact path

```
1. query --sprint S12 --status open → returns only open S12 tasks
2. query --bug FORGE-BUG-001 --with-blocked-tasks → includes blockedBy chain
3. query --feature F01 → returns tasks linked to feature F01
4. query with no matches → returns empty results array
5. query --sprint nonexistent → returns empty, exit 0
```

### Test cases for intent path

```
6. query "open sprints" → LLM returns traversal plan, results match
7. query "bugs blocking S12" → LLM follows blockedBy, returns matching bugs
8. query with garbled intent → graceful error, suggests exact args
9. query with --llm none flag → forces exact path even for intent input
```

### Test cases for excerpt extraction

```
10. Entity with INDEX.md → excerpt present in result
11. Entity without INDEX.md → excerpt null, fileRefs still present
12. Very long INDEX.md → excerpt capped at 3-4 sentences
```

---

## 9. Open Questions

| # | Question | Options |
|---|---------|---------|
| 1 | How does `query` discover the INDEX.md path for a given entity? | Current approach: convention-based path mapping (entity type + ID → known directory structure). Alternative: store a `path` field in each entity JSON (already done for sprints in S06-T06). |
| 2 | Should intent path cache traversal plans? | If "bugs blocking VR" is asked twice in one session, cache the LLM result. But store state may change between calls. Safer: no cache, or cache with TTL. |
| 3 | LLM configuration: which model, what API key? | Could use project's existing `.env` or `.forge/config.json`. Or require explicit `--llm` flag. Need a config convention. |
| 4 | Should `--context` flag control excerpt inclusion? | Default: include excerpts. With `--no-excerpts`: structured data only (smaller response for simple lookups). |
| 5 | How to handle projects without INDEX.md files? | Some Forge instances may not have run collate. Query should return JSON data + file refs but null excerpts, with a note suggesting `/forge:collate`. |

---

## 10. LLM Backend: Ollama-First with Tiered Fallback

### Options evaluated

#### Option A: Embedded in Forge plugin

```
forge/tools/store-cli.cjs
  └── query intent → node-llama-cpp + Qwen2.5-0.5B GGUF (in-process)
```

| Aspect | Assessment |
|--------|------------|
| Install size | ~500MB GGUF bundled with plugin. Current plugin ~2MB → 250x larger |
| Cold start | ~2-5s model load per `store-cli query` call (new node process each time) |
| Sharing | No. Each Forge install carries its own copy. Each invocation re-loads model |
| Platform | node-llama-cpp pre-built binaries for 13 platforms. cmake fallback may fail on exotic systems |
| Distribution | Plugin install goes from seconds to minutes. Marketplace UX breaks |

**Verdict**: Distribution-hostile. A ~500MB plugin is unreasonable for a lightweight SDLC tool.

#### Option B: node-llama-cpp in ember daemon (native addon)

```
ember daemon (:7766)
  └── node-llama-cpp + Qwen2.5-0.5B GGUF (loaded once, warm)
  └── POST /api/query → translateIntent() → traversal plan
```

**Verdict**: Better than embedded, but ember now depends on a native addon with cmake compilation risk. node-llama-cpp has 13 pre-built binaries, but exotic platforms (ARM64 Linux, musl/Alpine, FreeBSD) fall back to source compilation which may fail. This makes ember's daemon startup fragile on non-mainstream systems.

#### Option C: llama-server sidecar managed by ember

```
ember serve
  └── spawn llama-server (subprocess, persistent)
      listening on localhost:7767
      model pre-loaded, warm
  └── /api/query → HTTP proxy to :7767
```

**Verdict**: Eliminates native addon risk (llama-server is a standalone binary). But ember becomes a process manager — must download platform-specific binaries, handle spawn/kill/restart, monitor health. Significant engineering for something Ollama already does.

#### Option D: Ollama (Chosen as primary)

```
Ollama daemon (localhost:11434) — user-managed, system service
  └── POST /v1/chat/completions → structured JSON (grammar-enforced)
```

**Verdict**: Ollama already solves process management, model distribution, GPU detection, memory management, and platform-specific binary distribution. Ember and store-cli just make HTTP calls. Zero native dependencies in either project.

### Why Ollama wins for the common case

| Responsibility | Ollama handles | Ember would need to |
|----------------|---------------|---------------------|
| Process lifecycle | System service (systemd/launchd) | Custom spawn/kill/monitor |
| Model download | `ollama pull qwen2.5:0.5b` | Custom download + versioning |
| GPU detection | Automatic, battle-tested | Custom detection logic |
| Memory management | Auto unload idle models | Manual logic |
| Multi-model serving | Built-in | Multiple llama-server processes |
| Platform binaries | Ollama project distributes | Per-platform binary management |
| Structured output | `response_format: json_schema` (v0.5+) | GBNF grammar (llama-server) or `createGrammarForJsonSchema` (node-llama-cpp) |
| Install base | ~30M+ downloads | N/A |

Ember doesn't need to be a process manager. Ollama already is one.

### Deployment topologies

Four valid combinations, each providing different capability levels. store-cli auto-detects which topology it's in by probing two ports — no configuration needed.

```
Topology A:  Forge → Ollama
             Plugin + local LLM. No ember.

Topology B:  Forge → Ember → Ollama
             Full stack. Ember routes to user's Ollama.

Topology C:  Forge → Ember → llama-server sidecar
             Full stack without Ollama. Ember manages the LLM process.

Topology D:  Forge only
             Exact-args queries only. No LLM. Works everywhere.
```

**What store-cli sees in every topology:**

```
store-cli query "<intent>"
       │
       ├── Try ember? (HEAD localhost:7766)
       │   YES → POST /api/query
       │         ember routes internally to Ollama (B) or llama-server (C)
       │         Returns: { plan, model, provider }
       │
       ├── Try Ollama? (HEAD localhost:11434)
       │   YES → POST /v1/chat/completions directly
       │         Works without ember (A)
       │
       └── Neither → Topology D
           Error + exact-args suggestion
```

store-cli doesn't know or care which topology it's in. It probes two ports and uses whichever responds.

| Topology | Intent queries | Dashboard UI | File watchers | LLM process mgmt | Install complexity | For whom |
|----------|--------------|-------------|---------------|-----------------|-------------------|-----------|
| A: Forge→Ollama | ✅ | ❌ | ❌ | User (systemd/launchd) | Low | Devs already using Ollama |
| B: Forge→Ember→Ollama | ✅ | ✅ | ✅ | User (Ollama) | Medium | Devs who want the dashboard |
| C: Forge→Ember→sidecar | ✅ | ✅ | ✅ | Ember manages | Medium | Devs who won't install Ollama |
| D: Forge only | ❌ | ❌ | ❌ | N/A | Lowest | CI, servers, minimalists |

**Exact-args queries work in all four topologies.** LLM is only needed for intent queries.

### Install flow per topology

**Topology A — Forge + Ollama:**
```bash
# Forge already installed
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:0.5b
# Done. Intent queries work.
```

**Topology B — Forge + Ember + Ollama:**
```bash
# Forge already installed
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:0.5b
npm install -g @ember/cli          # or: bun install -g @ember/cli
ember serve                         # detects Ollama automatically
# Done. Intent queries + dashboard.
```

**Topology C — Forge + Ember + llama-server sidecar:**
```bash
# Forge already installed
npm install -g @ember/cli
ember model pull                    # downloads GGUF + llama-server binary
ember serve                          # spawns llama-server as subprocess
# Done. Intent queries + dashboard. No Ollama needed.
```

**Topology D — Forge only:**
```bash
# Forge already installed
# Done. Exact-args queries only.
```

### Ember is a cache, not a requirement

For intent queries, the data flow is identical whether ember is present or not:

```
Without ember:   store-cli → Ollama → traversal plan
With ember:      store-cli → ember → Ollama → traversal plan
```

Ember adds a hop (~10ms) but provides:
- Configured model selection (user doesn't pass `--model` to store-cli)
- Dashboard UI showing query history
- File watchers triggering recollation after mutations
- Sidecar LLM for users without Ollama

The core capability (intent → traversal plan) works with just Forge + Ollama (Topology A).

### Ollama structured output

Ollama v0.5+ supports `response_format` with `json_schema` type, providing constrained decoding equivalent to GBNF grammar enforcement. The model output will conform to the schema at the token-generation level.

```json
{
  "model": "qwen2.5:0.5b",
  "messages": [...],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "traversal_plan",
      "schema": {
        "type": "object",
        "properties": {
          "traverse": {
            "type": "object",
            "properties": {
              "primary": { "type": "string", "enum": ["tasks", "bugs", "sprints", "features"] },
              "filter": { "type": "object" },
              "follow": { "type": "array", "items": { "type": "string" } }
            }
          },
          "keywordMatch": {
            "type": "object",
            "properties": {
              "field": { "type": "string" },
              "terms": { "type": "array", "items": { "type": "string" } }
            }
          }
        },
        "required": ["traverse"]
      }
    }
  }
}
```

### packages/llm/ — thin HTTP adapter, no native deps

Ember's LLM package is a pure TypeScript HTTP client. Zero native dependencies. No cmake, no node-gyp, no platform-specific binaries. It routes to whichever LLM backend the user has configured.

```typescript
// packages/llm/src/index.ts — zero native dependencies

const OLLAMA_URL = 'http://localhost:11434';
const SIDECAR_URL = 'http://localhost:7767';

export interface LlmConfig {
  provider: 'ollama' | 'sidecar';
  model: string;
  ollamaUrl?: string;    // default: http://localhost:11434
  sidecarUrl?: string;   // default: http://localhost:7767
}

export async function translateIntent(
  intent: string,
  schema: object,
  config: LlmConfig
): Promise<{ plan: object; model: string; provider: string }> {
  if (config.provider === 'ollama') {
    return queryOllama(intent, schema, config);
  }
  return querySidecar(intent, schema, config);
}

async function queryOllama(
  intent: string,
  schema: object,
  config: LlmConfig
): Promise<{ plan: object; model: string; provider: string }> {
  const url = config.ollamaUrl || OLLAMA_URL;
  const res = await fetch(`${url}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: TRAVERSAL_SYSTEM_PROMPT },
        { role: 'user', content: `Intent: "${intent}"` }
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'traversal', schema } },
      max_tokens: 200,
      temperature: 0.1
    })
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  return {
    plan: JSON.parse(data.choices[0].message.content),
    model: config.model,
    provider: 'ollama'
  };
}

async function querySidecar(
  intent: string,
  schema: object,
  config: LlmConfig
): Promise<{ plan: object; model: string; provider: string }> {
  const url = config.sidecarUrl || 'http://localhost:7767';
  const res = await fetch(`${url}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: TRAVERSAL_SYSTEM_PROMPT },
        { role: 'user', content: `Intent: "${intent}"` }
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'traversal', schema } },
      max_tokens: 200,
      temperature: 0.1
    })
  });

  if (!res.ok) throw new Error(`Sidecar error: ${res.status}`);
  const data = await res.json();
  return {
    plan: JSON.parse(data.choices[0].message.content),
    model: config.model,
    provider: 'sidecar'
  };
}
```

### Daemon endpoint

```typescript
// packages/daemon/src/routes/query.ts
import { translateIntent, type LlmConfig } from "@ember/llm";

app.post("/api/query", async (c) => {
  const { intent, schema } = await c.req.json();
  const config: LlmConfig = c.get('llmConfig');  // from daemon config
  const result = await translateIntent(intent, schema, config);
  return c.json(result);
});
```

### store-cli.cjs: auto-detect LLM backend

```cjs
async function queryWithLLM(intent, args) {
  // 1. Try ember daemon (delegates to Ollama or sidecar)
  const daemonUrl = 'http://localhost:7766';
  try {
    const res = await fetch(`${daemonUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, schema: TRAVERSAL_SCHEMA }),
      signal: AbortSignal.timeout(15000)
    });
    if (res.ok) {
      const { plan, model, provider } = await res.json();
      return { plan, model, provider };
    }
  } catch (_) {}

  // 2. Try Ollama directly (for users without ember)
  const ollamaUrl = args.ollamaUrl || 'http://localhost:11434';
  try {
    const res = await fetch(`${ollamaUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: args.model || 'qwen2.5:0.5b',
        messages: [
          { role: 'system', content: TRAVERSAL_SYSTEM_PROMPT },
          { role: 'user', content: `Intent: "${intent}"` }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'traversal', schema: TRAVERSAL_SCHEMA }
        },
        max_tokens: 200,
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (res.ok) {
      const data = await res.json();
      const plan = JSON.parse(data.choices[0].message.content);
      return { plan, model: args.model || 'qwen2.5:0.5b', provider: 'ollama' };
    }
  } catch (_) {}

  // 3. No LLM available
  process.stderr.write(
    'Intent queries require an LLM backend.\n' +
    'Options:\n' +
    '  1. Install Ollama: https://ollama.com\n' +
    '     Then: ollama pull qwen2.5:0.5b\n' +
    '  2. Install ember: https://github.com/Entelligentsia/forge-ember\n' +
    '     Then: ember serve\n' +
    '  3. Use exact args: --sprint, --task, --bug, --feature\n'
  );
  process.exit(1);
}
```

### ember model management (delegates to Ollama)

```bash
# Check LLM status
ember model status
  → Ollama: running (localhost:11434)
  → Model qwen2.5:0.5b: installed ✓
  → Model qwen2.5:1.5b: not installed

# Pull model via Ollama
ember model pull qwen2.5:0.5b
  → Delegates: ollama pull qwen2.5:0.5b

# Configure which model ember uses
ember model use qwen2.5:1.5b
  → Writes to ~/.ember/config.json: { "llm": { "provider": "ollama", "model": "qwen2.5:1.5b" } }
```

Ember doesn't own the model. It configures which Ollama model to target.

---

## 11. Model Selection

### Recommended models for Ollama

| Model | Ollama tag | RAM | Quality (IFeval) | Use case |
|-------|-----------|-----|------------------|----------|
| **Qwen2.5-0.5B** | `qwen2.5:0.5b` | ~600-800 MB | 27.9% | Default. Fits <1GB budget |
| Qwen2.5-1.5B | `qwen2.5:1.5b` | ~1.2-1.8 GB | ~40%+ | Opt-in upgrade for better quality |
| Qwen2.5-3B | `qwen2.5:3b` | ~2.5-3.5 GB | ~50%+ | Teams with good hardware |
| SmolLM2-360M | `smollm2:360m` | ~400-600 MB | Low | Constrained environments (CI) |

**Primary: `qwen2.5:0.5b`**

- Highest instruction-following in sub-1GB class
- 32K context window
- Ollama structured output (`response_format: json_schema`) guarantees structural correctness
- Users can upgrade to larger models with a single `ember model use` command

**Fallback: `smollm2:360m`** for RAM-constrained environments.

### Structured output enforcement

Ollama v0.5+ supports `response_format: { type: "json_schema", json_schema: {...} }`, which provides constrained decoding equivalent to GBNF grammar enforcement. At the token-generation level, the model **cannot** produce invalid JSON. Its job reduces to filling in correct *values*, not correct *syntax*. This makes even a 0.5B model reliable for structured extraction tasks.

### Inference speed estimates

| Hardware | Model | Tokens/sec | 200-token output |
|----------|-------|-----------|-----------------|
| M2 MacBook Pro | qwen2.5:0.5b | ~80-120 | ~1.5-2.5s |
| Intel i5-13400F | qwen2.5:0.5b | ~40-60 | ~3-5s |
| RTX 4080 | qwen2.5:0.5b | ~400+ | <0.5s |

---

## 12. Resolved Open Questions

| # | Question | Decision |
|---|---------|----------|
| 1 | INDEX.md path discovery | Convention-based mapping + sprint `path` field (S06-T06). Query reads both. |
| 2 | Intent caching | No cache. Store state changes between calls. LLM call is cheap (free with Ollama). |
| 3 | LLM configuration | Ollama manages models. Ember configures routing via `~/.ember/config.json`: `provider: "ollama"\|"sidecar"`, `model: "qwen2.5:0.5b"`. store-cli auto-detects (ember → ollama → error). `--llm` flag available for override. |
| 4 | Excerpt inclusion | Default: on. `--no-excerpts` for structured-data-only responses. |
| 5 | Missing INDEX.md files | Return null excerpts + file refs. stderr note: "Run /forge:collate to generate INDEX.md files." |
| 6 | Ember daemon absent? | store-cli falls back to direct Ollama call. If Ollama absent too, error with exact-args suggestion. Exact-args queries always work. |
| 7 | Multiple model sizes? | `ollama pull qwen2.5:0.5b` (default), `ollama pull qwen2.5:1.5b` (upgrade), `ollama pull smollm2:360m` (constrained). User configures via `ember model use`. |
| 8 | Daemon API contract | `POST /api/query { intent, schema } → { plan, model, provider }`. OpenAI-compatible. Shared type in `@ember/shared`. |
| 9 | Cold start | Ollama manages model loading. Ember never loads models itself. Ollama keeps model warm while in use; auto-unloads on idle. |
| 10 | **Native addon risk?** | Eliminated. Ollama is a standalone binary, not a Node.js native addon. ember `packages/llm/` is pure TypeScript — HTTP adapter only. No cmake, no node-gyp, no platform-specific compilation in either Forge or Ember. |
| 11 | **llama-server sidecar needed?** | Optional — Topology C only. Ember can spawn llama-server for users who won't install Ollama. Not required for Topologies A, B, or D. |
| 12 | **Which topology is the default install?** | Topology D (Forge only) is the default — zero additional dependencies. Topology A (Forge + Ollama) is the recommended upgrade for intent queries. Topology B/C adds the ember dashboard. No topology requires ember for core functionality. |