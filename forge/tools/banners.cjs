'use strict';

// Forge Banner Library
// Reusable agent identity display for tools, hooks, and skills.
//
// Three render modes:
//   render(name)  — full ASCII art block + emoji + name + tagline
//   badge(name)   — single line: emoji + bold name + dim tagline
//   mark(name)    — emoji only (for use alongside 〇△× status marks)
//
// Usage (module):
//   const banners = require('./banners.cjs');
//   console.log(banners.render('forge'));
//   console.log(banners.badge('north'));
//   console.log(banners.mark('tide'));
//
// Usage (CLI):
//   node banners.cjs forge
//   node banners.cjs --badge north
//   node banners.cjs --mark tide
//   node banners.cjs --gallery
//   node banners.cjs --list

// ─── ANSI helpers ─────────────────────────────────────────────────────────────
const R = '\x1b[0m';
const B = '\x1b[1m';
const D = '\x1b[2m';
const f = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;

// ─── Banner registry ───────────────────────────────────────────────────────────
const BANNERS = {

  ember: {
    emoji:   '🔥',
    tagline: 'heat · ignition · drive',
    name:    'EMBER',
    color:   [255, 170, 60],
    art: [
      `  ${f(255,240,100)}      )      `,
      `  ${f(255,200,50)}    )   )   `,
      `  ${f(255,140,20)}   ( ) ( )  `,
      `  ${f(230,80,10)}    ((_))    `,
      `  ${f(170,30,5)}    ~~~~~    `,
    ],
  },

  tide: {
    emoji:   '🌊',
    tagline: 'rhythm · pull · depth',
    name:    'TIDE',
    color:   [110, 200, 255],
    art: [
      `  ${f(210,240,255)}  ∿   ∿   ∿   `,
      `  ${f(130,200,245)} ≋≋≋≋≋≋≋≋≋≋  `,
      `  ${f(60,140,210)}≋≋≋≋≋≋≋≋≋≋≋≋ `,
      `  ${f(25,85,175)}▓▓▓▓▓▓▓▓▓▓▓▓ `,
      `  ${f(10,45,130)}▓▓▓▓▓▓▓▓▓▓▓▓ `,
    ],
  },

  oracle: {
    emoji:   '🌕',
    tagline: 'sight · pattern · knowing',
    name:    'ORACLE',
    color:   [210, 160, 255],
    art: [
      `  ${f(160,80,240)}   ·  ◌  ·   `,
      `  ${f(190,110,255)}  ◌  ◎  ◌   `,
      `  ${f(230,190,80)}   ·  ${f(255,220,100)}◉${f(230,190,80)}  ·   `,
      `  ${f(190,110,255)}  ◌  ◎  ◌   `,
      `  ${f(160,80,240)}   ·  ◌  ·   `,
    ],
  },

  rift: {
    emoji:   '⚡',
    tagline: 'edge · fracture · crossing',
    name:    'RIFT',
    color:   [100, 255, 240],
    art: [
      `  ${f(0,240,230)}▓▓▒▒░░${f(180,0,220)}░░▒▒▓▓`,
      `  ${f(0,200,200)}  ▒░  ${f(220,0,255)}  ░▒   `,
      `  ${f(0,255,240)}  ╲   ${f(255,0,240)}  ╱    `,
      `  ${f(0,200,200)}   ╲  ${f(220,0,255)} ╱     `,
      `  ${f(0,240,230)}▓▓▒▒░░${f(180,0,220)}░░▒▒▓▓`,
    ],
  },

  bloom: {
    emoji:   '🌸',
    tagline: 'growth · opening · becoming',
    name:    'BLOOM',
    color:   [255, 160, 190],
    art: [
      `  ${f(255,160,200)}    ✿ ✿ ✿    `,
      `  ${f(255,120,170)}  ✿  ✾ ✾  ✿  `,
      `  ${f(220,255,160)}  ✿ ✾  ${f(255,220,100)}✽${f(220,255,160)} ✾ ✿  `,
      `  ${f(255,120,170)}  ✿  ✾ ✾  ✿  `,
      `  ${f(255,160,200)}    ✿ ✿ ✿    `,
    ],
  },

  north: {
    emoji:   '🧭',
    tagline: 'direction · clarity · cold',
    name:    'NORTH',
    color:   [190, 225, 255],
    art: [
      `  ${f(200,230,255)}      ✦       `,
      `  ${f(150,195,240)}    ╱   ╲     `,
      `  ${f(100,160,230)}  ✦   ◈   ✦  `,
      `  ${f(150,195,240)}    ╲   ╱     `,
      `  ${f(200,230,255)}      ✦       `,
    ],
  },

  lumen: {
    emoji:   '✨',
    tagline: 'light · warmth · clarity',
    name:    'LUMEN',
    color:   [255, 245, 150],
    art: [
      `  ${f(255,255,200)}    ✧ · ✧    `,
      `  ${f(255,245,160)}  · ╲  │  ╱ · `,
      `  ${f(255,235,120)}  ✧── ${f(255,255,255)}◉ ${f(255,235,120)}──✧  `,
      `  ${f(255,245,160)}  · ╱  │  ╲ · `,
      `  ${f(255,255,200)}    ✧ · ✧    `,
    ],
  },

  forge: {
    emoji:   '🔨',
    tagline: 'making · heat · craft',
    name:    'FORGE',
    color:   [255, 160, 40],
    art: [
      `  ${f(255,230,80)}  ✦    ✧   ✦  `,
      `  ${f(200,80,20)}   ▄▄▄▄▄▄▄▄   `,
      `  ${f(170,50,10)}   █${f(230,100,30)}▓▓▓▓▓▓${f(170,50,10)}█   `,
      `  ${f(140,30,5)}   ▀▀▀▀▀▀▀▀   `,
      `  ${f(255,160,40)}   ≋ ≋ ≋ ≋    `,
    ],
  },

  drift: {
    emoji:   '🍃',
    tagline: 'ease · letting go · flow',
    name:    'DRIFT',
    color:   [150, 200, 165],
    art: [
      `  ${f(160,200,170)}  ·    ·       `,
      `  ${f(140,180,155)}    ·    ·  ·  `,
      `  ${f(120,165,140)}  ·  ·    ·    `,
      `  ${f(100,150,125)}     ·  ·      `,
      `  ${f(80,135,110)}  ·      ·  ·  `,
    ],
  },

  void: {
    emoji:   '🌑',
    tagline: 'depth · silence · potential',
    name:    'VOID',
    color:   [130, 100, 200],
    art: [
      `  ${f(30,20,60)}                  `,
      `  ${f(50,35,90)}    ·       ·     `,
      `  ${f(70,50,120)}        ◌         `,
      `  ${f(50,35,90)}    ·       ·     `,
      `  ${f(30,20,60)}                  `,
    ],
  },

  entelligentsia: {
    emoji:   '🔗',
    tagline: 'linked · intellect · becoming',
    name:    'ENTELLIGENTSIA',
    color:   [140, 200, 60],
    art: [
      `  ${f(110,110,115)} ╭──╮         `,
      `  ${f(110,110,115)} │  │         `,
      `  ${f(110,110,115)}─╯  ╰──${f(140,200,60)}─╮  ╭──`,
      `  ${f(140,200,60)}        │  │  `,
      `  ${f(140,200,60)}        ╰──╯  `,
    ],
  },

};

// ─── Render helpers ────────────────────────────────────────────────────────────

/** Dim dot rule — use between banners in a gallery */
function rule() {
  return `  ${f(45,45,65)}${'·'.repeat(32)}${R}`;
}

/**
 * Full banner: ASCII art block + emoji + name + tagline.
 * @param {string} name  Banner key (case-insensitive).
 * @returns {string}
 */
function render(name) {
  const b = _get(name);
  const [r, g, bl] = b.color;
  const label = `  ${b.emoji}  ${B}${f(r,g,bl)}${b.name}${R}   ${D}${f(r,g,bl)}${b.tagline}${R}`;
  return '\n' + b.art.map(line => line + R).join('\n') + '\n' + label + '\n';
}

/**
 * Badge: single line — emoji + bold name + dim tagline.
 * Fits inline in status output or skill headers.
 * @param {string} name
 * @returns {string}
 */
function badge(name) {
  const b = _get(name);
  const [r, g, bl] = b.color;
  return `${b.emoji}  ${B}${f(r,g,bl)}${b.name}${R}  ${D}${f(r,g,bl)}${b.tagline}${R}`;
}

/**
 * Mark: emoji only.
 * Use alongside 〇△× status marks for agent attribution.
 * @param {string} name
 * @returns {string}
 */
function mark(name) {
  return _get(name).emoji;
}

/**
 * All available banner names.
 * @returns {string[]}
 */
function list() {
  return Object.keys(BANNERS);
}

/**
 * Full gallery of all banners separated by rules.
 * @returns {string}
 */
function gallery() {
  return list().map((name, i) => {
    const sep = i > 0 ? '\n' + rule() + '\n' : '';
    return sep + render(name);
  }).join('');
}

// ─── Internal ──────────────────────────────────────────────────────────────────

function _get(name) {
  const b = BANNERS[name.toLowerCase()];
  if (!b) {
    throw new Error(`Unknown banner "${name}". Available: ${list().join(', ')}`);
  }
  return b;
}

// ─── CLI ───────────────────────────────────────────────────────────────────────
// node banners.cjs [<name>] [--gallery] [--badge <name>] [--mark <name>] [--list]

if (require.main === module) {
  const args = process.argv.slice(2);
  try {
    if (!args.length || args[0] === '--gallery') {
      process.stdout.write(gallery() + '\n');
    } else if (args[0] === '--list') {
      console.log(list().map(n => {
        const b = BANNERS[n];
        return `${b.emoji}  ${n.padEnd(8)} — ${b.tagline}`;
      }).join('\n'));
    } else if (args[0] === '--badge') {
      console.log(badge(args[1] || ''));
    } else if (args[0] === '--mark') {
      console.log(mark(args[1] || ''));
    } else {
      process.stdout.write(render(args[0]) + '\n');
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

// ─── Exports ───────────────────────────────────────────────────────────────────
module.exports = { render, badge, mark, list, gallery, rule, BANNERS };
