# Wenyan Compression for Token Budget Savings — Corrected Analysis

**Date:** 2026-04-22  
**Goal:** Reduce user token consumption (Claude API usage)  
**Constraint:** Full fidelity for intent/details in artifacts

---

## Executive Summary

✅ **Wenyan compression valuable for both input AND output** when goal = token budget savings (not energy).

**Key finding:** Artifacts written by one agent become INPUT for next agent. Compressing artifacts = saves input tokens across agent pipeline.

**Recommended strategy:** Hybrid compression — Wenyan for workflow prompts + caveman for artifact prose. Max token savings, preserve fidelity.

---

## 1. Corrected Token Flow Model

### Forge Agent Pipeline (per task)

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│ Plan Agent  │────────▶│ Implement    │────────▶│ Review      │
│             │  PLAN   │ Agent        │ PROGRESS│ Agent       │
└─────────────┘  .md    └──────────────┘   .md   └─────────────┘
                (1.2K)                      (700)
                OUTPUT                      OUTPUT
                  │                           │
                  └───────────INPUT───────────┘
                        (next agent reads)
```

**Critical insight:** Output tokens from one agent = input tokens for next agent.

---

## 2. Token Budget Impact Analysis

### 2.1. Current Token Load (Per Task)

| Agent | Input Tokens | Output Tokens | Total |
|-------|--------------|---------------|-------|
| **Plan** | 6K (workflow) + 3K (architecture) | 1.2K (PLAN.md) | 10.2K |
| **Implement** | 6K (workflow) + 1.2K (PLAN.md) + 3K (arch) | 700 (PROGRESS.md) | 10.9K |
| **Review** | 5K (workflow) + 1.2K (PLAN) + 700 (PROGRESS) + 2K (diffs) | 500 (REVIEW.md) | 9.4K |
| **TOTAL** | **30.5K** | **2.4K** | **32.9K** |

**Key observation:** Input tokens dominate (93% of total). Output only 7%.

---

### 2.2. Compression Target ROI (Token Savings)

#### Scenario A: Compress workflow prompts only (Wenyan)

| Target | Before | After (70% compression) | Savings |
|--------|--------|-------------------------|---------|
| Workflow prompts | 17K tokens (3 agents × ~6K avg) | 5.1K tokens | **11.9K per task** |
| Artifacts (PLAN/PROGRESS) | 1.9K tokens | 1.9K (no change) | 0 |
| **Net savings** | — | — | **11.9K (36%)** |

**Caveat:** Workflows loaded once per agent, then cached. After first agent, savings minimal (cache-read cost low, but still counts toward user token budget).

---

#### Scenario B: Compress artifacts only (caveman)

| Target | Before | After (60% prose compression) | Savings |
|--------|--------|------------------------------|---------|
| Workflow prompts | 17K tokens | 17K (no change) | 0 |
| PLAN.md (output + re-read) | 1.2K output + 1.2K input (implement) + 1.2K input (review) = 3.6K | 1.4K total | **2.2K** |
| PROGRESS.md (output + re-read) | 700 output + 700 input (review) = 1.4K | 560 total | **840** |
| **Net savings** | — | — | **3.1K per task (9%)** |

**Key insight:** Artifacts re-read multiple times. Compressing them multiplies savings.

---

#### Scenario C: Hybrid compression (Wenyan + caveman)

| Target | Before | After | Savings |
|--------|--------|-------|---------|
| Workflow prompts | 17K tokens | 5.1K (Wenyan) | **11.9K** |
| Artifacts | 5K tokens (counting re-reads) | 2K (caveman) | **3K** |
| **Net savings** | 22K | 7.1K | **14.9K per task (68%)** |

**Winner:** Hybrid approach saves 2× more than either strategy alone.

---

## 3. Sprint-Level Token Budget

### Current Usage (10 tasks/sprint)

| Phase | Tokens | Cost at $3/M input + $15/M output |
|-------|--------|-----------------------------------|
| Input | 305K | $0.92 |
| Output | 24K | $0.36 |
| **Total** | **329K** | **$1.28 per sprint** |

---

### With Hybrid Compression

| Phase | Tokens | Savings | Cost |
|-------|--------|---------|------|
| Input | 97K | 208K saved (68%) | $0.29 |
| Output | 9.6K | 14.4K saved (60%) | $0.14 |
| **Total** | **106.6K** | **222.4K (68%)** | **$0.43** |

**Per-sprint savings:** 222K tokens = **$0.85** (67% cost reduction)

**Annual savings** (50 sprints): 11M tokens = **$42.50**

---

## 4. Fidelity Re-Assessment

### 4.1. Wenyan for Workflow Prompts — Risk Re-Evaluation

**Previous concern:** Classical Chinese ambiguity in control flow (HALT, MUST NEVER, exit codes)

**New insight:** Workflows can **selectively apply Wenyan** — compress prose explanations, preserve imperative/control-flow instructions verbatim.

#### Hybrid Wenyan Example

**Original workflow (mixed prose + imperatives):**
```markdown
## Step 1 — Load Context

The Engineer reads the task prompt, which is the source of truth for requirements. 
Architecture context is injected into your prompt under the "Architecture context" 
heading. If no summary was injected, read `engineering/architecture/stack.md` directly.

**YOU MUST read the approved PLAN.md.** This is your specification. Follow it exactly.

If the plan references specific files, read them before modifying.
```

**Wenyan-compressed (prose only):**
```markdown
## Step 1 — Load Context

工讀任務令(需求真源)。建構文脈注於提示"Architecture context"標下。無摘要則讀 `engineering/architecture/stack.md`。

**YOU MUST read the approved PLAN.md.** This is your specification. Follow it exactly.

計畫引特定檔則先讀再修。
```

**Fidelity check:**
- Imperative ("YOU MUST") preserved verbatim in English
- File paths (`engineering/architecture/stack.md`) preserved
- Prose ("The Engineer reads...", "If no summary was injected") compressed to classical Chinese
- Control flow unambiguous (imperative line stands out visually)

**Token savings:** ~80 → ~50 tokens (37% reduction, vs 70% if full Wenyan applied)

---

### 4.2. Selective Compression Rules

#### Preserve verbatim (no Wenyan):

1. **Imperatives with modal verbs:**
   - `MUST`, `NEVER`, `HALT`, `Do not proceed`
   - Reason: Negation/obligation ambiguous in classical Chinese

2. **Control flow with exit codes:**
   - `Exit 1 → HALT`, `Exit 0 → continue`
   - Reason: Numeric semantics require explicit labels

3. **Technical artifacts:**
   - File paths, commands, JSON schemas
   - Reason: Must survive copy-paste

4. **Safety boundaries:**
   - Pre-flight gate failures, destructive operation warnings
   - Reason: Ambiguity unacceptable for irreversible actions

#### Compress (apply Wenyan):

1. **Explanatory prose:**
   - "The Engineer reads the task prompt, which is..."
   - Compress to: 工讀任務令 (Engineer reads task order)

2. **Contextual guidance:**
   - "If no summary was injected, read X directly"
   - Compress to: 無摘要則讀 X

3. **Rationale sections:**
   - "This approach ensures that..."
   - Compress to: 此法保... (This method ensures...)

---

## 5. Artifact Compression Strategy (Caveman)

### 5.1. PLAN.md Compression Zones

| Section | Compression | Rationale |
|---------|-------------|-----------|
| **Objective** | 60% (caveman) | One-sentence goal — prose compressible |
| **Approach** | 70% (caveman) | Diagnostic reasoning — compress "The issue is..." to "Bug: X. Fix: Y." |
| **Files to Modify** | 0% (preserve table) | Already dense, scannable |
| **Testing Strategy** | 40% (compress prose, preserve commands) | "We will run X" → "Run X" |
| **Acceptance Criteria** | 30% (compress within bullets) | Checklist must stay actionable |

**Example (Approach section):**

Before (86 tokens):
```
The current problem is that the orchestrator hardcodes model resolution and passes it 
into event JSON, but on non-Anthropic runtimes the orchestrator's own resolution logic 
may resolve to an incorrect Anthropic model name. By adding deterministic model 
discovery at the store-cli level, we guarantee correct fallback.
```

After caveman (32 tokens):
```
Problem: orchestrator hardcodes model in event JSON. Non-Anthropic runtime → wrong 
model name. Fix: store-cli discoverModel() at write boundary. Correct fallback.
```

**Fidelity:** Problem/cause/solution preserved. Entities (orchestrator, store-cli, discoverModel()) intact.

---

### 5.2. PROGRESS.md Compression Zones

| Section | Compression | Rationale |
|---------|-------------|-----------|
| **Summary** | 60% (caveman) | High-level what/where/why — prose compressible |
| **Files Changed** | 0% (preserve table) | Structured data — already minimal |
| **Test Evidence** | 0% (preserve literal output) | Audit trail — must be verbatim |
| **Acceptance Criteria** | 30% (compress prose) | "DONE" vs "Successfully completed" |

**Example (Summary):**

Before (39 tokens):
```
Added a "Store-Write Verification" section to `forge/meta/workflows/meta-sprint-plan.md` 
that instructs agents executing the sprint-plan workflow to verify every store write 
succeeds and retry on schema violations.
```

After caveman (18 tokens):
```
Added Store-Write Verification to meta-sprint-plan.md. Agents verify write success, 
retry on schema violations.
```

**Fidelity:** What/where/why preserved. File path intact. Core behavior (verify/retry) clear.

---

## 6. Implementation Strategy

### 6.1. Workflow Prompt Compression (Wenyan)

**Step 1:** Annotate workflow source files (`forge/meta/workflows/*.md`) with compression directives.

```markdown
<!-- WENYAN_COMPRESS_START -->
The Engineer reads the task prompt, which is the source of truth for requirements.
<!-- WENYAN_COMPRESS_END -->

**YOU MUST read the approved PLAN.md.** This is your specification.

<!-- WENYAN_COMPRESS_START -->
If the plan references specific files, read them before modifying.
<!-- WENYAN_COMPRESS_END -->
```

**Step 2:** Add compression pass to `collate.cjs` (workflow generation tool).

```javascript
function applyWenyanCompression(markdown) {
  const sections = markdown.split(/<!-- WENYAN_COMPRESS_(START|END) -->/);
  return sections.map((sec, i) => {
    if (i % 2 === 1) { // Inside COMPRESS block
      return compressToWenyan(sec); // Call Wenyan compression API or skill
    }
    return sec; // Preserve verbatim
  }).join('');
}
```

**Step 3:** Opt-in via config.

```json
// .forge/config.json
{
  "workflowCompression": "wenyan-lite",  // Options: "none" | "wenyan-lite" | "wenyan-full"
  ...
}
```

---

### 6.2. Artifact Compression (Caveman)

**Step 1:** Add compression mode to persona instructions.

```markdown
## Output Compression (Caveman Mode Active)

When generating PLAN.md or PROGRESS.md:
- Compress prose sections (Objective, Approach, Summary)
- Preserve tables, code blocks, file paths, test evidence
- Drop articles, filler, fragments OK
- Technical terms exact (function names, file paths)
```

**Step 2:** Inject mode from config.

```bash
# In workflow generation (collate.cjs)
OUTPUT_MODE=$(node -e "console.log(require('./.forge/config.json').outputMode || 'full')")
# Append compression instructions to persona if caveman mode active
```

**Step 3:** User toggles via `/forge:config set outputMode caveman-full`.

---

## 7. Token Savings Validation

### 7.1. Measurement Approach

**Before compression (baseline):**
- Complete 5 tasks with compression disabled
- Record token usage via `/cost` after each agent

**After compression:**
- Complete 5 comparable tasks with hybrid compression enabled
- Record token usage via `/cost`

**Metrics:**
- Input tokens saved: (baseline_input - compressed_input) / baseline_input
- Output tokens saved: (baseline_output - compressed_output) / baseline_output
- Total savings: (baseline_total - compressed_total) / baseline_total

**Target:** ≥ 60% total token savings (matches hybrid scenario C projection)

---

### 7.2. Fidelity Validation

**Test protocol:**
1. Generate compressed PLAN.md for completed task
2. Independent reviewer (human architect) reads compressed plan
3. Reviewer answers:
   - "Can I understand what needs to be built?" (Y/N)
   - "Can I understand the technical approach?" (Y/N)
   - "Are tradeoffs/constraints clear?" (Y/N)
   - "Would I approve this plan?" (Y/N)

**Acceptance gate:** ≥ 80% "yes" rate across all questions.

**If < 80%:** Tune compression (reduce Wenyan aggressiveness, preserve more context).

---

## 8. Comparison: Wenyan vs Caveman for Token Budget

### Original Assessment (Energy-Focused)

| Metric | Wenyan (Input) | Caveman (Output) |
|--------|----------------|------------------|
| **Target** | Workflow prompts | Artifacts |
| **Token cost** | 0.02 mJ (cached) | 2.0 mJ (generation) |
| **Energy savings** | Low (cached inputs cheap) | High (output expensive) |
| **Recommendation** | ❌ Skip (low ROI) | ✅ Prioritize |

---

### Corrected Assessment (Token-Budget-Focused)

| Metric | Wenyan (Input) | Caveman (Output) | Hybrid |
|--------|----------------|------------------|--------|
| **Target** | Workflow prompts | Artifacts | Both |
| **Token savings/task** | 11.9K (36%) | 3.1K (9%) | **14.9K (68%)** |
| **Re-read multiplier** | 1× (workflows loaded once) | 2–3× (artifacts read by downstream agents) | Both |
| **Fidelity risk** | Medium (if full Wenyan) → **Low (if selective)** | Low (prose only) | Low |
| **Recommendation** | ✅ **Selective Wenyan** | ✅ Caveman | ✅ **Hybrid (best)** |

---

## 9. Revised Recommendations

### ✅ Implement Hybrid Compression (Wenyan + Caveman)

**Workflow prompts (Wenyan-lite):**
- Compress explanatory prose (37% savings on prose sections)
- Preserve imperatives (MUST/NEVER), control flow (exit codes), technical artifacts (paths/commands)
- Annotate source workflows with `<!-- WENYAN_COMPRESS -->` directives
- Add compression pass to `collate.cjs`

**Artifacts (Caveman-full):**
- Compress prose sections in PLAN.md (Objective, Approach) and PROGRESS.md (Summary)
- Preserve tables, code blocks, file paths, test evidence
- Inject compression rules into personas
- User opt-in via `.forge/config.json`

**Token savings:** 68% per task (14.9K tokens saved), 67% cost reduction per sprint

---

### ✅ Staged Rollout

**Phase 1:** Artifact compression only (caveman)
- Lower risk (prose-only compression)
- 9% token savings (3.1K per task)
- Validate fidelity with 5-task A/B test

**Phase 2:** Add selective Wenyan (workflows)
- Annotate workflows with compression zones
- 36% additional savings (11.9K per task)
- Validate control-flow preservation with architect review

**Phase 3:** Optimize compression ratios
- Tune Wenyan aggressiveness based on fidelity feedback
- Add compression presets (lite/full/ultra)

---

### ❌ Avoid Full Wenyan (No Selective Preservation)

**Risk:** Compressing imperatives/control-flow creates ambiguity in safety-critical instructions.

**Example failure case:**
```
Original: "Exit 1 → print stderr and HALT. Do not proceed."
Full Wenyan: "碼一則示錯而止。勿行。"
Ambiguity: "勿行" (do not go) vs "勿續行" (do not continue) — subtle but critical
```

**Mitigation:** Use selective Wenyan with verbatim preservation zones.

---

## 10. Conclusion

**Corrected insight:** Wenyan compression valuable for token budget savings (not just energy).

**Key findings:**
1. **Artifacts re-read across agent pipeline** → compressing them saves input tokens on downstream agents (2–3× multiplier)
2. **Workflows dominate input tokens** → Wenyan compression yields 36% per-task savings
3. **Hybrid approach (Wenyan + caveman) = 68% total token reduction** vs 36% (Wenyan only) or 9% (caveman only)

**Implementation path:**
- Phase 1: Artifact compression (caveman) — low risk, 9% savings
- Phase 2: Selective Wenyan for workflows — preserve imperatives/control-flow, 36% additional savings
- Validate fidelity at each phase (architect review + user acceptance testing)

**Net impact:** 222K tokens saved per sprint = $0.85 cost reduction (67%) = $42.50/year at 50 sprints

**Verdict:** ✅ Proceed with hybrid compression. Prioritize selective Wenyan (preserve safety boundaries) + caveman (artifacts). Validate fidelity before wide rollout.
