<!-- kb-doc-fragment: stack-checklist -->
# Substance — `architecture/stack-checklist`

**Output path:** `{kbFolder}/architecture/stack-checklist.md`

**Topic focus:** an actionable review checklist derived from the stack and
testing facts — the concrete gates a change in this codebase must pass (syntax
check, lint, test, build, type-check commands). Describe *what to verify before
a change is considered done*.

**Discovery input to read:** the `stack` and `testing` domain findings from
Phase 1 (build tool, linter, type checker, test runner, their commands).

**Required output:**
- Confidence header on line 1.
- A checklist of verification steps, each with its exact command.
- Ordered from cheapest (syntax) to most expensive (full suite/build).
- Derived strictly from stack + testing facts — no invented tooling.

**Not applicable:** if no verification tooling exists, write: `No verification
tooling detected — no automated checklist can be derived.` and set confidence low.
