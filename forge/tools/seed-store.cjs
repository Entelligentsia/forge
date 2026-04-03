#!/usr/bin/env node
'use strict';

// Forge tool: seed-store
// Bootstrap the JSON store from an existing engineering/ directory structure.
// Usage: seed-store [--dry-run]

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const cwd = process.cwd();

function readConfig() {
  const configPath = path.join(cwd, '.forge', 'config.json');
  if (!fs.existsSync(configPath)) {
    console.error('Error: .forge/config.json not found. Run /forge:init first.');
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    console.error(`Error: .forge/config.json is not valid JSON: ${e.message}`); process.exit(1);
  }
}

function writeJson(filePath, data) {
  if (DRY_RUN) {
    console.log(`[dry-run] would write: ${path.relative(cwd, filePath)}`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function extractTitle(dir, fallback) {
  for (const file of ['PLAN.md', 'PROGRESS.md', 'INDEX.md', 'README.md']) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/^#\s+(.+)/m);
    if (m) return m[1].trim();
  }
  return fallback;
}

function inferTaskStatus(taskDir) {
  const p = path.join(taskDir, 'PROGRESS.md');
  if (!fs.existsSync(p)) return 'planned';
  const content = fs.readFileSync(p, 'utf8').toLowerCase();
  if (content.includes('committed')) return 'committed';
  if (content.includes('approved')) return 'approved';
  if (content.includes('implemented')) return 'implemented';
  if (content.includes('implementing')) return 'implementing';
  return 'planned';
}

function inferSprintStatus(sprintPath, taskDirs) {
  if (taskDirs.length === 0) return 'planning';
  const allCommitted = taskDirs.every(t => inferTaskStatus(path.join(sprintPath, t)) === 'committed');
  return allCommitted ? 'completed' : 'active';
}

const config = readConfig();
const prefix    = config.project?.prefix || 'PROJ';
const engPath   = config.paths?.engineering || 'engineering';
const storePath = config.paths?.store || '.forge/store';

const sprintsDir = path.join(cwd, engPath, 'sprints');
const bugsDir    = path.join(cwd, engPath, 'bugs');

let sprintCount = 0, taskCount = 0, bugCount = 0;

// --- Sprints and Tasks ---
if (fs.existsSync(sprintsDir)) {
  const sprintDirs = fs.readdirSync(sprintsDir)
    .filter(e => /^S\d+$/i.test(e) && fs.statSync(path.join(sprintsDir, e)).isDirectory())
    .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

  for (const sprintDir of sprintDirs) {
    const sprintFullPath = path.join(sprintsDir, sprintDir);
    const sprintId = `${prefix}-${sprintDir.toUpperCase()}`;

    const taskDirs = fs.readdirSync(sprintFullPath)
      .filter(e => /^T\d+$/i.test(e) && fs.statSync(path.join(sprintFullPath, e)).isDirectory())
      .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

    const taskIds = taskDirs.map(t => `${prefix}-${sprintDir.toUpperCase()}-${t.toUpperCase()}`);

    writeJson(path.join(cwd, storePath, 'sprints', `${sprintId}.json`), {
      sprintId,
      title: extractTitle(sprintFullPath, `Sprint ${sprintDir.toUpperCase()}`),
      status: inferSprintStatus(sprintFullPath, taskDirs),
      taskIds,
      createdAt: new Date().toISOString(),
    });
    sprintCount++;

    for (const taskDir of taskDirs) {
      const taskFullPath = path.join(sprintFullPath, taskDir);
      const taskId = `${prefix}-${sprintDir.toUpperCase()}-${taskDir.toUpperCase()}`;
      writeJson(path.join(cwd, storePath, 'tasks', `${taskId}.json`), {
        taskId,
        sprintId,
        title: extractTitle(taskFullPath, `Task ${taskDir.toUpperCase()}`),
        status: inferTaskStatus(taskFullPath),
        path: path.join(engPath, 'sprints', sprintDir, taskDir),
      });
      taskCount++;
    }
  }
}

// --- Bugs ---
if (fs.existsSync(bugsDir)) {
  const bugDirs = fs.readdirSync(bugsDir)
    .filter(e => /^B\d+$/i.test(e) && fs.statSync(path.join(bugsDir, e)).isDirectory())
    .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

  for (const bugDir of bugDirs) {
    const bugFullPath = path.join(bugsDir, bugDir);
    const num = bugDir.slice(1).padStart(2, '0');
    const bugId = `${prefix}-BUG-${num}`;
    writeJson(path.join(cwd, storePath, 'bugs', `${bugId}.json`), {
      bugId,
      title: extractTitle(bugFullPath, `Bug ${num}`),
      severity: 'minor',
      status: 'reported',
      path: path.join(engPath, 'bugs', bugDir),
      reportedAt: new Date().toISOString(),
    });
    bugCount++;
  }
}

const prefix_ = DRY_RUN ? '[dry-run] ' : '';
console.log(`${prefix_}Seeded: ${sprintCount} sprint(s), ${taskCount} task(s), ${bugCount} bug(s)`);
