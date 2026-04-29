# Forge Banner Library

Agent identity display system. Three render modes, usable from tools, hooks,
and skills.

## Modes

| Mode | Output | Use when |
|------|--------|----------|
| `render(name)` | Full ASCII art + emoji + name + tagline | Agent startup, skill/persona headers |
| `badge(name)`  | `🔥  EMBER   heat · ignition · drive` | Inline status, compact contexts |
| `mark(name)`   | `🔥` | Alongside `〇△×` status marks for agent attribution |

## Agents

| Emoji | Name | Tagline | Use for |
|-------|------|---------|---------|
| 🔥 | EMBER  | heat · ignition · drive        | Active tasks, build running, execution |
| 🌊 | TIDE   | rhythm · pull · depth          | Data flow, processing, pipelines |
| 🌕 | ORACLE | sight · pattern · knowing      | Analysis, review, pattern recognition |
| ⚡ | RIFT   | edge · fracture · crossing     | Migrations, boundary crossings, breaking changes |
| 🌸 | BLOOM  | growth · opening · becoming    | New features, creation, initialisation |
| 🧭 | NORTH  | direction · clarity · cold     | Planning, sprint intake, direction-setting |
| ✨ | LUMEN  | light · warmth · clarity       | Insight moments, documentation, explanation |
| 🔨 | FORGE  | making · heat · craft          | Build, compile, generate, ship |
| 🍃 | DRIFT  | ease · letting go · flow       | Cleanup, refactor, remove, simplify |
| 🌑 | VOID   | depth · silence · potential    | Idle, waiting, unknown, deep work |

## Status composition

Use `mark` + `〇△×` together for attributed status lines:

```
🔨  Building...
  〇  lint passed
  〇  types clean
  △  test suite slow (12s)
  ×  deploy failed — exit 1
```

```
🌕  Reviewing plan...
  〇  scope is clear
  △  one ambiguity in step 3
  〇  no security concerns
```

## Node.js usage

```javascript
const banners = require('./banners.cjs');

// Full banner
process.stdout.write(banners.render('forge'));

// Inline badge
console.log(banners.badge('north'));
// → 🧭  NORTH  direction · clarity · cold

// Mark only
console.log(banners.mark('tide') + '  Processing...');
// → 🌊  Processing...

// List all names
banners.list();
// → ['ember', 'tide', 'oracle', ...]

// Full gallery (preview all banners)
process.stdout.write(banners.gallery());
```

## Bash usage

```bash
source "$(dirname "$0")/banners.sh"

banner_render forge
banner_badge  north
banner_mark   tide
banner_list
banner_gallery
```

## CLI usage

```bash
node forge/tools/banners.cjs forge           # full banner
node forge/tools/banners.cjs --badge north   # badge
node forge/tools/banners.cjs --mark tide     # mark
node forge/tools/banners.cjs --list          # all names
node forge/tools/banners.cjs --gallery       # all banners
```

## Skill / prompt usage

Skills and workflows reference banners by name. Claude outputs the badge
inline when starting a context. Example pattern in a skill preamble:

```
You are the NORTH agent (🧭 direction · clarity · cold).
Begin by displaying: badge('north')
```

## Adding a new banner

Add an entry to the `BANNERS` object in `forge/tools/banners.cjs`:

```javascript
myagent: {
  emoji:   '🌿',
  tagline: 'short · evocative · words',
  name:    'MYAGENT',
  color:   [R, G, B],      // true color for name label
  art: [
    `  ${f(R1,G1,B1)} line one   `,
    `  ${f(R2,G2,B2)} line two   `,
    // 5 lines recommended
  ],
},
```

Then update this doc's agents table.
