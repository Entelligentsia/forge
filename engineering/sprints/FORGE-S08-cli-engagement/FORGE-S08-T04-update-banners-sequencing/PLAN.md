# PLAN — FORGE-S08-T04: Update step banners and explicit sequencing

**Task:** FORGE-S08-T04
**Sprint:** FORGE-S08
**Estimate:** S
**Depends on:** FORGE-S08-T03

---

## Objective

Give `/forge:update` the same structural clarity as init will have after T01. Add
a step banner at the start of each step so users always know where they are in the
6-step update flow. Make the Step 4 regeneration order explicit so it is
unambiguous which targets can run in parallel vs. which must be sequenced.

## Approach

Single file change: `forge/commands/update.md`. At the start of each step section,
add an instruction to emit a banner. In Step 4, add an explicit sequencing table
before the regeneration loop.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/commands/update.md` | Add step banner emit at the start of each step; add sequencing table to Step 4 | Structural clarity, consistent with T01 format |

## Plugin Impact Assessment

- **Version bump required?** Yes — deferred to T06.
- **Migration entry required?** Yes — deferred to T06.
- **Security scan required?** Yes — deferred to T06.
- **Schema change?** No.

## Detailed Changes

### 1. Progress Output Format section

Insert a "Progress Output Format" section near the top of `update.md` (after the
`## Locate plugin root` section, before Step 1):

```markdown
## Progress Output Format

At the start of each step, emit a banner using this format:

```
━━━ Step N/6 — <Step Name> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
```

### 2. Step banners

Add an emit instruction at the top of each step section:

| Step | Banner text |
|------|------------|
| Step 1 | `━━━ Step 1/6 — Check for updates ━━━━━━━━━━━━━━━━━━━━━━━━━━━` |
| Step 2A | `━━━ Step 2/6 — Plugin update available ━━━━━━━━━━━━━━━━━━━━━━` |
| Step 2B | `━━━ Step 2/6 — Apply project migrations ━━━━━━━━━━━━━━━━━━━━━` |
| Step 3 | `━━━ Step 3/6 — Verify installation ━━━━━━━━━━━━━━━━━━━━━━━━━━` |
| Step 4 | `━━━ Step 4/6 — Apply migrations ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` |
| Step 5 | `━━━ Step 5/6 — Pipeline audit ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` |
| Step 6 | `━━━ Step 6/6 — Record state ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` |

The banner is emitted immediately when the step is entered — before any tool calls
or sub-steps run.

### 3. Step 4 — Explicit sequencing table

At the start of the "For each category in the aggregated result" loop, add:

```markdown
### Regeneration order

Execute regeneration targets in this order:

| Order | Target | Can run after |
|-------|--------|---------------|
| 1 | `tools` | — (independent) |
| 2 | `workflows` | — (independent) |
| 3 | `templates` | — (independent) |
| 4 | `personas` | — (independent) |
| 5 | `commands` | Must run after `workflows` |
| 6 | `knowledge-base` sub-targets | — (independent) |

`commands` depends on `workflows` because command wrappers reference workflow
filenames. All other targets are independent and could run in parallel, but
are executed sequentially here to keep the output readable.

Only execute targets that appear in the aggregated result — skip absent ones.
```

## Testing Strategy

- Run `/forge:update` with a version bump pending — verify step banners appear at
  each step boundary
- Run an update that requires `workflows` + `commands` regeneration — verify
  workflows is completed before commands starts

## Acceptance Criteria

- [ ] `forge/commands/update.md` contains a "Progress Output Format" section defining the `━━━ Step N/6` banner format
- [ ] Each of Steps 1, 2A, 2B, 3, 4, 5, 6 has an emit instruction for its banner
- [ ] Step 4 contains a sequencing table listing the correct order of regeneration targets
- [ ] The sequencing table notes that `commands` must follow `workflows`
- [ ] The table notes that only targets present in the aggregated result are executed
