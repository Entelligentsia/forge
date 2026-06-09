# Forge Init — 4-Phase Orchestration

You are bootstrapping a complete AI-SDLC instance for the project in the
current working directory. Execute these 4 phases in order.

Set `$FORGE_ROOT` to the forge plugin directory (the parent of this file's
directory — the folder containing `meta/` and `init/`).

---

## Phase files

Each phase is fully specified in a dedicated file under `$FORGE_ROOT/init/phases/`:

| Phase | File | Verify command |
|-------|------|----------------|
| 1 — Collect | `phase-1-collect.md` | `node "$FORGE_ROOT/tools/verify-phase.cjs" --phase 1` |
| 2 — Discover | `phase-2-discover.md` | `node "$FORGE_ROOT/tools/verify-phase.cjs" --phase 2 --kb-path "$KB_PATH"` |
| 3 — Materialize | `phase-3-materialize.md` | `node "$FORGE_ROOT/tools/verify-phase.cjs" --phase 3` |
| 4 — Register | `phase-4-register.md` | *(deterministic — steps fail explicitly)* |

---

## Execution

Orchestration lives in `init/base-pack/workflows-js/wfl-init.js`, dispatched by
`commands/init.md` via `workflow('wfl:init', args)`. All interactive steps are hoisted
into the `init.md` command wrapper (KB folder prompt, CLAUDE.md offer, marketplace-skills
offer, Tomoshibi invocation).

This file is a human-readable specification pointer. The phase rulebooks under `init/phases/`
remain the canonical per-phase contracts — they are shared with forge-cli's native
`run-phases.ts` orchestrator and must not be renamed or renumbered.

For new init runs: `4ge init claude .` scaffolds the project; `/forge:init` runs the
LLM half via `wfl:init`.
