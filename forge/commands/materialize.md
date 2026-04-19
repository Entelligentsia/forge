---
name: materialize
description: Use when you've run /forge:init --fast and want to fill in missing scaffolding — either for a specific workflow's closure or as a full warm-up. Fills missing or stubbed artifacts; does not change config mode. Unlike /forge:regenerate (which rebuilds regardless), materialize only fills what is missing or stubbed, leaving pristine user-modified files untouched.
---

# /forge:materialize

Fills missing or stubbed Forge scaffolding without overwriting pristine files.
This is the on-demand complement to `/forge:init --fast`.

`materialize` is **mode-neutral** — it never writes `.forge/config.json`
`mode`. Promotion from fast → full is a separate explicit decision owned
by `/forge:config mode full`. After a `materialize --all`, it is normal
for `mode` to remain `fast` even though every artifact is now present.

## Locate the Forge plugin

```
FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`
```

Read `.forge/config.json`. If it does not exist, stop and tell the user to run
`/forge:init` first.

## Arguments

$ARGUMENTS

Parse the argument:

```
/forge:materialize                          # full warm-up — all stubs + missing
/forge:materialize --all                    # same as no args
/forge:materialize workflows plan_task      # just this workflow's closure
/forge:materialize workflows:plan_task      # colon form
```

---

## Full warm-up (`/forge:materialize` or `--all`)

Open with the forge badge + status line:

```sh
node "$FORGE_ROOT/tools/banners.cjs" --badge forge
```

Emit: `〇 forge:materialize — full warm-up…`

Then announce the fast-mode capability state — silent on full installs:

```sh
node "$FORGE_ROOT/tools/ensure-ready.cjs" --announce --all
```

`banners.cjs` strips ANSI in `NO_COLOR` / non-tty / `--plain` contexts.

Follow `$FORGE_ROOT/init/generation/lazy-materialize.md` for each stub or missing
workflow in `.forge/workflows/`. Work from a single collected list:

1. Read `$FORGE_ROOT/schemas/structure-manifest.json` for the full workflow list.
2. For each workflow id in `namespaces.workflows.files`:
   - Check if `.forge/workflows/{id}.md` is a stub (starts with `<!-- FORGE FAST-MODE STUB`)
     or is missing.
   - Collect all stubs/missing into one list.
3. Compute the union closure across all stubs/missing workflows.
4. Fan-out materialisation following the lazy-materialize rulebook steps 5–10
   for the union closure (one pass, not per-workflow).
5. Rebuild the persona pack so `meta-orchestrate` and `meta-fix-bug` use
   a fresh reference index (consumed when `FORGE_PROMPT_MODE=reference`):
   ```sh
   node "$FORGE_ROOT/tools/build-persona-pack.cjs" \
     --out .forge/cache/persona-pack.json
   ```
   On exit 1, surface the stderr message (it includes the offending file
   path) and continue — the pack is refreshable later via `/forge:regenerate`.
6. Rebuild the architecture context pack:
   ```sh
   ENGINEERING=$(node "$FORGE_ROOT/tools/manage-config.cjs" get paths.engineering 2>/dev/null || echo engineering)
   node "$FORGE_ROOT/tools/build-context-pack.cjs" \
     --arch-dir "$ENGINEERING/architecture" \
     --out-md .forge/cache/context-pack.md \
     --out-json .forge/cache/context-pack.json
   ```
   On exit 1 (architecture directory not yet present), emit a warning and
   continue — the pack can be built later via `/forge:regenerate`.
7. Emit: `〇 forge:materialize complete — gaps filled (mode unchanged)`
8. If `.forge/config.json` `mode` is still `"fast"`, append the promotion hint:
   ```
   〇 To declare the project fully generated: /forge:config mode full
   ```

---

## Single-workflow (`/forge:materialize workflows <id>`)

Open with the forge badge + status line:

```sh
node "$FORGE_ROOT/tools/banners.cjs" --badge forge
```

Emit: `〇 forge:materialize — materialising closure for {id}…`

Follow `$FORGE_ROOT/init/generation/lazy-materialize.md` with `workflow_id={id}`.
Pass the full argument (caller intent) so the rulebook can re-read and execute
the real workflow after materialisation.

Do NOT flip config mode for any materialize invocation. Mode is owned by
`/forge:config`.

---

## On error

If any generation step fails unexpectedly:

> "This looks like a Forge bug. Would you like to file a report? Run
> `/forge:report-bug` — I'll pre-fill the report from this conversation."
