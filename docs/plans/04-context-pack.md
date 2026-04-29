# Plan 4 — Architecture Context Pack

**Category:** Token Economy + Speed
**Target version:** patch bump after Plan 2 ships
**Estimated effort:** 2–3 engineer days
**Breaking:** No (cache file; delete to revert)

---

## 1. Problem

Every phase workflow independently reads `engineering/architecture/stack.md`
and related domain docs. `meta-plan-task.md:26`, `meta-implement.md:25`,
`meta-review-plan.md:31`, `meta-review-implementation.md:29` all re-read the
same files. In a 6-phase task with 2 revisions, architecture docs are read
12+ times per task — 120+ times across a 10-task sprint. Most reads pull the
full doc into the subagent's context; most phases only need the high-level
summary.

## 2. Goal

Build a compact, pre-computed `context-pack.md` summarizing the architecture
knowledge base. Inject the pack summary into subagent prompts instead of
requiring each phase to re-read full docs. Subagents retain the ability to
read full architecture files on demand.

## 3. Scope

**In scope:**
- `build-context-pack.cjs` that walks `engineering/architecture/` and emits
  `.forge/cache/context-pack.md` and `.forge/cache/context-pack.json` (index)
- Pack summary injection into orchestrator-composed subagent prompts
- Rebuild triggers: `/forge:regenerate`, `/forge:collate`, `/forge:materialize`
- `/forge:health` staleness detection via hash comparison

**Out of scope:**
- Summarizing anything outside `engineering/architecture/`
- Automatic re-summarization when a doc changes (manual rebuild via
  `/forge:regenerate` or `/forge:collate` is sufficient)
- Multi-tier summaries (only one pack, one summary depth)

## 4. Files to touch

| File | Change |
|---|---|
| `forge/tools/build-context-pack.cjs` | **NEW** |
| `forge/tools/__tests__/build-context-pack.test.cjs` | **NEW** |
| `forge/commands/regenerate.md` | Invoke pack builder |
| `forge/commands/collate.md` | Invoke pack builder after KB updates |
| `forge/commands/materialize.md` | Invoke pack builder |
| `forge/commands/health.md` | Check pack freshness |
| `forge/meta/workflows/meta-orchestrate.md` | Inject pack summary into subagent prompts |
| `forge/meta/workflows/meta-fix-bug.md` | Same |
| Phase workflows (`meta-plan-task.md`, `meta-implement.md`, `meta-review-plan.md`, `meta-review-implementation.md`) | Replace "read stack.md" instruction with "consult context-pack summary injected in your prompt; read full doc only if deeper context needed" |
| `forge/migrations.json`, `CHANGELOG.md`, `forge/integrity.json`, `forge/commands/health.md` | Standard release checklist |

## 5. Pack format

`.forge/cache/context-pack.md`:

```markdown
# Architecture Context Pack

Built: 2026-04-19T14:22:03Z
Source hash: sha256:abc123…

## Key components

- **Forge plugin source (forge/)**: meta-definitions, hooks, tools, commands,
  schemas. Users install this directory via /plugin install.
- **Forge dogfooding instance (.forge/)**: generated output; do not edit directly.
- **Engineering KB (engineering/)**: sprint artifacts for this project.

## Key patterns

- Symmetric injection: persona + skill + workflow combined in every subagent spawn.
- Phase gating: declarative gates enforced by preflight-gate.cjs before each spawn.
- Artifact summaries: phases emit sidecar summaries cached on task record.

## Key constraints

- Schema changes to forge/schemas/ require migration entry + concepts diagram check.
- Version bumps require: tests pass, migration entry, CHANGELOG, integrity regen, security scan.
- Never edit .forge/ or engineering/ when fixing plugin bugs.

## File index

- engineering/architecture/stack.md — full technical stack (N lines)
- engineering/architecture/conventions.md — coding conventions (N lines)
- …
```

`.forge/cache/context-pack.json` (machine-readable index):

```json
{
  "version": 1,
  "built_at": "2026-04-19T14:22:03Z",
  "source_hash": "sha256:…",
  "sources": [
    { "path": "engineering/architecture/stack.md", "size": 12345, "mtime": "…" }
  ],
  "summary_path": ".forge/cache/context-pack.md"
}
```

## 6. Builder algorithm

`build-context-pack.cjs`:

1. Resolve `engineering/architecture/` (configurable for migrations).
2. Read every `*.md` file; skip `*.draft.md`.
3. For each doc, extract: H1 title, first paragraph after the H1, any
   `## Key` or `## Summary` sections (if present).
4. Compose `context-pack.md` with the extracted snippets, organized by
   the conventional sections (Key components / patterns / constraints).
5. Compute `source_hash` over sorted `(path, size, mtime)` tuples.
6. Write `context-pack.md` and `context-pack.json` atomically (tmp + rename).

**Pure transformation:** no network, no writes outside `.forge/cache/`.

**Extraction heuristics are simple and deterministic.** The pack is a
best-effort summary; the full docs remain authoritative.

## 7. Prompt injection

`meta-orchestrate.md` and `meta-fix-bug.md` phase-prompt composers gain:

```
Architecture context (summary — full docs available at paths listed below):

{contents of .forge/cache/context-pack.md, inlined}

Read full architecture docs only if the summary above is insufficient for
your decision. Full docs:
{list of paths from context-pack.json sources[]}
```

**Pack size cap:** if `context-pack.md` exceeds 400 lines, builder warns and
truncates with a clear marker. Signals that the architecture KB has grown
beyond what a summary can hold — triage action, not silent bloat.

## 8. Staleness detection (`/forge:health`)

Add to `health.md` check sequence:

```
Compute current source_hash over engineering/architecture/*.md.
Read .forge/cache/context-pack.json.
If current != stored: emit WARN "Context pack stale. Run /forge:regenerate or /forge:collate to rebuild."
```

## 9. Tests (write failing first)

- Builder reads a fixture architecture directory, emits pack with expected
  sections.
- Missing `engineering/architecture/` directory → builder exits with clear
  error, not a crash.
- `source_hash` is deterministic across runs on identical inputs.
- `source_hash` changes when any source file is modified.
- Pack exceeding 400 lines is truncated with a marker line.
- Atomic write: simulated mid-write failure leaves prior pack intact.
- `/forge:health` integration test detects stale pack (mutate source, don't
  rebuild, expect WARN).

## 10. Rollout

1. Ship after Plan 2 to benefit from the cleaner summary-aware prompts.
2. On first upgrade, `/forge:update` migration entry lists
   `regenerate: ["context-pack"]` so users rebuild once.
3. Reference-sprint measurement: architecture doc reads per task should drop
   from ~12 to ~1 (orchestrator only). Record in retrospective.

## 11. Risks & rollback

| Risk | Mitigation |
|---|---|
| Summary loses load-bearing detail | Full docs are one `Read` away; prompt explicitly instructs escalation. Reviewer personas can flag missing context during code review. |
| Extraction heuristics produce noisy summary | Heuristics are simple and documented. Users can hand-edit `context-pack.md` and flag it as manually maintained via a frontmatter `manual: true` — builder skips if set. |
| Stale pack used silently | `/forge:health` WARN surfaces the staleness; orchestrator does NOT block on it (warning only — avoids halting work on a cache quirk). |

**Full rollback:** delete `.forge/cache/context-pack.*` and revert the
prompt-injection edits in the two orchestrator workflows. Builder tool and
tests can remain — unreferenced if not called.

## 12. Acceptance criteria

- [ ] Builder produces deterministic `context-pack.md` and `context-pack.json`.
- [ ] Orchestrator injects pack summary into all phase prompts.
- [ ] Phase workflows updated to consult pack summary first, read full docs on escalation.
- [ ] `/forge:health` detects staleness.
- [ ] Manual-override frontmatter (`manual: true`) respected.
- [ ] All new tests pass; all existing tests still pass.
- [ ] Reference-sprint measurement: `stack.md` reads per task drop from ~12 to ~1.

## 13. Out-of-band artifacts

- `forge/migrations.json`: `regenerate: ["context-pack"]`, `breaking: false`,
  `manual: ["Run /forge:regenerate to build the initial context pack."]`
- `CHANGELOG.md` entry.
- Security scan saved to `docs/security/scan-v{VERSION}.md`.

---

## 14. Cross-plan measurement (roll-up)

After Plans 1–4 all ship, run a reference 10-task sprint and compare against
a pre-Plan-1 baseline:

| Metric | Baseline | Target |
|---|---|---|
| Avg subagent prompt size | 100% | ≤65% |
| `stack.md` reads per task | ~12 | ~1 |
| `PLAN.md` reads per task | ~6 | ~2 |
| Silent phase-advance on missing PLAN.md | possible | impossible |
| Silent phase-advance on malformed verdict | possible | impossible |

Record findings in a retrospective post at `docs/decisions/`.
