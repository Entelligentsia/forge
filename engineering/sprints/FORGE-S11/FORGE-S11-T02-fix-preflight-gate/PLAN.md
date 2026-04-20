# FORGE-S11-T02: Fix preflight-gate: wrong gate selection + ReferenceError crash

## Status: plan-approved

## Summary

Fix two bugs in `forge/tools/preflight-gate.cjs`:

1. **Bug #58 — Wrong gate selection**: `loadWorkflowMarkdown(phaseName)` scans all
   workflow `.md` files in alphabetical order and returns the first file that contains
   a `gates phase=<phaseName>` block. If multiple workflow files declare the same
   phase gate (e.g. both `fix_bug.md` and `implement_plan.md` have
   `` ```gates phase=implement ``), the alphabetically-first file wins — not the
   caller's intended workflow. The fix: accept an optional `--workflow <name>` CLI
   argument and prefer an exact filename match when provided.

2. **Bug #59 — ReferenceError TDZ crash**: `VERDICT_ARTIFACTS` is declared with
   `const` at line 221 (after the `if (require.main === module)` block). The
   `resolveVerdictSources()` function (a hoisted `function` declaration at line 228)
   references `VERDICT_ARTIFACTS` internally. When the CLI shim calls
   `resolveVerdictSources()` at line 174 (inside the if block, before line 221 is
   reached in module evaluation), `VERDICT_ARTIFACTS` is in the Temporal Dead Zone
   and throws `ReferenceError`. Fix: move `VERDICT_ARTIFACTS` above the
   `if (require.main === module)` block — or above `module.exports` — so it is
   initialized before any CLI code runs.

---

## Root Cause Analysis

### Bug #58

`loadWorkflowMarkdown` at line 198:
```js
function loadWorkflowMarkdown(phaseName) {
  const workflowsDir = path.resolve(process.cwd(), '.forge/workflows');
  let entries;
  try {
    entries = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.md'));
  } catch (_) { return null; }
  const fencePattern = new RegExp('^```gates\\s+phase=' + escapeRegex(phaseName) + '\\s*$', 'm');
  for (const entry of entries) {
    const md = fs.readFileSync(path.join(workflowsDir, entry), 'utf8');
    if (fencePattern.test(md)) return md;
  }
  return null;
}
```
`fs.readdirSync` returns entries in filesystem order (typically alphabetical on Linux
ext4). The first matching file wins. No way to prefer a specific workflow file.

### Bug #59

Module evaluation order (runtime execution, not hoisting):
1. `const fs`, `const path`, `const { parseVerdict }` — lines 11–13
2. All `function` declarations hoisted to top of module scope
3. `module.exports = { preflight }` — line 113
4. `if (require.main === module) { ... }` — lines 117–181 **← executes NOW**
   - Line 174: `resolveVerdictSources(gates[args.phase].after || [], ...)` runs
   - Inside `resolveVerdictSources`: `const filename = VERDICT_ARTIFACTS[entry.phase]`
   - `VERDICT_ARTIFACTS` is still in TDZ → **ReferenceError**
5. `const VERDICT_ARTIFACTS = { ... }` — line 221 ← **too late**

---

## Fix Plan

### Fix 1 — Move `VERDICT_ARTIFACTS` above `module.exports`

Move the `const VERDICT_ARTIFACTS` declaration (and `resolveVerdictSources`) to
before `module.exports = { preflight }`. This ensures it is initialized before the
CLI shim block executes.

### Fix 2 — Add `--workflow` argument to CLI shim; prefer exact match in `loadWorkflowMarkdown`

- Parse `--workflow <name>` from CLI args (basename with or without `.md` extension).
- Pass `workflowName` to `loadWorkflowMarkdown(phaseName, workflowName)`.
- In `loadWorkflowMarkdown`, if `workflowName` is provided, check that file first
  and return it if it contains the requested phase's gates block. Only fall back to
  full scan if the named workflow doesn't have the block.

---

## Test Plan (TDD — write failing test first)

### Test A — Bug #58 regression (wrong gate selection)

Create a temp `.forge/workflows/` with two files:
- `aaa_first.md` (sorts before `implement_plan.md`) with `` ```gates phase=implement ``
  containing `forbid task.status == wrong`
- `implement_plan.md` with `` ```gates phase=implement `` containing
  `require task.status in [correct]`

Call CLI shim with `--phase implement --task T1 --workflow implement_plan.md`.
Expect: gate from `implement_plan.md` is used (not `aaa_first.md`).
Without the fix, the alphabetically-first `aaa_first.md` wins — wrong gate.

### Test B — Bug #59 regression (TDZ crash)

Create a temp `.forge/workflows/` with a workflow containing:
```
```gates phase=implement
after review-plan = approved
```
```
And a fake store with a real task record (so `resolveVerdictSources` actually
iterates the `afterList` and tries to access `VERDICT_ARTIFACTS`).

Call CLI shim with `--phase implement --task <taskId>`.
Expect: exits with code 0 or 1 (not a crash/uncaught ReferenceError on stderr).
Without the fix, the process crashes with `ReferenceError: Cannot access 'VERDICT_ARTIFACTS' before initialization`.

---

## Files Changed

| File | Change |
|------|--------|
| `forge/tools/preflight-gate.cjs` | Move `VERDICT_ARTIFACTS` above `module.exports`; add `--workflow` arg; update `loadWorkflowMarkdown` signature |
| `forge/tools/__tests__/preflight-gate.test.cjs` | Add two regression tests (A and B above) |

## Acceptance Criteria Checklist

- [ ] Gate resolution uses the explicitly passed `--workflow` name; alphabetical ordering cannot override it.
- [ ] `implement` phase gate with `after review-plan` evaluates without crash.
- [ ] Returns exit code 0 (pass), 1 (fail), or 2 (misconfigured) — never throws.
- [ ] All 504 existing tests pass after changes.
- [ ] Two new regression tests added (one per bug).
- [ ] `node --check forge/tools/preflight-gate.cjs` exits 0.
