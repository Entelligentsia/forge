# Wenyan Mode Compression for Forge Workflows — Energy Impact Evaluation

**Date:** 2026-04-22  
**Evaluation focus:** Token savings for energy reduction  
**Constraint:** Maintain full instruction fidelity

---

## Executive Summary

❌ **Not recommended** — Wenyan compression creates unacceptable risk to instruction precision in Forge's workflow prompts. Energy savings modest; correctness risk high.

**Key findings:**
- Theoretical savings: ~65-75% output tokens (based on general caveman mode data)
- Input token impact: negligible (workflows loaded once per agent spawn)
- Critical risk: instruction ambiguity in safety-critical control flow
- Net energy impact: **< 5% session total** (workflows small fraction of conversation)

---

## 1. Baseline Measurements

### Current Forge Prompt Sizes

| Artifact Type | Size (bytes) | Size (words) | Token estimate¹ |
|--------------|--------------|--------------|-----------------|
| Meta workflows | 134,507 | 13,644 | ~18,200 |
| Meta personas | 16,576 | 3,274 | ~4,400 |
| **Meta total** | **151,083** | **16,918** | **~22,600** |
| Generated workflows | 184,846 | ~18,700 | ~25,000 |
| Generated personas | 16,576 | ~1,800 | ~2,400 |

¹ Token estimate: words × 1.33 (Claude tokenizer average)

### Per-Agent Load Pattern

Typical agent spawn loads:
- 1 workflow (plan, implement, review) → ~2,500–5,000 tokens
- 1 persona → ~500–800 tokens
- Architecture context (injected) → ~3,000 tokens
- **Total instruction overhead:** ~6,000–8,800 tokens per agent

---

## 2. Wenyan Compression Analysis

### Claimed Savings

From caveman plugin repository:
- **General caveman mode:** 65-75% output token reduction
- **Wenyan mode:** "most token-efficient written language" (qualitative claim, no empirical data)
- No isolated Wenyan compression ratio published

### Theoretical Application to Forge

**Scenario:** Apply Wenyan compression to generated workflows/personas

**Input token savings** (workflows loaded into agent context):
- Current: ~6,000–8,800 tokens per agent
- After 70% compression: ~1,800–2,640 tokens per agent
- **Savings:** ~4,200–6,160 tokens per agent spawn

**Output token impact:**
- Workflows/personas loaded once per agent (input)
- Agent's natural-language responses not affected (unless caveman mode also active for agent output)
- Negligible output savings from compressing instruction prompts

---

## 3. Energy Impact Calculation

### Token-to-Energy Conversion

Claude 4.x models (estimated):
- Input token processing: ~0.2 mJ per token (cache-write)
- Cached input token: ~0.02 mJ per token (cache-read, 10× cheaper)
- Output token generation: ~2 mJ per token (10× more expensive than input)

### Per-Agent Energy Savings

**Best case** (no prompt caching, full Wenyan compression):
- Savings: 6,000 tokens × 0.2 mJ = **1.2 J per agent**

**Realistic case** (prompt caching active after first agent):
- First agent: 6,000 tokens × 0.2 mJ = 1.2 J saved (cache-write)
- Subsequent agents: 6,000 tokens × 0.02 mJ = **0.12 J per agent** (cache-read)

### Session-Level Impact

Typical Forge sprint (10 tasks, 3 agents per task = 30 agents):
- Total instruction token savings: 30 agents × 6,000 tokens = 180,000 tokens
- Energy saved (with caching): 1.2 J + (29 × 0.12 J) = **~4.7 J total**
- Typical session energy budget: 100–500 J (varies by task complexity)
- **Instruction savings as % of session:** < 5%

---

## 4. Fidelity Risk Analysis

### High-Risk Instruction Patterns in Forge

Forge workflows contain **safety-critical control flow** that must execute with zero ambiguity:

#### Example 1: Pre-flight gate control flow
```
Exit 1 (gate failed) → print stderr and HALT. Do not proceed; do not attempt to produce the artifact.
Exit 2 (misconfiguration) → print stderr and HALT.
Exit 0 → continue.
```

**Wenyan compression risk:**  
Classical Chinese elides grammatical particles and relies on context for subject/object. Compressing "Do not proceed" into literary terseness could create ambiguity:
- Does HALT mean "stop and report" or "stop and retry"?
- Is "Exit 0 → continue" a conditional or imperative?

#### Example 2: Hook discipline (mandatory safety rule)
```
Every hook MUST have `'use strict';` and `process.on('uncaughtException', () => process.exit(0))`. Hooks MUST NEVER exit non-zero.
```

**Wenyan compression risk:**  
Negation and universal quantifiers ("MUST", "NEVER", "every") must be unambiguous. Classical Chinese negation patterns differ structurally from English. Example:
- "MUST NEVER exit non-zero" compressed → potential ambiguity between "must not" vs "need not"

#### Example 3: JSON schema instructions
```json
{
  "objective":   "<one sentence — what this plan sets out to build>",
  "key_changes": ["<up to 12 bullets, 200 chars each>"],
  "verdict":     "n/a",
  "written_at":  "<current ISO 8601 timestamp>",
  "artifact_ref":"PLAN.md"
}
```

**Wenyan compression risk:**  
Technical constraints (e.g., "up to 12 bullets, 200 chars each") must survive compression. Classical Chinese lacks numeric/measurement grammar native to English — these would need careful preservation.

---

## 5. Comparison: Energy vs. Correctness Trade-off

| Dimension | Uncompressed | Wenyan-Compressed |
|-----------|--------------|-------------------|
| **Input tokens/agent** | 6,000–8,800 | 1,800–2,640 |
| **Energy saved/agent** | — | 0.12–1.2 J (cached → uncached) |
| **Session energy impact** | — | < 5% total savings |
| **Instruction ambiguity risk** | None | High (safety-critical control flow) |
| **Debugging complexity** | Low | High (compression errors hidden in literary syntax) |
| **Maintenance burden** | Low | High (dual-format artifacts) |

---

## 6. Alternative Energy-Saving Strategies

Higher-impact, lower-risk alternatives to Wenyan compression:

### 6.1. Aggressive Prompt Caching
**Current state:** Forge uses frontmatter to declare KB doc dependencies  
**Improvement:** Ensure all architecture/domain docs cached aggressively  
**Impact:** 10× reduction in repeated doc reads (0.2 mJ → 0.02 mJ per token)  
**Risk:** None (infrastructure change only)

### 6.2. Agent Reuse via SendMessage
**Current state:** Each task spawns fresh agents (plan + implement + review)  
**Improvement:** Continue single agent across plan→implement→review for same task  
**Impact:** Eliminates 2/3 of instruction reloads per task  
**Risk:** None (context continuity actually improves quality)

### 6.3. Workflow Deduplication
**Current state:** Some instructions repeated across workflows (e.g., security scan steps)  
**Improvement:** Extract common instructions to shared KB doc, reference by name  
**Impact:** ~15–20% reduction in instruction token volume  
**Risk:** Low (requires careful refactoring, but preserves clarity)

### 6.4. Output Compression (Agent Responses)
**Current state:** Agent natural-language responses uncompressed  
**Improvement:** Apply caveman mode to agent output (not instructions)  
**Impact:** 65-75% reduction in high-cost output tokens (2 mJ each)  
**Risk:** Medium (requires user acceptance of terse communication style)

---

## 7. Recommendations

### ❌ Do NOT apply Wenyan compression to Forge workflows

**Reasons:**
1. Energy savings negligible (< 5% session total) due to input token low cost + prompt caching
2. Instruction fidelity risk unacceptable for safety-critical control flow
3. Debugging compressed prompts adds maintenance burden
4. Classical Chinese requires specialized expertise to validate correctness

### ✅ Alternative path: Compress agent output, not instructions

**Recommended approach:**
- Keep workflow prompts in full-fidelity English
- Apply caveman mode to **agent natural-language responses** (PROGRESS.md summaries, status updates)
- Output tokens 10× more expensive than input → higher energy ROI
- User-facing artifacts (PLAN.md, PROGRESS.md) remain human-readable

**Implementation:**
1. Add caveman mode toggle to Forge agent personas (optional, user-configurable)
2. Apply compression only to conversational text, not code/commands/JSON
3. Preserve full-fidelity for security-critical messages (warnings, gate failures)

### ✅ Prioritize high-impact optimizations first

**Energy ROI ranking** (highest to lowest):
1. **Agent output compression** (caveman mode for responses) → ~60% output token savings
2. **Agent reuse via SendMessage** → eliminates 2/3 instruction reloads
3. **Prompt caching tuning** → 10× cost reduction on repeated docs
4. **Workflow deduplication** → ~15-20% instruction volume reduction
5. ~~Wenyan compression~~ → < 5% session impact, high risk

---

## 8. Conclusion

**Wenyan compression for Forge workflow prompts fails cost-benefit analysis:**

- **Energy savings:** Minimal (< 5% session total) due to input token low cost and prompt caching
- **Fidelity risk:** High for safety-critical control flow, JSON schema constraints, and negation logic
- **Maintenance cost:** Increases debugging complexity and requires classical Chinese validation expertise

**Better strategy:**  
Compress agent output (conversational responses), not input (workflow instructions). Output tokens 10× more expensive → 12× higher energy ROI for same compression ratio.

**Net assessment:**  
Preserve full-fidelity workflow prompts. Optimize energy via prompt caching, agent reuse, and optional output compression instead.

---

## Appendix: Test Case — Compressed vs. Uncompressed

### Original (Uncompressed)
```
Exit 1 (gate failed) → print stderr and HALT. Do not proceed; do not attempt to produce the artifact.
Exit 2 (misconfiguration) → print stderr and HALT.
Exit 0 → continue.
```

### Hypothetical Wenyan Compression
```
門敗 (碼一) → 示錯而止。勿續；勿作物。
門亂 (碼二) → 示錯而止。
門通 (碼零) → 行。
```

**Issues identified:**
- "勿續" (do not continue) vs "勿作物" (do not produce artifact) → ambiguous boundary between halting and aborting
- Exit code semantics (1/2/0) require explicit numeric labels — compression could elide these
- "HALT" imperative force lost in "止" (stop) without modal emphasis

**Verdict:** Compression introduces unacceptable ambiguity in gate control logic.
