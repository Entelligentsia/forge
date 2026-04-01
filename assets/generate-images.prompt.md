# Forge Image Generation Agent Prompt

You are an image generation agent working in `/home/boni/src/forge`. You have full read access to the repo. Read the existing assets in `assets/` before generating anything — they define the visual style you must match exactly.

---

## Critical Constraint: Square Source Images

**Nano Banana only generates square images.** Every image is generated as a **1024×1024px square**, then resized to its target dimensions using ImageMagick post-processing.

The resize works seamlessly *only if* the square is composed correctly (see below). Do not skip the composition requirements.

---

## Visual Style

Read all images in `/home/boni/src/forge/assets/` before generating. The defining characteristics are:

- **Medium**: Graphite pencil sketch on warm cream/parchment paper — background tone approximately `#F2EDE4`
- **Technique**: Fine cross-hatching and hatching for shadow and depth; deliberate linework; no flat fills, no colour, no hard gradients
- **Vignette**: Every image has a soft circular or oval vignette — darker graphite smudge at the perimeter fading inward to the paper tone, OR a bright centre with the paper tone fading outward. The vignette is never rectangular — always radial
- **Composition**: Single metaphorical subject, centred, generous negative space — especially toward the edges
- **Aesthetic**: Japanese / Zen influences — serenity, restraint, patience. Subjects are symbolic and thematic, never literal (no screenshots, no UI, no text rendered as part of the sketch)
- **Mood**: Still, considered, authoritative — like illustrations from a technical treatise

### Composition Rule for Seamless Resizing

**This is the key to no sharp edges when extending the canvas.**

The vignette must reach full paper colour (`#F2EDE4`) **within the innermost 75% of the image width**. That means: no visible sketch marks within the outermost 12.5% of each side edge. When the square is extended horizontally to a banner, the canvas extension fills with matching paper colour and the join is invisible because the source edge already *is* paper colour.

Enforce this at generation time — do not try to fix it in post.

---

## Images to Generate

### 1. Hero Banner — `forge_hero_banner.png`

- **Source square**: `forge_hero_banner_sq.png` (1024×1024, saved to `assets/`)
- **Final output**: `forge_hero_banner.png` (1280×480) — replaces the existing file
- **Subject**: A stone-floored blacksmith's forge workshop, viewed from the entrance. A heavy iron anvil dominates the foreground centre on a wooden stump. A hammer rests across it. Behind: a glowing furnace, walls hung with tools — tongs, chisels, punches. The room has an arched stone window admitting diffuse light. Fine detail in the ironwork and stone; the background softens into the paper. Cinematic depth — foreground crisp, background dissolving into mist and paper tone.
- **Represents**: Forge as a craftsman's workshop — a place where raw material is transformed through skilled work
- **Note**: This is a refresh of the existing hero banner. The existing one (`forge_hero_banner.png`) is the reference composition — match the same scene, same tone, but generate fresh at 1024×1024.

---

### 2. Social Preview — `forge_social.png`

- **Source square**: `forge_social_sq.png` (1024×1024, saved to `assets/`)
- **Final output**: `forge_social.png` (1280×640) — new file
- **Subject**: Same forge workshop as the hero banner but recomposed for a slightly taller ratio. The anvil is centred. The furnace glow behind it is warmer and more prominent. On the left side of the anvil: an open scroll with a quill — representing the knowledge base. On the right: a small stack of scrolls — representing generated artefacts. The workshop walls are visible but muted. Generous paper-tone fade at all four edges.
- **Represents**: GitHub social preview card — the forge metaphor at a glance
- **Note**: This will be uploaded to GitHub Settings → Social Preview. Flag this step to the user when done.

---

## Post-Processing Pipeline (ImageMagick)

Run these commands after saving the source squares. ImageMagick (`magick` / `convert`) must be available.

### Verify ImageMagick is available

```bash
magick --version
```

If not available: `sudo apt install imagemagick` (Linux) or `brew install imagemagick` (macOS).

### Hero Banner: 1024×1024 → 1280×480

```bash
# Scale square to banner height (480px), keeping aspect ratio → 480×480
# Then extend canvas to 1280×480, centred, paper colour fill
magick assets/forge_hero_banner_sq.png \
  -resize x480 \
  -gravity Center \
  -background "#F2EDE4" \
  -extent 1280x480 \
  assets/forge_hero_banner.png
```

### Social Preview: 1024×1024 → 1280×640

```bash
magick assets/forge_social_sq.png \
  -resize x640 \
  -gravity Center \
  -background "#F2EDE4" \
  -extent 1280x640 \
  assets/forge_social.png
```

### Verify the seam is invisible

After running each command, inspect the output. The left and right edges of the scaled source image must blend invisibly into the canvas extension. If a seam is visible, the source square's vignette did not reach full paper tone at the side edges — regenerate the square with stronger edge fade before re-running.

**Do not apply blur or smear to fix a seam.** The fix is always in the composition: regenerate the square with the subject pulled tighter to centre and the edge fade strengthened.

---

## README Update

The forge `README.md` already correctly references `assets/forge_hero_banner.png` and all section images. The file path does not change — the `magick` command above overwrites in place.

No README edits are needed for the banner.

**Add this note for the social preview** — it cannot be set via code:

> After saving `assets/forge_social.png`, upload it manually:
> **GitHub → Entelligentsia/forge → Settings → Social preview → Edit → Upload image**

---

## Existing Section Images

The following images already exist and are correctly used in the README as 256px inline floats. **Do not regenerate them** unless they visually deviate from the style guide above:

| File | Subject | Used for |
|------|---------|----------|
| `forge_adapts.png` | Bonsai tree growing through a rectangular frame | Adapts itself to your project |
| `forge_learns.png` | Zen garden being raked in concentric circles | Self-learns with every cycle |
| `forge_agnostic.png` | Tortoise carrying balanced zen stones | Stack agnostic |
| `forge_deterministic.png` | Metronome beside a sleeping cat | Deterministic tools |
| `forge_knowledge.png` | Owl with glasses holding a scroll in a library | Knowledge base |
| `forge_contextefficient.png` | Lotus leaf with a magnifying glass | Context-efficient by design |
| `forge_quiz.png` | Turtle reading a document underwater | The Quiz |
| `forge_improves.png` | Heron standing still in a marsh | Improves itself through feedback |
| `forge_skills.png` | River winding through forest | Discovers and recommends skills |
| `sdlc_flywheel.png` | SDLC cycle diagram | *(not currently embedded — leave as-is)* |

If any section image needs replacing, apply the same pipeline: generate 1024×1024 square, use as-is (no resize needed — 256px display is a CSS width, the source PNG stays square).

---

## Execution Order

1. Read all existing images in `assets/` to internalise the exact style
2. Generate `forge_hero_banner_sq.png` (1024×1024)
3. Run ImageMagick → `forge_hero_banner.png` (1280×480). Inspect seam.
4. Generate `forge_social_sq.png` (1024×1024)
5. Run ImageMagick → `forge_social.png` (1280×640). Inspect seam.
6. Report: paths of all files written, seam inspection result, and the manual GitHub upload step for the social preview
