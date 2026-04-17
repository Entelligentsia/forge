# Feature: `/forge:config` Command + Fast-Mode-Respecting Regenerate

> Feature ID: FEAT-005
> Status: 🔵 active
> Created: 2026-04-17
> Target version: 0.12.1 (or bundled with FEAT-004 patch)

## Context

v0.12.0 shipped fast-mode init, which creates workflow stubs and defers
persona/skill/template generation to first use. Two gaps emerged:

1. **Targeted `/forge:regenerate <category>` is broken on fast installs.**
   Migrations invoke `/forge:regenerate workflows` (and similar) via
   `/forge:update`. On fast installs the generation subagents try to embed
   personas/templates that don't exist — fan-out fails mid-flight and leaves
   the project in a half-regenerated state.

2. **Mode switching is an invisible side-effect.** Today `mode: fast →
   full` is flipped in three incidental places:
   - `regenerate.md:387` (default no-args run)
   - `materialize.md:52` (`--all` run)
   - (implicit) nowhere else — there's no explicit verb to change mode.
   The user never sees a decision point about promotion; it just happens
   when they run unrelated commands.

This feature fixes both with one coherent change:

- **Regenerate respects fast mode.** Targeted and default regenerate touch
  only artifacts that are materialized. Stubs and absent artifacts are
  left alone — they'll self-refresh at first use, picking up the latest
  meta-definitions automatically.
- **Mode switching becomes explicit.** A new `/forge:config` command owns
  the `mode` field. `regenerate` and `materialize` stop mutating it.

## Outcome

- Migrations that require `regenerate <target>` no longer break fast
  installs — they become no-ops or partial refreshes, and unmaterialized
  stubs pick up the new meta-version at first use (for free).
- Users who want to promote fast → full run one explicit command:
  `/forge:config mode full`.
- `regenerate` and `materialize` are side-effect-free with respect to mode.

## Requirements

### Part A — `/forge:config` command (new)

New command file: `forge/commands/config.md`.

**Subcommand surface:**

| Invocation | Behaviour |
|---|---|
| `/forge:config` | Print a summary of `.forge/config.json` (mode, paths, version, installed skills). Read-only. |
| `/forge:config mode` | Print current mode (`fast`, `full`, or `unset`). Read-only. |
| `/forge:config mode full` | Promote fast → full. One-way transition. Runs materialize-all + default regenerate, then writes `mode: full`. |
| `/forge:config mode fast` | Refused with `× Cannot downgrade full → fast. Use /forge:remove and re-init to reset.` |

Future expansion (not in this feature): `/forge:config kb <path>`,
`/forge:config paths <key> <value>`. Keep the command shape open for this.

**`mode full` promotion sequence:**

1. Read current mode from `.forge/config.json`. If already `full`: emit
   `〇 Already in full mode. Nothing to do.` and exit 0.
2. Emit `━━━ Promoting to Full Mode ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.
3. Run `/forge:materialize --all` by reading and following
   `$FORGE_ROOT/commands/materialize.md`. This fills any missing
   personas/skills/templates and replaces all workflow stubs with real
   workflow files.
4. Run default `/forge:regenerate` (no args) by reading and following
   `$FORGE_ROOT/commands/regenerate.md`. This brings materialized-before-
   now artifacts up to the current meta-definitions.
5. Write `mode: full` via
   `node "$FORGE_ROOT/tools/manage-config.cjs" set mode full`.
6. Emit `〇 Promoted to full mode.`

**Invariant:** The only code path that writes `mode` in the Forge plugin
after this feature is `/forge:config mode <value>` (plus `init.md` Phase 0
at initial install). All existing flip sites are removed.

### Part B — Regenerate respects fast mode

**Detection of "materialized" per namespace:**

| Namespace | Materialized if… |
|---|---|
| `.forge/workflows/<id>.md` | File exists AND does not start with `<!-- FORGE FAST-MODE STUB` (first non-blank line check) |
| `.forge/personas/<role>.md` | File exists |
| `.forge/skills/<role>-skills.md` | File exists |
| `.forge/templates/<STEM>.md` | File exists |
| `.claude/commands/<name>` | Always present in fast mode — no filter needed |

**Behaviour by category:**

`/forge:regenerate <cat>` on a project where `config.mode === "fast"`:

1. Enumerate the meta sources as today (e.g. `meta-*.md`).
2. **Filter** the enumeration: keep only meta entries whose corresponding
   target file passes the "materialized" check above.
3. If the filtered set is empty: emit
   `〇 Fast mode: no materialized <cat> to regenerate.` and return 0
   (no-op, no manifest changes, no errors).
4. Otherwise: fan out only the filtered subagents. Non-materialized
   artifacts remain untouched (stubs stay stubs, absent files stay
   absent).
5. Emit a completion line that names both numbers:
   `〇 <cat> — N of M files regenerated (others remain deferred)`.

Applies to: `personas`, `skills`, `templates`, `workflows` (including
single-file variants and orchestration).

**Single-file variants** (`/forge:regenerate workflows:plan_task`):
- If target is materialized: regenerate as normal.
- If target is a stub or missing: emit
  `〇 Fast mode: .forge/workflows/plan_task.md is a stub and will
  self-refresh on first use. Nothing to regenerate.` and exit 0.

**Default `/forge:regenerate` (no args) on fast mode:**

- Runs all four parallel waves as today, but each wave honours the
  filter from step 2 above.
- **Does NOT flip mode** (removing the current `regenerate.md:384-389`
  block). Mode stays `fast` until the user explicitly runs
  `/forge:config mode full`.
- Emits a summary footer:
  ```
  〇 Regenerate complete (fast mode)
    personas   — N of M regenerated
    templates  — N of M regenerated
    skills     — N of M regenerated
    workflows  — N of M regenerated (others remain as stubs)
    commands   — always present, regenerated normally

  〇 To promote to full mode: /forge:config mode full
  ```

**Full-mode projects** are unaffected — the mode check short-circuits to
the existing full-rebuild behaviour. No filter, no mode flip (never
needed), no footer.

**`knowledge-base` category** is unchanged — it's a merge operation
against existing docs, already safe regardless of mode.

### Part C — Materialize stops flipping mode

`materialize.md` line 52 (`manage-config.cjs set mode full`) and the
surrounding block are removed. `materialize --all` becomes strictly a
gap-filler: it generates missing/stubbed artifacts and stops. It does
not promote the project.

Rationale: materialize's job is "fill what's missing." Promotion is a
separate decision with semantic weight (declaring the project fully
generated) and should be explicit. The `/forge:config mode full` verb
is the one path that promotes.

Edge case: a user runs `materialize --all`, every artifact is now
materialized, but `mode` stays `fast`. Is this weird? Yes, a little —
but it's only a cosmetic flag at that point. The user can flip it with
`/forge:config mode full` when they choose. Health checks and smoke
tests read actual state (file presence), not the flag.

### Part D — FEAT-004 integration

FEAT-004's resume sub-prompt includes a fast → full switch option. With
FEAT-005 in place, that code path calls `/forge:config mode full`
instead of raw `manage-config.cjs set mode`. Cleaner; single code path.

FEAT-004 also mentions a warning when switching full → fast on resume —
with FEAT-005 this becomes impossible (switching to fast is refused by
`/forge:config`), so the FEAT-004 spec should be amended to remove the
full → fast resume switch case.

## Files to modify

1. **`forge/commands/config.md`** (NEW)
   - Four subcommands as specified above.
   - Internal delegations: materialize.md for `--all`, regenerate.md for
     default run.
   - `manage-config.cjs set mode full` as the final write.
   - Usage output for no-args and help.

2. **`forge/commands/regenerate.md`**
   - At each category (`personas`, `skills`, `templates`, `workflows`),
     add a mode-detection preamble and a filter step. Preamble pattern:
     ```
     Read `.forge/config.json` mode field:
         CONFIG_MODE=$(node "$FORGE_ROOT/tools/manage-config.cjs" get mode 2>/dev/null || echo "full")
     If CONFIG_MODE is "fast":
       Filter the meta enumeration to only include entries whose target
       file is materialized (see detection table).
       If filtered set is empty: emit "〇 Fast mode: no materialized <cat>
       to regenerate." and return.
     ```
   - Single-file variants: prepend a materialized-check that short-
     circuits on stubs/missing.
   - Remove the default-run mode flip block at lines 384-389 and the
     surrounding "Fast → Full transition" note at lines 391-395.
   - Add the fast-mode completion footer to the default run.

3. **`forge/commands/materialize.md`**
   - Remove the `set mode full` write (line 52) and any surrounding
     promotion copy.
   - Update the command description to say "fills missing/stubbed
     artifacts; does not change mode."

4. **`forge/commands/update.md`**
   - Add a post-step that detects fast mode after migrations and emits
     the promotion hint:
     ```
     〇 Migration applied in fast mode. Materialized artifacts refreshed;
       stubs will pick up changes on first use.
     〇 To fully promote: /forge:config mode full
     ```
   - Single line in the completion block; no behavioural change.

5. **`forge/.claude-plugin/plugin.json`** — version bump (see below).

6. **`forge/migrations.json`** — migration entry (see below).

7. **`CHANGELOG.md`** — entry.

## Existing utilities reused

- `manage-config.cjs get mode` — already works; returns `null` if unset.
- `manage-config.cjs set mode <value>` — already works (v0.12.0).
- Stub sentinel: `<!-- FORGE FAST-MODE STUB` — already standardised by
  FEAT-003 in `sdlc-init.md` Phase 7-fast.
- `ensure-ready.cjs` — not directly reused here; the materialized-check
  is simpler than closure computation (single-file existence + sentinel
  scan). Keep `ensure-ready.cjs` for what it's for (lazy-materialize
  invocation gate).

## Edge cases

| Case | Handling |
|---|---|
| Fast install, 0 personas materialized, user runs `/forge:regenerate personas` | No-op. Emit `〇 Fast mode: no materialized personas to regenerate.` |
| Fast install, 3 of 16 workflows materialized, migration triggers `/forge:regenerate workflows` | Regenerate those 3. Leave 13 stubs. Mode stays fast. Emit `〇 workflows — 3 of 16 files regenerated (13 remain as stubs)`. |
| Fast install, user runs `/forge:regenerate workflows:plan_task` but plan_task is a stub | No-op. Emit `〇 Fast mode: .forge/workflows/plan_task.md is a stub and will self-refresh on first use.` |
| Fast install, default `/forge:regenerate` (no args) | Regenerates what's materialized across all categories. Mode stays fast. Footer shows materialized/total for each category. |
| Fast install, user runs `/forge:config mode full` | Runs materialize-all then default regenerate, writes `mode: full`. |
| Full install, user runs `/forge:config mode full` | No-op. Emit `〇 Already in full mode.` |
| Full install, user runs `/forge:config mode fast` | Refused. |
| Fast install, user runs `/forge:config mode fast` | No-op. Emit `〇 Already in fast mode.` |
| Fast install, user runs `/forge:materialize --all` | Fills gaps (as today). Mode stays fast. |
| Fast install, all 17 workflows materialized by explicit invocations, user runs `/forge:config` | Summary shows `mode: fast` but 17/17 workflows materialized — cosmetic stale flag. Harmless. |
| `.forge/config.json` missing when `/forge:config` invoked | Emit `× .forge/config.json not found. Run /forge:init first.` (reuse `manage-config.cjs`'s existing error path). |

## Version bump

**Bump: 0.12.0 → 0.12.1** (patch).

- New command (`/forge:config`) — material change, affects installed
  projects' command surface.
- Behavioural change to `/forge:regenerate` and `/forge:materialize` —
  material. Users running targeted regenerate on fast installs get
  different results than before (previously: crash; after: selective
  refresh).
- No schema change; no migration action needed from users.

### Migration entry

```json
"0.12.0": {
  "version": "0.12.1",
  "date": "2026-04-17",
  "notes": "New /forge:config command for mode switching. Regenerate and materialize now respect fast mode and no longer auto-flip to full. Explicit promotion: /forge:config mode full.",
  "regenerate": [],
  "breaking": false,
  "manual": []
}
```

Note: no `regenerate` targets because the change is additive — existing
full-mode projects are unaffected; existing fast-mode projects get the
new (better) behaviour automatically.

## Verification

**Manual smoke test matrix** from clean checkouts:

### Part A — `/forge:config` command

1. `/forge:config` on full install → prints summary with `mode: full`.
2. `/forge:config` on fast install → prints summary with `mode: fast`.
3. `/forge:config mode` on fast install → prints `fast`.
4. `/forge:config mode full` on full install → no-op message.
5. `/forge:config mode full` on fast install with partial materialization
   → runs materialize, runs regenerate, writes mode, completes.
   Verify: every stub is gone; `mode: full` in config.
6. `/forge:config mode fast` on any install → refused.

### Part B — Regenerate filters

7. Fresh fast install. Materialize 2 workflows (`plan_task`,
   `review_code`) via explicit first-use invocation. Run
   `/forge:regenerate workflows`. Verify: only those 2 files have new
   mtimes; other 14 stubs untouched; `mode: fast` unchanged.
8. Fresh fast install. Run `/forge:regenerate workflows:plan_task`
   without prior materialization. Verify: no-op message, file
   unchanged.
9. Fresh fast install. Run `/forge:regenerate` (no args). Verify:
   all 12 commands rebuilt, 0 personas/skills/templates/workflows
   rebuilt (nothing materialized yet); footer shows 0-of-N counts;
   `mode: fast` unchanged.
10. Fresh full install. Run `/forge:regenerate workflows`. Verify:
    all 18 files rebuilt as today.
11. Fresh full install. Run default `/forge:regenerate`. Verify: no
    mode flip (it's already `full`), no behavioural regression.

### Part C — Materialize mode neutrality

12. Fresh fast install. Run `/forge:materialize --all`. Verify:
    all stubs replaced, all personas/skills/templates generated,
    `mode: fast` UNCHANGED (previously would have flipped).
13. After step 12, run `/forge:config mode full`. Verify: mode
    flips; materialize-all in step 3 of promotion is effectively a
    no-op (everything pristine); regenerate refreshes all.

### Part D — Migration path

14. Mock migration entry with `"regenerate": ["workflows"]`. Apply
    via `/forge:update` against a fast install with 3 materialized
    workflows. Verify: no crash, 3 rebuilt, 13 stubs intact,
    completion message hints at `/forge:config mode full`.

### Optional unit tests

- `manage-config.test.cjs` — `set mode full`, `set mode fast`, `get mode`
  when absent returns null/empty. (Likely already covered — confirm.)
- No new CJS code needed for this feature — all logic is in markdown
  orchestration.

## Out of scope

- `/forge:config kb <path>` — KB rename plumbing. The command shape is
  reserved but not implemented here.
- Recomputing `mode` from filesystem state instead of storing it as a
  flag. Considered and rejected — the flag is cheap and the drift
  between flag and state is cosmetic.
- Changing the stub sentinel format. Stays as
  `<!-- FORGE FAST-MODE STUB` per FEAT-003.
