#!/usr/bin/env node
// Forge session-start hook — runs on SessionStart
// 1. Injects Forge-awareness context if this project has a .forge/ directory.
// 2. Checks once per day whether a newer version is available.
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
const cacheFile = path.join(dataDir, 'update-check-cache.json');
const remoteUrl = 'https://raw.githubusercontent.com/Entelligentsia/forge/main/forge/.claude-plugin/plugin.json';
const checkInterval = 86400; // 24 hours in seconds

fs.mkdirSync(dataDir, { recursive: true });

// --- Forge-awareness context injection ---
let forgeContext = '';
if (fs.existsSync('.forge') && fs.existsSync(path.join('.forge', 'config.json'))) {
  forgeContext =
    'This project uses Forge AI-SDLC. Engineering knowledge base: engineering/. ' +
    'Generated workflows: .forge/workflows/. Sprint and task store: .forge/store/. ' +
    'Use the project slash commands (/plan-task, /implement, /sprint-plan) to drive development. ' +
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
    ? `Forge ${remoteVersion} available (you have ${local}). Run: /plugin install Entelligentsia/forge`
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

let cache = null;
if (fs.existsSync(cacheFile)) {
  try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch { cache = null; }
}

const elapsed = cache ? now - (cache.lastCheck || 0) : Infinity;

if (elapsed < checkInterval) {
  // Cache still fresh — use stored result.
  // If the local version has advanced since the cache was written (i.e. the
  // user just ran /plugin install), update migratedFrom so /forge:update knows
  // the pre-install baseline and reset lastCheck so we fetch a fresh remote
  // version on the next session.
  let postInstallMsg = '';
  if (cache.localVersion && cache.localVersion !== local) {
    const updated = { ...cache, migratedFrom: cache.localVersion, localVersion: local, lastCheck: 0 };
    try { fs.writeFileSync(cacheFile, JSON.stringify(updated)); } catch { /* non-fatal */ }
    if (fs.existsSync(path.join('.forge', 'config.json'))) {
      postInstallMsg = `Forge was updated to ${local} (was ${cache.localVersion}). Run /forge:update to apply changes to this project.`;
    }
  }
  const updateMsg = postInstallMsg || buildUpdateMsg(cache.remoteVersion || '', local);
  emit(forgeContext, updateMsg);
} else {
  // Cache expired or missing — fetch fresh.
  fetchRemoteVersion((remoteVersion) => {
    if (remoteVersion) {
      // Preserve migratedFrom if already set; seed it from current local version
      // when writing for the first time so /forge:update has a baseline.
      const migratedFrom = (cache && cache.migratedFrom) || (cache && cache.localVersion) || local;
      const newCache = { lastCheck: now, remoteVersion, localVersion: local, migratedFrom };
      try { fs.writeFileSync(cacheFile, JSON.stringify(newCache)); } catch { /* non-fatal */ }
    }
    const updateMsg = buildUpdateMsg(remoteVersion, local);
    emit(forgeContext, updateMsg);
  });
}
