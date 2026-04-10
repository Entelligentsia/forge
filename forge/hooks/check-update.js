#!/usr/bin/env node
// Forge session-start hook — runs on SessionStart
// 1. Injects Forge-awareness context if this project has a .forge/ directory.
// 2. Checks once per day whether a newer version is available.
// 3. Detects distribution switches (forge@forge ↔ forge@skillforge) and
//    refreshes paths.forgeRoot in .forge/config.json so subagents always
//    reference the correct installed plugin path.
//
// Uses only Node.js built-ins — no npm dependencies required.
// Works on Linux, macOS, and Windows wherever Claude Code runs.

'use strict';

// This hook must never exit non-zero — a hook failure surfaces as noise to the
// user and blocks session start context. Any uncaught exception exits 0.
process.on('uncaughtException', () => process.exit(0));

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || '.';
const dataDir = process.env.CLAUDE_PLUGIN_DATA || path.join(os.tmpdir(), 'forge-plugin-data');
// Plugin-level cache: throttle only (lastCheck, remoteVersion) — shared across all projects.
const pluginCacheFile = path.join(dataDir, 'update-check-cache.json');
// Project-level cache: migration state (migratedFrom, localVersion, distribution, forgeRoot) — per project.
const forgeDir = '.forge';
const hasForge = fs.existsSync(forgeDir) && fs.existsSync(path.join(forgeDir, 'config.json'));
const projectCacheFile = path.join(forgeDir, 'update-check-cache.json');

// Distribution detection — derived from CLAUDE_PLUGIN_ROOT path at runtime.
// The cache path encodes the marketplace name, making this more reliable than
// reading fields from plugin.json (which may be stale after a switch).
function detectDistribution(root) {
  return root.includes('/cache/skillforge/forge/') ? 'forge@skillforge' : 'forge@forge';
}
const currentDistribution = detectDistribution(pluginRoot);

// Determine the correct update-check URL for this distribution.
// Each distribution's plugin.json carries its own updateUrl pointing at the
// branch it was installed from (main for forge@forge, release for forge@skillforge),
// so we read it directly — no hardcoded per-distribution URLs needed.
const FALLBACK_UPDATE_URL = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';
function getUpdateUrl() {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf8'));
    return manifest.updateUrl || FALLBACK_UPDATE_URL;
  } catch { return FALLBACK_UPDATE_URL; }
}
const remoteUrl = getUpdateUrl();
const checkInterval = 86400; // 24 hours in seconds

fs.mkdirSync(dataDir, { recursive: true });

// --- Forge-awareness context injection ---
let forgeContext = '';
if (fs.existsSync('.forge') && fs.existsSync(path.join('.forge', 'config.json'))) {
  forgeContext =
    'This project uses Forge AI-SDLC. Engineering knowledge base: engineering/. ' +
    'Generated workflows: .forge/workflows/. Sprint and task store: .forge/store/. ' +
    'Use the project slash commands (/plan, /implement, /sprint-plan) to drive development. ' +
    'Run /forge:health to check knowledge base currency.';
}

// --- Update check helpers ---
function localVersion() {
  try {
    const p = path.join(pluginRoot, '.claude-plugin', 'plugin.json');
    return JSON.parse(fs.readFileSync(p, 'utf8')).version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function fetchRemoteVersion(cb) {
  https.get(remoteUrl, { timeout: 5000 }, (res) => {
    let body = '';
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => {
      try { cb(JSON.parse(body).version || ''); } catch { cb(''); }
    });
  }).on('error', () => cb(''))
    .on('timeout', function() { this.destroy(); cb(''); });
}

function buildUpdateMsg(remoteVersion, local) {
  return remoteVersion && remoteVersion !== local
    ? `Forge ${remoteVersion} available (you have ${local}). Run /forge:update to review changes and update.`
    : '';
}

function emit(forgeCtx, updateMsg) {
  if (!forgeCtx && !updateMsg) return;
  const combined = [forgeCtx, updateMsg].filter(Boolean).join(' ');
  const escaped = combined.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
  process.stdout.write(`{"additionalContext":"${escaped}"}\n`);
}

// --- Main logic ---
const local = localVersion();
const now = Math.floor(Date.now() / 1000);

// Plugin-level cache: throttle (lastCheck, remoteVersion) — shared, not migration state.
let pluginCache = null;
if (fs.existsSync(pluginCacheFile)) {
  try { pluginCache = JSON.parse(fs.readFileSync(pluginCacheFile, 'utf8')); } catch { pluginCache = null; }
}

// Project-level cache: migration state — per project.
let projectCache = null;
if (hasForge && fs.existsSync(projectCacheFile)) {
  try { projectCache = JSON.parse(fs.readFileSync(projectCacheFile, 'utf8')); } catch { projectCache = null; }
}

// --- Distribution + forgeRoot sync (always runs before update-check logic) ---
// Refreshes paths.forgeRoot in config.json and the distribution/forgeRoot fields
// in the project cache. Handles distribution switches transparently — the user
// gets a clear message and all path references are corrected before any command runs.
let distributionSwitchMsg = '';
if (hasForge && pluginRoot !== '.') {
  // Keep paths.forgeRoot in .forge/config.json in sync with the active plugin root.
  // Generated workflows read this to invoke tools without needing CLAUDE_PLUGIN_ROOT.
  try {
    const configPath = path.join(forgeDir, 'config.json');
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!cfg.paths) cfg.paths = {};
    if (cfg.paths.forgeRoot !== pluginRoot) {
      cfg.paths.forgeRoot = pluginRoot;
      fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');
    }
  } catch { /* non-fatal */ }

  if (projectCache) {
    const storedRoot = projectCache.forgeRoot;
    const storedDist = projectCache.distribution;
    const switched = storedRoot && storedRoot !== pluginRoot;

    // Build distribution switch message when the active plugin path changed and
    // the distribution name is different (e.g. forge@skillforge → forge@forge).
    if (switched && storedDist && storedDist !== currentDistribution) {
      const versionNote = projectCache.localVersion && projectCache.localVersion !== local
        ? ` Version: ${projectCache.localVersion} → ${local}.`
        : '';
      distributionSwitchMsg =
        `Plugin distribution switched from ${storedDist} to ${currentDistribution}.${versionNote}` +
        ` paths.forgeRoot updated. Run /forge:update to verify migration state.`;
    }

    // Sync distribution + forgeRoot into the project cache whenever they drift.
    if (storedRoot !== pluginRoot || storedDist !== currentDistribution) {
      try {
        const updated = { ...projectCache, distribution: currentDistribution, forgeRoot: pluginRoot };
        fs.writeFileSync(projectCacheFile, JSON.stringify(updated));
        projectCache = updated; // keep in-memory copy consistent
      } catch { /* non-fatal */ }
    }
  }
}

const elapsed = pluginCache ? now - (pluginCache.lastCheck || 0) : Infinity;

if (elapsed < checkInterval) {
  // Plugin cache still fresh — use stored remote version.
  // Detect post-install: if the project's recorded localVersion differs from
  // the running plugin version, the plugin was updated since last migration.
  let postInstallMsg = '';
  if (hasForge && projectCache && projectCache.localVersion && projectCache.localVersion !== local) {
    // Record the pre-install version as baseline, update localVersion.
    const updated = {
      ...projectCache,
      migratedFrom: projectCache.localVersion,
      localVersion: local,
      distribution: currentDistribution,
      forgeRoot: pluginRoot,
    };
    try { fs.writeFileSync(projectCacheFile, JSON.stringify(updated)); } catch { /* non-fatal */ }
    // Reset plugin cache lastCheck so we fetch a fresh remote version next session.
    try { fs.writeFileSync(pluginCacheFile, JSON.stringify({ ...pluginCache, lastCheck: 0 })); } catch { /* non-fatal */ }
    // Suppress post-install message when a distribution switch message already covers the event.
    if (!distributionSwitchMsg) {
      postInstallMsg = `Forge was updated to ${local} (was ${projectCache.localVersion}). Run /forge:update to review changes and update.`;
    }
  }
  const updateMsg = distributionSwitchMsg || postInstallMsg || buildUpdateMsg((pluginCache && pluginCache.remoteVersion) || '', local);
  emit(forgeContext, updateMsg);
} else {
  // Plugin cache expired or missing — fetch fresh remote version.
  fetchRemoteVersion((remoteVersion) => {
    if (remoteVersion) {
      // Update plugin-level throttle cache.
      try { fs.writeFileSync(pluginCacheFile, JSON.stringify({ lastCheck: now, remoteVersion })); } catch { /* non-fatal */ }
      // Seed project-level cache on first run if not yet present.
      if (hasForge && !projectCache) {
        try {
          fs.writeFileSync(projectCacheFile, JSON.stringify({
            migratedFrom: local, localVersion: local,
            distribution: currentDistribution, forgeRoot: pluginRoot,
          }));
        } catch { /* non-fatal */ }
      } else if (hasForge && projectCache && !projectCache.localVersion) {
        // Backfill localVersion (and distribution/forgeRoot) if missing.
        try {
          fs.writeFileSync(projectCacheFile, JSON.stringify({
            ...projectCache, localVersion: local,
            distribution: currentDistribution, forgeRoot: pluginRoot,
          }));
        } catch { /* non-fatal */ }
      }
    }
    const updateMsg = distributionSwitchMsg || buildUpdateMsg(remoteVersion, local);
    emit(forgeContext, updateMsg);
  });
}
