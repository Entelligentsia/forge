# EXP-001: Caveman Hybrid Compression — Token Savings Experiment

**Date:** 2026-04-22  
**Status:** Planned  
**Goal:** Validate hybrid compression (Wenyan + caveman) token savings vs traditional Forge

---

## Hypothesis

Hybrid compression (selective Wenyan for workflows + caveman for artifacts) reduces token consumption by 60–70% without losing technical fidelity.

**Predicted outcomes:**
- Baseline (traditional): ~33K tokens per task (plan + implement + review)
- Compressed (hybrid): ~10–13K tokens per task
- **Savings:** 20K tokens/task (60–70% reduction)

---

## Experiment Design

### Subject: HELLO-S01 Sprint from forge-testbench

**Why this sprint:**
- ✅ Already completed with traditional Forge (baseline exists)
- ✅ Small scope (2 tasks: add `--goodbye` flag + tests)
- ✅ Full artifact set (PLAN.md, PROGRESS.md, reviews, approvals)
- ✅ Simple Python CLI — low domain complexity, easy to validate fidelity

**Current baseline metrics:**
- Total words (all artifacts): 5,272
- Estimated tokens: ~7,000 (words × 1.33)
- **Token telemetry missing:** COST_REPORT.md empty, no usage sidecars in `.forge/store/events/`

**Root cause:** Workflows have "If `/cost` is unavailable, skip silently" fallback. Agents skipped token reporting (either `/cost` unavailable or agent didn't execute step).

**Tasks to re-run:**
- HELLO-S01-T01: Add `--goodbye` flag to CLI (M estimate, ~1hr)
- HELLO-S01-T02: Add test coverage for `--goodbye` (L estimate, ~2hr)

---

## Methodology

### Phase 1: Capture True Baseline (Week 1)

**Problem:** Current testbench run has no token telemetry. Root causes:
1. Workflows have "skip silently" fallback for missing `/cost` command
2. Agents may have skipped token reporting steps (not enforced)
3. No validation that sidecars were written (orchestrator doesn't verify)

**Solution:** Re-run HELLO-S01 with **uncompressed Forge** + mandatory token reporting (no skip fallback).

#### Steps:

1. **Clone fresh testbench:**
   ```bash
   cd /home/boni/src
   git clone https://github.com/Entelligentsia/forge-testbench.git forge-testbench-baseline
   cd forge-testbench-baseline/hello
   ```

2. **Initialize with traditional Forge:**
   ```bash
   /forge:init --fast
   ```

3. **Run sprint with token capture:**
   ```bash
   /hello:sprint-intake
   # Capture requirements for HELLO-S01 (--goodbye flag)
   
   /hello:sprint-plan HELLO-S01
   # Break into tasks (T01: add flag, T02: tests)
   
   /hello:run-task HELLO-S01-T01
   # Full pipeline: plan → implement → review → approve → commit
   # After each agent completes, run `/cost` and record output
   
   /hello:run-task HELLO-S01-T02
   # Same token capture process
   ```

4. **Extract baseline metrics:**
   - Total input tokens (all agents)
   - Total output tokens (all agents)
   - Token breakdown by phase (plan / implement / review / approve)
   - Artifact sizes (PLAN.md, PROGRESS.md, reviews)

5. **Document baseline:**
   ```bash
   # Copy COST_REPORT.md and all artifacts to:
   docs/experiments/EXP-001/baseline/
   ```

**Expected baseline:**
- Input tokens: ~25–30K (workflows + architecture + artifact re-reads)
- Output tokens: ~2–3K (PLAN/PROGRESS/reviews)
- **Total:** ~30–35K tokens per sprint (2 tasks)

---

### Phase 2: Implement Compression (Week 2)

#### 2A. Add Compression Infrastructure to Forge

**Deliverables:**

1. **Config schema update:**
   ```json
   // .forge/config.json
   {
     "workflowCompression": "none",  // Options: "none" | "wenyan-lite" | "wenyan-full"
     "outputMode": "full",           // Options: "full" | "caveman-lite" | "caveman-full"
     ...
   }
   ```

2. **Workflow annotation (meta sources):**
   ```markdown
   <!-- WENYAN_COMPRESS_START -->
   The Engineer reads the task prompt, which is the source of truth for requirements.
   <!-- WENYAN_COMPRESS_END -->
   
   **YOU MUST read the approved PLAN.md.** (preserved verbatim)
   ```

3. **Compression tool:**
   - Create `forge/tools/compress-wenyan.cjs`
   - Input: Markdown with `<!-- WENYAN_COMPRESS -->` zones
   - Output: Prose sections compressed to classical Chinese, imperatives preserved
   - Use Claude API with prompt: "Compress this prose to classical Chinese (Wenyan). Preserve technical terms, file paths, commands verbatim."

4. **Collate integration:**
   ```javascript
   // forge/tools/collate.cjs
   if (config.workflowCompression !== 'none') {
     workflowContent = applyWenyanCompression(workflowContent);
   }
   ```

5. **Persona caveman injection:**
   ```javascript
   // forge/tools/collate.cjs (persona generation)
   if (config.outputMode.startsWith('caveman-')) {
     personaContent += CAVEMAN_RULES_APPENDIX;
   }
   ```

**Test infrastructure changes:**
- Add tests for `compress-wenyan.cjs` (input/output pairs)
- Add `node --check` validation for all new scripts
- Update `forge/.claude-plugin/plugin.json` version (e.g., 1.13.0)
- Add migration entry to `forge/migrations.json`

---

#### 2B. Annotate Forge Meta Workflows

**Target workflows for Wenyan:**
- `meta-plan-task.md` — compress explanatory prose, preserve gate checks
- `meta-implement.md` — compress prose, preserve hook discipline / syntax checks
- `meta-review-plan.md` / `meta-review-code.md` — compress prose, preserve verdict logic

**Annotation strategy:**
- Wrap prose in `<!-- WENYAN_COMPRESS_START/END -->`
- Preserve verbatim:
  - Lines with `MUST`, `NEVER`, `HALT`
  - Exit code instructions (`Exit 1 → HALT`)
  - Code blocks (bash commands, JSON schemas)
  - File paths
  - Safety warnings

**Example (meta-implement.md):**
```markdown
## Step 1 — Load Context

<!-- WENYAN_COMPRESS_START -->
The Engineer reads the task prompt, which is the source of truth for requirements.
Architecture context is injected into your prompt under the "Architecture context" 
heading. If no summary was injected, read `engineering/architecture/stack.md` directly.
<!-- WENYAN_COMPRESS_END -->

**YOU MUST read the approved PLAN.md.** This is your specification. Follow it exactly.

<!-- WENYAN_COMPRESS_START -->
If the plan references specific files, read them before modifying.
<!-- WENYAN_COMPRESS_END -->
```

**Expected compression:**
```markdown
## Step 1 — Load Context

工讀任務令(需求真源)。建構文脈注於提示"Architecture context"標下。無摘要則讀 `engineering/architecture/stack.md`。

**YOU MUST read the approved PLAN.md.** This is your specification. Follow it exactly.

計畫引特定檔則先讀再修。
```

**Token savings estimate:** ~37% on prose sections → ~25% overall workflow reduction (accounting for preserved zones)

---

#### 2C. Add Caveman Rules to Personas

**Target personas:**
- `meta-engineer.md` — generates PLAN.md and PROGRESS.md
- `meta-architect.md` — generates reviews

**Append to persona (when `outputMode: "caveman-full"`):**
```markdown
---

## Output Compression — Caveman Mode Active

When generating PLAN.md, PROGRESS.md, or review artifacts:

**Compress prose:**
- Drop articles (a/an/the), filler (just/actually/basically)
- Fragments OK ("Bug fixed" not "The bug has been fixed")
- Short synonyms (use → not "make use of", fix → not "implement a solution for")
- Diagnostic prose: "Problem: X. Fix: Y." (not "The current problem is that X...")

**Preserve verbatim:**
- Code blocks (bash, JSON, Python)
- File paths (exact paths for navigation)
- Tables (already dense)
- Test evidence (literal tool output)
- Technical terms (function names, click decorators, pytest commands)

**Example transformations:**

| Before | After |
|--------|-------|
| "Add a `--goodbye` boolean flag to the hello CLI that changes..." | "Add `--goodbye` flag. Changes greeting: Hello → Goodbye." |
| "The implementation follows the approved plan exactly." | "Implementation follows approved plan." |
| "All syntax checks have passed successfully." | "Syntax checks pass." |
```

**Token savings estimate:** ~60% on prose sections in artifacts

---

### Phase 3: Run Compressed Experiment (Week 3)

#### Steps:

1. **Clone fresh testbench (compressed variant):**
   ```bash
   cd /home/boni/src
   git clone https://github.com/Entelligentsia/forge-testbench.git forge-testbench-compressed
   cd forge-testbench-compressed/hello
   ```

2. **Initialize with compressed Forge:**
   ```bash
   /forge:init --fast
   ```

3. **Enable compression:**
   ```bash
   /hello:config set workflowCompression wenyan-lite
   /hello:config set outputMode caveman-full
   ```

4. **Regenerate workflows/personas:**
   ```bash
   /hello:collate --regenerate workflows personas
   ```

5. **Run same sprint with token capture:**
   ```bash
   /hello:sprint-intake
   # Same requirements as baseline (--goodbye flag)
   
   /hello:sprint-plan HELLO-S01
   
   /hello:run-task HELLO-S01-T01
   # After each agent: `/cost` and record
   
   /hello:run-task HELLO-S01-T02
   ```

6. **Extract compressed metrics:**
   - Total input tokens (workflows + architecture + artifacts)
   - Total output tokens (compressed PLAN/PROGRESS/reviews)
   - Artifact sizes (compare word counts to baseline)

7. **Document compressed results:**
   ```bash
   # Copy to:
   docs/experiments/EXP-001/compressed/
   ```

---

### Phase 4: Fidelity Validation (Week 3)

**Goal:** Verify compressed artifacts preserve technical intent.

#### 4A. Automated Checks

```bash
# Technical artifact preservation
diff baseline/HELLO-S01-T01/PLAN.md compressed/HELLO-S01-T01/PLAN.md | grep -E '(hello\.py|--goodbye|click\.option)'
# Expect: All technical terms identical

# Code block preservation
grep -c '```' baseline/HELLO-S01-T01/PLAN.md
grep -c '```' compressed/HELLO-S01-T01/PLAN.md
# Expect: Same count

# Table preservation
grep -c '^|' baseline/HELLO-S01-T01/PLAN.md
grep -c '^|' compressed/HELLO-S01-T01/PLAN.md
# Expect: Same count
```

#### 4B. Human Review (Architect Blind Evaluation)

**Protocol:**
1. Give architect both PLAN.md versions (baseline + compressed) **without labels**
2. Ask:
   - "Which plan is clearer?" (A or B or equal)
   - "Can you implement the feature from plan A?" (Y/N)
   - "Can you implement the feature from plan B?" (Y/N)
   - "Rate plan A fidelity (1–5)" (1=missing details, 5=complete)
   - "Rate plan B fidelity (1–5)"

**Acceptance criteria:**
- Both plans rated ≥ 4 on fidelity
- Both plans implementable (Y/Y)
- Clarity rating: compressed ≥ baseline (shorter acceptable if equally clear)

#### 4C. Regression Check

**Test:** Can compressed artifacts drive successful implementation?

**Method:**
1. Take compressed PLAN.md for T01
2. Give to fresh agent (no context from compression experiment)
3. Ask agent to implement `--goodbye` flag
4. Verify:
   - Implementation matches requirements
   - Code compiles (Python syntax check)
   - Manual test pass (hello Alice --goodbye)

**Acceptance:** Implementation succeeds without clarification requests from agent.

---

## Success Metrics

### Primary Metric: Token Savings

| Metric | Baseline | Compressed | Target Savings |
|--------|----------|------------|----------------|
| **Input tokens/task** | ~15K | ~5K | ≥ 60% |
| **Output tokens/task** | ~1.2K | ~480 | ≥ 60% |
| **Total tokens/task** | ~16.2K | ~5.5K | ≥ 65% |
| **Sprint total (2 tasks)** | ~32.4K | ~11K | ≥ 65% |

**Hard requirement:** Total savings ≥ 60%. If < 60%, tune compression aggressiveness.

---

### Secondary Metric: Fidelity Preservation

| Check | Acceptance Criteria |
|-------|---------------------|
| **Automated checks** | Technical terms 100% preserved, code blocks identical, tables identical |
| **Architect review** | Both plans rated ≥ 4/5 fidelity |
| **Regression test** | Fresh agent implements successfully from compressed plan |
| **Clarification rate** | Agent asks ≤ 1 clarifying question during implementation |

**Hard requirement:** All fidelity checks pass. If any fail, rollback compression level.

---

## Data Collection Template

### Baseline Run

```yaml
sprint: HELLO-S01
tasks: [HELLO-S01-T01, HELLO-S01-T02]
compression: none

task_HELLO-S01-T01:
  phases:
    plan:
      input_tokens: <from /cost>
      output_tokens: <from /cost>
      cached_tokens: <from /cost>
    implement:
      input_tokens: <from /cost>
      output_tokens: <from /cost>
      cached_tokens: <from /cost>
    review:
      input_tokens: <from /cost>
      output_tokens: <from /cost>
      cached_tokens: <from /cost>
    approve:
      input_tokens: <from /cost>
      output_tokens: <from /cost>
      cached_tokens: <from /cost>
  artifacts:
    PLAN.md:
      words: <wc -w>
      tokens_est: <words × 1.33>
    PROGRESS.md:
      words: <wc -w>
      tokens_est: <words × 1.33>
  total_input: <sum all phases>
  total_output: <sum all phases>
  total_tokens: <input + output>

task_HELLO-S01-T02:
  # Same structure

sprint_total:
  input_tokens: <sum both tasks>
  output_tokens: <sum both tasks>
  total_tokens: <input + output>
  cost_usd: <from /cost>
```

### Compressed Run

Same YAML structure, with `compression: hybrid (wenyan-lite + caveman-full)`

---

## Analysis Plan

### Token Savings Breakdown

**Calculate for each task:**
- `savings_input = (baseline_input - compressed_input) / baseline_input × 100%`
- `savings_output = (baseline_output - compressed_output) / baseline_output × 100%`
- `savings_total = (baseline_total - compressed_total) / baseline_total × 100%`

**Drill down by phase:**
- Which phase saves most tokens? (plan / implement / review)
- Where does compression help most? (workflow prompts / artifact re-reads)

**Artifact-level analysis:**
- PLAN.md word count reduction
- PROGRESS.md word count reduction
- Review artifact word count reduction

---

### Fidelity Analysis

**Quantitative:**
- Technical term preservation rate (grep for function names, file paths, commands)
- Code block preservation (diff compressed vs baseline)
- Table preservation (row/column counts)

**Qualitative:**
- Architect fidelity ratings (1–5 scale)
- Implementation success rate (fresh agent test)
- Clarity preference (A vs B blind test)

---

### ROI Calculation

**Token savings per sprint:**
- `savings_tokens = baseline_total - compressed_total`
- `savings_cost = savings_tokens × ($3/M input + $15/M output weighted avg)`

**Annual projection (50 sprints):**
- `annual_savings_tokens = savings_tokens × 50`
- `annual_savings_cost = savings_cost × 50`

**Cost-benefit:**
- Implementation effort: ~2 weeks (compression tool + annotation + testing)
- Ongoing maintenance: ~1 hr/sprint (validate compression fidelity)
- Break-even: If savings ≥ $0.50/sprint → payback after 40 sprints

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Wenyan compression loses control-flow semantics** | Med | High | Selective annotation — preserve imperatives verbatim |
| **Caveman artifacts ambiguous for QA** | Med | Med | Architect review gate — tune if fidelity < 4/5 |
| **Compression tool buggy (malformed Wenyan)** | Low | High | Unit tests + manual validation of first 5 workflows |
| **Testbench sprint too simple to validate** | Low | Low | If results inconclusive, repeat with FORGE-S07 (more complex) |
| **Baseline token data missing** | High | Med | **Mitigation: Re-run baseline with token capture (Phase 1)** |

---

## Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| **1** | Baseline capture | Fresh testbench run, token telemetry, baseline docs |
| **2** | Compression implementation | Config schema, Wenyan tool, collate integration, persona rules |
| **3** | Compressed run + validation | Fresh testbench compressed run, token telemetry, fidelity checks |
| **4** | Analysis + report | Token savings breakdown, fidelity analysis, ROI calculation, recommendations |

**Total:** 4 weeks (1 sprint cycle)

---

## Deliverables

1. **Baseline dataset:**
   - `docs/experiments/EXP-001/baseline/` — all artifacts + token telemetry
   - `docs/experiments/EXP-001/baseline/METRICS.yaml` — structured token data

2. **Compressed dataset:**
   - `docs/experiments/EXP-001/compressed/` — all artifacts + token telemetry
   - `docs/experiments/EXP-001/compressed/METRICS.yaml` — structured token data

3. **Comparison report:**
   - `docs/experiments/EXP-001/RESULTS.md` — token savings, fidelity validation, ROI
   - `docs/experiments/EXP-001/RECOMMENDATIONS.md` — ship/tune/abort decision

4. **Compression tooling (if experiment succeeds):**
   - `forge/tools/compress-wenyan.cjs` + tests
   - `forge/tools/collate.cjs` updates (compression integration)
   - `forge/.claude-plugin/plugin.json` version bump
   - `forge/migrations.json` entry

---

## Decision Gates

### Gate 1: After Baseline Capture (End of Week 1)

**Question:** Is baseline token usage within expected range (30–35K per sprint)?

- **If yes:** Proceed to Phase 2 (compression implementation)
- **If no (too low):** Testbench sprint may be too simple. Consider using FORGE-S07 (store-custodian) as subject instead.
- **If no (too high):** Investigate why baseline exceeds projections. Optimize traditional Forge first before testing compression.

---

### Gate 2: After Compressed Run (End of Week 3)

**Question:** Did hybrid compression achieve ≥ 60% token savings?

- **If yes:** Proceed to fidelity validation
- **If no (50–59%):** Tune compression (increase Wenyan aggressiveness, expand caveman zones). Re-run compressed variant.
- **If no (< 50%):** Compression ineffective. Investigate: Are workflows already cached? Are artifacts too small?

---

### Gate 3: After Fidelity Validation (End of Week 3)

**Question:** Did compressed artifacts pass all fidelity checks?

- **If yes:** Proceed to final analysis and ship recommendation
- **If no (automated checks failed):** Bug in compression tool. Fix and re-run compressed variant.
- **If no (architect review < 4/5):** Compression too aggressive. Tune (reduce Wenyan zones, preserve more prose). Re-run fidelity validation.
- **If no (regression test failed):** Critical fidelity loss. Abort compression for that artifact type (e.g., preserve PLAN.md uncompressed, compress only PROGRESS.md).

---

### Gate 4: Final Decision (End of Week 4)

**Ship criteria (all must pass):**
1. ✅ Token savings ≥ 60%
2. ✅ Fidelity rating ≥ 4/5 (architect review)
3. ✅ Regression test passes (fresh agent implements successfully)
4. ✅ ROI positive (savings ≥ $0.50/sprint)

**If all pass:** Ship compression as opt-in feature (`workflowCompression` + `outputMode` config)

**If any fail:** Document findings, recommend tuning or alternate approach (e.g., caveman-only, no Wenyan)

---

## Success Criteria Summary

**Experiment succeeds if:**
- Token savings ≥ 60% (primary metric)
- All fidelity checks pass (secondary metric)
- ROI positive (cost-benefit analysis)

**Experiment fails if:**
- Token savings < 50%
- Fidelity rating < 4/5
- Fresh agent cannot implement from compressed plan

**Partial success (tune and retry):**
- Token savings 50–59% → increase compression aggressiveness
- Fidelity rating 3.5–4.0 → reduce compression aggressiveness
- One artifact type fails fidelity → compress others, preserve that one

---

## Next Steps

1. **Schedule experiment:** Assign 4-week window in Forge roadmap
2. **Baseline capture:** Re-run HELLO-S01 in fresh testbench with token telemetry
3. **Compression implementation:** Build `compress-wenyan.cjs` and annotate meta workflows
4. **Run compressed variant:** Execute HELLO-S01 with hybrid compression
5. **Validate and report:** Fidelity checks + token savings analysis + ship decision
