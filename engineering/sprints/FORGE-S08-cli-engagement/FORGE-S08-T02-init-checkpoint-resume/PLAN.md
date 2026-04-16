# PLAN — FORGE-S08-T02: Init checkpoint and resume mechanism

**Task:** FORGE-S08-T02
**Sprint:** FORGE-S08
**Estimate:** M
**Depends on:** FORGE-S08-T01

---

## Objective

When `/forge:init` is interrupted at any phase, re-running it should detect the
interrupted state automatically and offer to resume from the next incomplete phase —
without requiring the user to remember or pass `--from <phase>`.

## Approach

**Checkpoint writes:** At the end of each phase in `sdlc-init.md`, write
`.forge/init-progress.json` with the last completed phase number.

**Resume detection:** At the top of `forge/commands/init.md`, before the pre-flight
plan, check for `.forge/init-progress.json`. If present, offer to resume rather
than showing the full pre-flight plan.

**Cleanup:** After Phase 9 (Smoke Test) completes successfully, delete
`.forge/init-progress.json` so the next `/forge:init` starts fresh.

The checkpoint file is simple JSON — no tool required, just a Write call.

## Files to Modify

| File | Change | Rationale |
|---|---|---|
| `forge/commands/init.md` | Add resume detection block before pre-flight plan | Entry point reads checkpoint and offers resume |
| `forge/init/sdlc-init.md` | Add checkpoint write at the end of each phase; delete checkpoint after Phase 9 | Checkpoint is written close to the actual phase work |

## Plugin Impact Assessment

- **Version bump required?** Yes — deferred to T06.
- **Migration entry required?** Yes — deferred to T06.
- **Security scan required?** Yes — deferred to T06.
- **Schema change?** No — `.forge/init-progress.json` is a transient scratch file, not a store entity.

## Detailed Changes

### 1. `forge/commands/init.md` — Resume detection block

Insert at the top of the `## Execute` section, before the pre-flight plan:

```markdown
## Resume Detection

Before showing the pre-flight plan, check for an existing checkpoint:

```sh
cat .forge/init-progress.json 2>/dev/null
```

If the file exists and contains a valid `lastPhase` number, emit:

```
〇 Previous init detected — last completed phase: {lastPhase}

Resume from Phase {lastPhase + 1}? [Y] Start over [n]
```

If the user chooses to resume: skip to Phase {lastPhase + 1} in sdlc-init.md.
If the user chooses to start over: delete `.forge/init-progress.json` and show
the pre-flight plan normally.

If the file does not exist, show the pre-flight plan normally.
```

### 2. `forge/init/sdlc-init.md` — Checkpoint writes

At the end of each phase (after the phase's work is confirmed complete), add:

```markdown
Write `.forge/init-progress.json`:
```json
{ "lastPhase": 1, "timestamp": "<ISO timestamp>" }
```
```

Use the Write tool. The `.forge/` directory is guaranteed to exist by Phase 1
(config.json is written there). For Phase 1, write after `config.json` is written.

At the end of Phase 9, after smoke test passes:

```markdown
Delete `.forge/init-progress.json` — init is complete.
Use the Bash tool: `rm -f .forge/init-progress.json`
```

### 3. Checkpoint file format

```json
{
  "lastPhase": 5,
  "timestamp": "2026-04-15T10:30:00.000Z"
}
```

`lastPhase` uses numeric values: 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9. Phase 1.5 is
stored as the string `"1.5"` since JSON does not have a fractional phase concept.
Resume logic: if `lastPhase` is `"1.5"`, resume from Phase 2.

## Testing Strategy

- Start `/forge:init` and interrupt after Phase 3
- Re-run `/forge:init` — verify resume offer appears with correct phase number
- Accept resume — verify phases 1-3 are skipped and Phase 4 starts immediately
- Complete successfully — verify `.forge/init-progress.json` is deleted
- Start over case: verify pre-flight plan appears and checkpoint is cleared

## Acceptance Criteria

- [ ] `forge/commands/init.md` checks for `.forge/init-progress.json` before showing the pre-flight plan
- [ ] If checkpoint exists, the resume prompt shows the correct next phase
- [ ] Accepting resume skips all completed phases
- [ ] Declining resume (start over) deletes the checkpoint and shows the pre-flight plan
- [ ] `forge/init/sdlc-init.md` writes the checkpoint at the end of each phase
- [ ] Phase 9 completion deletes `.forge/init-progress.json`
- [ ] Phase 1.5 is correctly stored/read as `"1.5"` and resumes from Phase 2
