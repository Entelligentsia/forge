#!/usr/bin/env node
'use strict';

// Forge tool: ensure-ready
// Answers "is workflow X's transitive dependency closure materialised?"
//
// Usage:
//   ensure-ready.cjs --workflow <id>    → exit 0 if closure pristine, 1 if not
//                                         stdout: JSON missing-list
//   ensure-ready.cjs --closure <id>     → print full transitive closure as JSON
//   ensure-ready.cjs --target <path>    → same as --workflow keyed by filename
//
// Exit codes (--workflow / --target):
//   0  All closure artifacts are present and not stubs
//   1  One or more artifacts are missing or are fast-mode stubs
//
// Reuses:
//   checkNamespaces  from check-structure.cjs  (presence)
//   hashContent, MANIFEST_PATH  from generation-manifest.cjs (pristine check)
//   edges  from forge/schemas/structure-manifest.json

const fs   = require('fs');
const path = require('path');

const FAST_STUB_SENTINEL = '<!-- FORGE FAST-MODE STUB';
const DEFAULT_KB_PATH    = 'engineering';

// ── resolveKbPath ──────────────────────────────────────────────────────────────

function resolveKbPath(config) {
  if (!config) return DEFAULT_KB_PATH;
  const p = config && config.paths && config.paths.engineering;
  return (p && p.length > 0) ? p : DEFAULT_KB_PATH;
}

// ── resolvePath ───────────────────────────────────────────────────────────────

function resolvePath(templatePath, kbPath) {
  return templatePath.replace('{KB_PATH}', kbPath);
}

// ── computeClosure ─────────────────────────────────────────────────────────────
//
// BFS from workflowId, 2 levels deep:
//   Level 1: target workflow's direct deps (personas, skills, templates, kb_docs, sub_workflows)
//   Level 2: each sub_workflow's own deps (personas, skills, templates, kb_docs)
//            but NOT its sub_workflows (stops at stub level)
//
// Returns:
//   { personas, skills, templates, workflows, kb_docs, config_fields }
//   All arrays, deduplicated, sorted.

function computeClosure(manifest, workflowId) {
  const empty = { personas: [], skills: [], templates: [], workflows: [], kb_docs: [], config_fields: [] };

  const edges = manifest && manifest.edges && manifest.edges.workflows;
  if (!edges) return empty;

  const workflowEdges = edges[workflowId];
  if (!workflowEdges) return empty;

  const personas      = new Set();
  const skills        = new Set();
  const templates     = new Set();
  const workflows     = new Set();
  const kb_docs       = new Set();
  const config_fields = new Set();

  // Add the target workflow itself
  workflows.add(`.forge/workflows/${workflowId}.md`);

  // Level-1 direct deps
  for (const p of workflowEdges.personas      || []) personas.add(p);
  for (const s of workflowEdges.skills        || []) skills.add(s);
  for (const t of workflowEdges.templates     || []) templates.add(t);
  for (const k of workflowEdges.kb_docs       || []) kb_docs.add(k);
  for (const f of workflowEdges.config_fields || []) config_fields.add(f);

  // Level-2: sub-workflow deps (personas/skills/templates/kb_docs, not sub-sub-workflows)
  for (const swPath of workflowEdges.sub_workflows || []) {
    workflows.add(swPath);
    const swId     = path.basename(swPath, '.md');
    const swEdges  = edges[swId];
    if (swEdges) {
      for (const p of swEdges.personas      || []) personas.add(p);
      for (const s of swEdges.skills        || []) skills.add(s);
      for (const t of swEdges.templates     || []) templates.add(t);
      for (const k of swEdges.kb_docs       || []) kb_docs.add(k);
      for (const f of swEdges.config_fields || []) config_fields.add(f);
    }
  }

  return {
    personas:      [...personas].sort(),
    skills:        [...skills].sort(),
    templates:     [...templates].sort(),
    workflows:     [...workflows].sort(),
    kb_docs:       [...kb_docs].sort(),
    config_fields: [...config_fields].sort(),
  };
}

// ── computeCapabilities ───────────────────────────────────────────────────────
//
// Counts materialized artifacts across the four lazy-materialised namespaces
// (workflows, personas, skills, templates). Commands are excluded — they are
// always present in fast mode (scaffolded eagerly) and don't move the needle.
//
// "Materialized" means:
//   - workflows: file exists AND its first non-blank line does not start with
//     the FAST_STUB_SENTINEL.
//   - personas/skills/templates: file exists.
//
// @param {object} manifest    Parsed structure-manifest.json
// @param {string} projectRoot Project root path
// @returns {object} {
//   current, total, percent,
//   byNamespace: { workflows: {current,total}, personas: {...}, ... }
// }
function computeCapabilities(manifest, projectRoot) {
  const namespaces = (manifest && manifest.namespaces) || {};
  const tracked = ['workflows', 'personas', 'skills', 'templates'];

  const byNamespace = {};
  let current = 0;
  let total = 0;

  for (const ns of tracked) {
    const cfg = namespaces[ns];
    if (!cfg || !Array.isArray(cfg.files) || !cfg.dir) {
      byNamespace[ns] = { current: 0, total: 0 };
      continue;
    }
    let nsCurrent = 0;
    for (const fname of cfg.files) {
      const absPath = path.resolve(projectRoot, cfg.dir, fname);
      if (!fs.existsSync(absPath)) continue;
      if (ns === 'workflows') {
        let content;
        try { content = fs.readFileSync(absPath, 'utf8'); } catch { continue; }
        const firstNonBlank = content.split('\n').find(line => line.trim().length > 0) || '';
        if (firstNonBlank.startsWith(FAST_STUB_SENTINEL)) continue;
      }
      nsCurrent++;
    }
    byNamespace[ns] = { current: nsCurrent, total: cfg.files.length };
    current += nsCurrent;
    total += cfg.files.length;
  }

  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  return { current, total, percent, byNamespace };
}

// ── predictCapabilitiesAfter ──────────────────────────────────────────────────
//
// Predicts what computeCapabilities() would return after a set of paths is
// materialized. Each path in `addPaths` is treated as if it became materialized
// (existing on disk and not a stub). Paths already materialized are not
// double-counted.
//
// @param {object} manifest
// @param {string} projectRoot
// @param {string[]} addPaths    Paths that this round will materialize.
// @returns {object} {
//   currentBefore, currentAfter, total, percentBefore, percentAfter, added
// }
function predictCapabilitiesAfter(manifest, projectRoot, addPaths) {
  const before = computeCapabilities(manifest, projectRoot);
  const namespaces = (manifest && manifest.namespaces) || {};
  const tracked = ['workflows', 'personas', 'skills', 'templates'];

  // Build a path → namespace lookup so we can credit each addPath correctly.
  // Also build a set of currently-materialized paths so we don't double-count.
  const expectedPaths = new Map(); // path → ns
  const materializedPaths = new Set();
  for (const ns of tracked) {
    const cfg = namespaces[ns];
    if (!cfg || !Array.isArray(cfg.files) || !cfg.dir) continue;
    for (const fname of cfg.files) {
      const rel = path.posix.join(cfg.dir, fname);
      expectedPaths.set(rel, ns);
      const absPath = path.resolve(projectRoot, cfg.dir, fname);
      if (!fs.existsSync(absPath)) continue;
      if (ns === 'workflows') {
        let content;
        try { content = fs.readFileSync(absPath, 'utf8'); } catch { continue; }
        const firstNonBlank = content.split('\n').find(line => line.trim().length > 0) || '';
        if (firstNonBlank.startsWith(FAST_STUB_SENTINEL)) continue;
      }
      materializedPaths.add(rel);
    }
  }

  let added = 0;
  for (const p of addPaths || []) {
    // Normalise the path for matching against expectedPaths keys.
    const norm = p.startsWith('./') ? p.slice(2) : p;
    if (!expectedPaths.has(norm)) continue;
    if (materializedPaths.has(norm)) continue;
    added++;
  }

  const currentAfter = before.current + added;
  const percentAfter = before.total > 0 ? Math.round((currentAfter / before.total) * 100) : 0;
  return {
    currentBefore: before.current,
    currentAfter,
    total: before.total,
    percentBefore: before.percent,
    percentAfter,
    added,
  };
}

// ── loadManifest / loadConfig (shared CLI helpers) ───────────────────────────

function loadManifest(projectRoot) {
  let manifestPath = path.join(projectRoot, '.forge', 'schemas', 'structure-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(path.join(projectRoot, '.forge', 'config.json'), 'utf8'));
      if (cfg && cfg.paths && cfg.paths.forgeRoot) {
        const alt = path.join(cfg.paths.forgeRoot, 'schemas', 'structure-manifest.json');
        if (fs.existsSync(alt)) manifestPath = alt;
      }
    } catch {}
  }
  if (!fs.existsSync(manifestPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return {};
  }
}

// ── _renderAnnouncement ──────────────────────────────────────────────────────
//
// Renders the standout fast-mode capability announcement: a framed em-dash
// block with banner badge, two indented progress-bar lines (current vs after),
// and a top + bottom rule. Single source of formatting — used by both the CLI
// `--announce` mode and tests.
//
// @param {object} p          predictCapabilitiesAfter() result
// @param {object} [opts]
// @param {boolean} [opts.allFlag]  Whether this is a `--all` invocation (changes
//                                  the "already materialised" copy)
// @returns {string} multi-line block (no trailing newline)

function _renderAnnouncement(p, opts) {
  const o = opts || {};
  // Lazy-require banners so test environments without the file (or with a
  // shadowed copy) can still exercise the module exports above.
  let banners;
  try { banners = require('./banners.cjs'); } catch { banners = null; }

  const FAST_TINT = [255, 208, 122];   // lantern yellow

  // Em-dash horizontal rules — zen-blue tinted via banners.ruleLine for
  // system-wide consistency. Falls back to plain em-dashes if banners is
  // unavailable in the test environment.
  const title = '🔥 Forge — Capability Upgrade (fast mode)';
  const topRule    = banners ? banners.ruleLine(title)  : `━━━ ${title} ` + '━'.repeat(3);
  const bottomRule = banners ? banners.ruleLine()       : '━'.repeat(65);

  const labelBefore = 'Currently  ';
  const labelAfter  = 'After      ';

  // progressBar already prints "n/total"; we add a percentage on the right.
  const bar = (cur) => banners
    ? banners.progressBar(cur, p.total, { width: 12, color: FAST_TINT })
    : `${cur}/${p.total}`;

  const lineBefore = `  ${labelBefore}${bar(p.currentBefore)}   ·   ${String(p.percentBefore).padStart(3)}%`;

  let lineAfter;
  if (p.added === 0) {
    lineAfter = o.allFlag
      ? `  ${labelAfter}${bar(p.currentBefore)}   ·   ${String(p.percentBefore).padStart(3)}%   already fully materialised — /forge:config mode full to flip the flag`
      : `  ${labelAfter}${bar(p.currentBefore)}   ·   ${String(p.percentBefore).padStart(3)}%   closure already materialised — refreshing in place`;
  } else {
    const addedNote = `+${p.added} artifact${p.added === 1 ? '' : 's'}`;
    lineAfter = `  ${labelAfter}${bar(p.currentAfter)}   ·   ${String(p.percentAfter).padStart(3)}%   ${addedNote}`;
  }

  return [topRule, '', lineBefore, lineAfter, '', bottomRule].join('\n');
}

// ── exports (for testing) ─────────────────────────────────────────────────────

module.exports = {
  computeClosure, resolveKbPath, resolvePath,
  computeCapabilities, predictCapabilitiesAfter,
  loadManifest,
  FAST_STUB_SENTINEL,
  _renderAnnouncement,   // exported for testing
};

// ── CLI guard ─────────────────────────────────────────────────────────────────

if (require.main === module) {
try {

  const argv = process.argv.slice(2);
  let mode = null;   // 'workflow' | 'closure' | 'target' | 'capabilities' | 'capabilities-after' | 'capabilities-after-all'
  let target = null;
  let allFlag = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--capabilities') {
      mode = 'capabilities';
    } else if (a === '--capabilities-after') {
      mode = 'capabilities-after';
    } else if (a === '--announce') {
      mode = 'announce';
    } else if (a === '--all') {
      allFlag = true;
    } else if ((a === '--workflow' || a === '--closure' || a === '--target') && argv[i + 1]) {
      // Preserve the source flag — used as `target` indicator unless a
      // capabilities/announce mode is already set
      if (mode !== 'capabilities-after' && mode !== 'announce') {
        mode = a.replace('--', '');
      }
      target = argv[++i];
    }
  }

  // Capabilities mode: print summary, exit 0.
  if (mode === 'capabilities') {
    const projectRoot = process.cwd();
    const manifest = loadManifest(projectRoot);
    const summary = computeCapabilities(manifest, projectRoot);
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    process.exit(0);
  }

  // Announce mode: emit a human-readable two-line announcement comparing
  // current capabilities to projected-after-materialise. Skips silently
  // (exit 0, no output) if mode is anything other than 'fast'.
  if (mode === 'announce') {
    const projectRoot = process.cwd();
    let configMode = 'full';
    try {
      const cfg = JSON.parse(fs.readFileSync(path.join(projectRoot, '.forge', 'config.json'), 'utf8'));
      if (cfg && cfg.mode) configMode = cfg.mode;
    } catch {}
    if (configMode !== 'fast') {
      process.exit(0);
    }
    const manifest = loadManifest(projectRoot);
    let addPaths = [];
    if (allFlag) {
      const namespaces = (manifest && manifest.namespaces) || {};
      for (const ns of ['workflows', 'personas', 'skills', 'templates']) {
        const cfg = namespaces[ns];
        if (!cfg || !Array.isArray(cfg.files) || !cfg.dir) continue;
        for (const fname of cfg.files) addPaths.push(path.posix.join(cfg.dir, fname));
      }
    } else if (target) {
      const workflowId = target.endsWith('.md') ? path.basename(target, '.md') : target;
      const closure = computeClosure(manifest, workflowId);
      addPaths = [
        ...closure.workflows,
        ...closure.personas,
        ...closure.skills,
        ...closure.templates,
      ];
    } else {
      process.stderr.write('Usage: ensure-ready.cjs --announce [--all | --workflow <id> | --target <path>]\n');
      process.exit(2);
    }
    const p = predictCapabilitiesAfter(manifest, projectRoot, addPaths);
    process.stdout.write(_renderAnnouncement(p, { allFlag }) + '\n');
    process.exit(0);
  }

  // Capabilities-after mode: predict post-materialise summary, exit 0.
  if (mode === 'capabilities-after') {
    const projectRoot = process.cwd();
    const manifest = loadManifest(projectRoot);
    let addPaths = [];
    if (allFlag) {
      // Predicting --all: every expected path is added.
      const namespaces = (manifest && manifest.namespaces) || {};
      for (const ns of ['workflows', 'personas', 'skills', 'templates']) {
        const cfg = namespaces[ns];
        if (!cfg || !Array.isArray(cfg.files) || !cfg.dir) continue;
        for (const fname of cfg.files) addPaths.push(path.posix.join(cfg.dir, fname));
      }
    } else if (target) {
      // Predicting per-workflow: closure-derived paths.
      const workflowId = target.endsWith('.md') ? path.basename(target, '.md') : target;
      const closure = computeClosure(manifest, workflowId);
      addPaths = [
        ...closure.workflows,
        ...closure.personas,
        ...closure.skills,
        ...closure.templates,
      ];
    } else {
      process.stderr.write('Usage: ensure-ready.cjs --capabilities-after [--all | --workflow <id> | --target <path>]\n');
      process.exit(2);
    }
    const prediction = predictCapabilitiesAfter(manifest, projectRoot, addPaths);
    process.stdout.write(JSON.stringify(prediction, null, 2) + '\n');
    process.exit(0);
  }

  if (!mode || !target) {
    process.stderr.write([
      'Usage: ensure-ready.cjs --workflow <id>             Exit 0=ready 1=needs-gen; stdout=JSON missing-list',
      '       ensure-ready.cjs --closure <id>              Print full transitive closure as JSON',
      '       ensure-ready.cjs --target <path>             Same as --workflow keyed by filename',
      '       ensure-ready.cjs --capabilities              Print current capability summary as JSON',
      '       ensure-ready.cjs --capabilities-after [--all | --workflow <id> | --target <path>]',
      '                                                    Predict capability summary after materialisation',
      '       ensure-ready.cjs --announce [--all | --workflow <id> | --target <path>]',
      '                                                    Emit a 2-line human-readable fast-mode capability',
      '                                                    announcement (silent if mode is not "fast")',
    ].join('\n') + '\n');
    process.exit(2);
  }

  // ── Resolve workflowId ───────────────────────────────────────────────────────

  let workflowId = target;
  if (mode === 'target') {
    workflowId = path.basename(target, '.md');
  }

  // ── Load structure-manifest ──────────────────────────────────────────────────

  const projectRoot = process.cwd();
  const manifest = loadManifest(projectRoot);

  // ── Load config ───────────────────────────────────────────────────────────────

  let config = null;
  try {
    config = JSON.parse(fs.readFileSync(path.join(projectRoot, '.forge', 'config.json'), 'utf8'));
  } catch {}

  const kbPath = resolveKbPath(config);

  // ── Compute closure ──────────────────────────────────────────────────────────

  const closure = computeClosure(manifest, workflowId);

  if (mode === 'closure') {
    process.stdout.write(JSON.stringify(closure, null, 2) + '\n');
    process.exit(0);
  }

  // ── Check readiness ──────────────────────────────────────────────────────────

  const missing  = [];
  const stubbed  = [];
  const modified = [];

  // All artifact paths in the closure (excluding kb_docs and config_fields)
  const allArtifacts = [
    ...closure.personas,
    ...closure.skills,
    ...closure.templates,
    ...closure.workflows,
  ];

  // Also include kb_docs with placeholder resolved
  for (const kbDoc of closure.kb_docs) {
    allArtifacts.push(resolvePath(kbDoc, kbPath));
  }

  for (const artifactPath of allArtifacts) {
    const absPath = path.resolve(projectRoot, artifactPath);
    if (!fs.existsSync(absPath)) {
      missing.push(artifactPath);
      continue;
    }
    const content = fs.readFileSync(absPath, 'utf8');
    if (content.startsWith(FAST_STUB_SENTINEL)) {
      stubbed.push(artifactPath);
    }
  }

  const needsGen = missing.length > 0 || stubbed.length > 0;

  const result = {
    workflowId,
    ready: !needsGen,
    missing,
    stubbed,
    modified,
    closure,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(needsGen ? 1 : 0);

} catch (err) {
  process.stderr.write(`× ensure-ready fatal: ${err.message}\n${err.stack}\n`);
  process.exit(1);
}
} // end if (require.main === module)
