#!/usr/bin/env node
'use strict';

/**
 * substitute-placeholders.cjs — Phase 3 (Materialize) engine for FR-002.
 *
 * Reads config.json and project-context.json, walks every file under
 * a base-pack directory, replaces {{KEY}} placeholders, and writes materialised
 * output to the appropriate output directories.
 *
 * Output path mapping (--target claude-code, default):
 *   base-pack/commands/  → <outRoot>/.claude/commands/forge/
 *   base-pack/personas/  → <outRoot>/.forge/personas/
 *   base-pack/skills/    → <outRoot>/.forge/skills/
 *   base-pack/workflows/ → <outRoot>/.forge/workflows/
 *   base-pack/templates/ → <outRoot>/.forge/templates/
 *
 * Output path mapping (--target pi):
 *   base-pack/personas/  → <outRoot>/personas/
 *   base-pack/skills/    → <outRoot>/skills/
 *   base-pack/workflows/ → <outRoot>/workflows/  (including _fragments/)
 *   base-pack/templates/ → <outRoot>/templates/
 *   base-pack/commands/  → SKIPPED (pi commands are registered programmatically)
 *
 * CLI:
 *   node substitute-placeholders.cjs
 *     [--target <claude-code|pi>]   (default: claude-code)
 *     [--src <path>]                (base-pack source dir for --target pi)
 *     [--forge-root <path>]
 *     [--base-pack <path>]
 *     [--config <path>]
 *     [--context <path>]
 *     [--rules <path>]
 *     [--out <projectRoot>]
 *     [--dry-run]
 *
 * Exported API (for unit testing):
 *   buildSubstitutionMap(config, context, rules?)
 *   applySubstitutions(text, map)
 *   extractFrontmatter(content)
 *   substituteFile(content, map)
 *   walkBasePackPi(src, outRoot, dryRun, io)
 *   PI_TARGET_SUBDIRS
 *   REQUIRED_KEYS
 *   RUNTIME_PASSTHROUGH_KEYS
 */

const fs = require('node:fs');
const path = require('node:path');
const { getCommandsSubdir } = require('./lib/paths.cjs');

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * Keys that must be present in the substitution map. Their absence causes
 * process.exit(1) (or a throw in library mode).
 */
const REQUIRED_KEYS = new Set(['PROJECT_NAME', 'PREFIX']);

/**
 * Runtime passthrough keys: placeholders filled at runtime by tools such as
 * collate.cjs. These MUST NOT be replaced by this tool. Any {{KEY}} whose key
 * is in this set is left untouched in the output.
 */
const RUNTIME_PASSTHROUGH_KEYS = new Set([
  'DATE',
  'SPRINT_ID',
  'TASK_ID',
  'ROLE',
  'MODEL',
  'PHASES',
  'INPUT',
  'OUTPUT',
  'COST',
  'INPUT_TOKENS',
  'OUTPUT_TOKENS',
  'CACHE_READ',
  'CACHE_WRITE',
  'TOTAL_INPUT_TOKENS',
  'TOTAL_OUTPUT_TOKENS',
  'TOTAL_CACHE_READ_TOKENS',
  'TOTAL_CACHE_WRITE_TOKENS',
  'TOTAL_COST_USD',
  'placeholder',
]);

// ── Output path mapping ──────────────────────────────────────────────────────

/**
 * Maps a base-pack subdirectory name to an output directory path relative to
 * the project root. The 'commands' entry is computed dynamically from the
 * project prefix via getCommandsSubdir() — see walkBasePack.
 */
const SUBDIR_OUTPUT_MAP = {
  personas:  path.join('.forge', 'personas'),
  skills:    path.join('.forge', 'skills'),
  workflows: path.join('.forge', 'workflows'),
  templates: path.join('.forge', 'templates'),
};

/**
 * Subdirectories included when --target pi is used.
 * 'commands' is explicitly excluded — pi commands are registered
 * programmatically in TypeScript, not via .md files.
 *
 * Exported for unit tests (Test Group 15).
 */
const PI_TARGET_SUBDIRS = new Set(['workflows', 'personas', 'skills', 'templates']);

// ── Frontmatter extraction ───────────────────────────────────────────────────

/**
 * Extract YAML frontmatter from a file's content.
 *
 * The opening `---` must be at line 1, column 0 (no leading whitespace) to
 * avoid false positives from `---` horizontal rules in Markdown body content.
 *
 * @param {string} content
 * @returns {{ frontmatter: string|null, body: string }}
 */
function extractFrontmatter(content) {
  // Opening --- must be at the very start of the file, at column 0.
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    return { frontmatter: null, body: content };
  }

  // Find the closing ---
  const lines = content.split('\n');
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---' || lines[i] === '---\r') {
      // Closing delimiter found at line i (0-indexed)
      // Reconstruct frontmatter (lines 0..i inclusive) and body (lines i+1..)
      const frontmatterLines = lines.slice(0, i + 1);
      const bodyLines = lines.slice(i + 1);

      // Re-attach trailing newline to closing --- so frontmatter ends with \n
      const frontmatter = frontmatterLines.join('\n') + '\n';
      const body = bodyLines.join('\n');

      return { frontmatter, body };
    }
  }

  // No closing --- found — treat entire content as body (malformed frontmatter)
  return { frontmatter: null, body: content };
}

// ── Substitution ─────────────────────────────────────────────────────────────

/**
 * Apply substitution map to a string. Keys in RUNTIME_PASSTHROUGH_KEYS are
 * left intact. Unknown keys are also left intact (missing optional keys).
 *
 * @param {string} text
 * @param {Map<string, string>} map
 * @returns {string}
 */
function applySubstitutions(text, map) {
  // Only match placeholders whose keys are ALL_CAPS_WITH_UNDERSCORES or
  // lowercase-with-hyphens (for skill names). Dot-notation is intentionally
  // NOT matched — T03 uses flat keys only.
  return text.replace(/\{\{([A-Za-z][A-Za-z0-9_-]*)\}\}/g, (full, key) => {
    if (RUNTIME_PASSTHROUGH_KEYS.has(key)) return full;
    if (map.has(key)) return map.get(key);
    // Unknown key — leave intact (missing optional)
    return full;
  });
}

/**
 * Apply substitutions to a file's content, preserving frontmatter byte-for-byte.
 *
 * @param {string} content
 * @param {Map<string, string>} map
 * @returns {string}
 */
function substituteFile(content, map) {
  const { frontmatter, body } = extractFrontmatter(content);
  if (frontmatter === null) {
    return applySubstitutions(content, map);
  }
  // Frontmatter is preserved byte-for-byte; only the body gets substitution
  return frontmatter + applySubstitutions(body, map);
}

// ── Substitution map builder ──────────────────────────────────────────────────

/**
 * Build the flat substitution map from config.json and project-context.json.
 *
 * @param {object} config       — parsed .forge/config.json
 * @param {object|null} context — parsed project-context.json (may be null)
 * @param {object|null} rules   — parsed build-base-pack-rules.json (optional;
 *                                loaded from forge root if omitted in CLI mode)
 * @returns {Map<string, string>}
 * @throws {Error} if PROJECT_NAME or PREFIX is missing
 */
function buildSubstitutionMap(config, context, rules) {
  const project = (config && config.project) || {};
  const commands = (config && config.commands) || {};
  const paths = (config && config.paths) || {};
  const engRoot = paths.engineering || 'engineering';

  // ── Validate required keys ─────────────────────────────────────────────────
  // PROJECT_NAME is sourced from config.project.name OR context.project.name
  const projectName = (project.name) || (context && context.project && context.project.name) || '';
  const prefix = (project.prefix) || (context && context.project && context.project.prefix) || '';

  if (!projectName) {
    throw new Error('substitute-placeholders: missing required key PROJECT_NAME (config.project.name)');
  }
  if (!prefix) {
    throw new Error('substitute-placeholders: missing required key PREFIX (config.project.prefix)');
  }

  const map = new Map();

  // ── Config-sourced keys ────────────────────────────────────────────────────
  map.set('PROJECT_NAME', projectName);
  map.set('PREFIX', prefix);
  map.set('TEST_COMMAND', commands.test || '');
  map.set('LINT_COMMAND', commands.lint || '');
  map.set('KB_PATH', engRoot + '/architecture');

  // ── project-context.json sourced keys ─────────────────────────────────────
  if (context) {
    const arch = context.architecture || {};
    const frameworks = arch.frameworks || {};
    const deployment = context.deployment || {};
    const conventions = context.conventions || {};
    const verification = context.verification || {};

    // ENTITY_MODEL — entities array joined with ', '
    const entities = Array.isArray(context.entities) ? context.entities : [];
    map.set('ENTITY_MODEL', entities.join(', '));

    // DATA_ACCESS — direct string
    map.set('DATA_ACCESS', arch.dataAccess || '');

    // KEY_DIRECTORIES — array joined with ', '
    const keyDirs = Array.isArray(arch.keyDirectories) ? arch.keyDirectories : [];
    map.set('KEY_DIRECTORIES', keyDirs.join(', '));

    // TECHNICAL_DEBT — array joined with ', '
    const techDebt = Array.isArray(context.technicalDebt) ? context.technicalDebt : [];
    map.set('TECHNICAL_DEBT', techDebt.join(', '));

    // IMPACT_CATEGORIES — array joined with ', '
    const impact = Array.isArray(context.impactCategories) ? context.impactCategories : [];
    map.set('IMPACT_CATEGORIES', impact.join(', '));

    // DEPLOYMENT_ENVIRONMENTS — markdown table
    const envs = Array.isArray(deployment.environments) ? deployment.environments : [];
    map.set('DEPLOYMENT_ENVIRONMENTS', renderDeploymentTable(envs));

    // BRANCHING_CONVENTION — direct string
    map.set('BRANCHING_CONVENTION', conventions.branching || '');

    // STACK_SUMMARY — backend + frontend + database, empty parts omitted
    const stackParts = [frameworks.backend, frameworks.frontend, frameworks.database]
      .filter(Boolean);
    map.set('STACK_SUMMARY', stackParts.join(' + '));

    // VERIFICATION_COMMANDS — comma-separated non-empty command values
    const verificationValues = Object.values(verification).filter(Boolean);
    map.set('VERIFICATION_COMMANDS', verificationValues.join(', '));

    // SKILL_DIRECTIVES — 'skill → persona1, persona2' per entry
    const skillWiring = Array.isArray(context.skillWiring) ? context.skillWiring : [];
    const skillLines = skillWiring.map(entry => {
      const personas = Array.isArray(entry.personas) ? entry.personas : [];
      return `${entry.skill} → ${personas.join(', ')}`;
    });
    map.set('SKILL_DIRECTIVES', skillLines.join('\n'));
  } else {
    // No context — set defaults for all context-sourced keys
    for (const key of [
      'ENTITY_MODEL', 'DATA_ACCESS', 'KEY_DIRECTORIES', 'TECHNICAL_DEBT',
      'IMPACT_CATEGORIES', 'DEPLOYMENT_ENVIRONMENTS', 'BRANCHING_CONVENTION',
      'STACK_SUMMARY', 'VERIFICATION_COMMANDS', 'SKILL_DIRECTIVES',
    ]) {
      map.set(key, '');
    }
  }

  // ── Skill-context blocks ───────────────────────────────────────────────────
  // These are rendered by joining the pre-substituted lines with \n and then
  // performing normal placeholder substitution on the joined block.
  //
  // Advisory Note 1: GENERIC_SKILL_PROJECT_CONTEXT uses empty array if the
  // 'generic' key is absent from personaProjectContext (treat as empty, not throw).

  const personaContextMap = (rules && rules.personaProjectContext) || {};

  const PERSONA_CONTEXT_KEYS = {
    ARCHITECT_SKILL_PROJECT_CONTEXT: 'architect',
    ENGINEER_SKILL_PROJECT_CONTEXT: 'engineer',
    SUPERVISOR_SKILL_PROJECT_CONTEXT: 'supervisor',
    COLLATOR_SKILL_PROJECT_CONTEXT: 'collator',
    BUG_FIXER_SKILL_PROJECT_CONTEXT: 'bug-fixer',
    QA_ENGINEER_SKILL_PROJECT_CONTEXT: 'qa-engineer',
    GENERIC_SKILL_PROJECT_CONTEXT: 'generic',
  };

  for (const [placeholder, personaKey] of Object.entries(PERSONA_CONTEXT_KEYS)) {
    const lines = Array.isArray(personaContextMap[personaKey]) ? personaContextMap[personaKey] : [];
    if (lines.length === 0) {
      map.set(placeholder, '');
      continue;
    }
    // Join lines, then apply substitutions from the map built so far
    const raw = lines.join('\n');
    const substituted = applySubstitutions(raw, map);
    map.set(placeholder, substituted);
  }

  return map;
}

// ── Rendering helpers ─────────────────────────────────────────────────────────

/**
 * Render a deployment environments array as a Markdown table.
 *
 * @param {Array<{name:string, frontend:string, backend:string, region:string}>} envs
 * @returns {string}
 */
function renderDeploymentTable(envs) {
  if (!Array.isArray(envs) || envs.length === 0) return '';
  const header = '| Environment | Frontend | Backend | Region |';
  const sep = '|---|---|---|---|';
  const rows = envs.map(e =>
    `| ${e.name || ''} | ${e.frontend || ''} | ${e.backend || ''} | ${e.region || ''} |`
  );
  return [header, sep, ...rows].join('\n');
}

// ── Walker ────────────────────────────────────────────────────────────────────

/**
 * Walk the base-pack directory and write substituted files to outRoot.
 *
 * Advisory Note 3: every output path is resolved and checked to be under outRoot
 * to prevent path traversal via symlinks or '..' segments.
 *
 * @param {string} basePack           — absolute path to the base-pack directory
 * @param {Map<string, string>} map
 * @param {string} outRoot            — absolute project root (e.g. '/home/user/myproject')
 * @param {boolean} dryRun            — if true, perform no writes
 * @param {{ warn: function }} io     — pluggable stderr for warnings
 * @param {Set<string>|null} categoryFilter — Defect E: if set, only walk matching subdirs
 */
function walkBasePack(basePack, map, outRoot, dryRun, io, categoryFilter) {
  const warn = (io && io.warn) || ((msg) => process.stderr.write(msg + '\n'));

  // Extract prefix from substitution map for commands path computation
  const prefix = map.get('PREFIX') || '';
  const commandsSubdir = prefix ? getCommandsSubdir(prefix) : 'forge';

  // Sorted readdir for deterministic idempotent output (Advisory Note 7)
  const topEntries = fs.readdirSync(basePack).sort();
  for (const subdir of topEntries) {
    const subdirPath = path.join(basePack, subdir);
    const stat = fs.statSync(subdirPath);
    if (!stat.isDirectory()) continue;

    // Defect E: skip subdirs not in the category filter when one is provided
    if (categoryFilter !== null && categoryFilter !== undefined && !categoryFilter.has(subdir)) {
      continue;
    }

    let relOutputDir;
    if (subdir === 'commands') {
      relOutputDir = path.join('.claude', 'commands', commandsSubdir);
    } else {
      relOutputDir = SUBDIR_OUTPUT_MAP[subdir];
    }
    if (!relOutputDir) {
      warn(`substitute-placeholders: unknown base-pack subdir "${subdir}" — skipping`);
      continue;
    }

    walkDir(subdirPath, relOutputDir, outRoot, map, dryRun, warn);
  }
}

/**
 * Recursively walk a directory, substituting and writing each file.
 *
 * FR-004 fix: uses `entry` (bare filename from readdirSync) instead of
 * `path.relative(baseDir, srcPath)` which caused double-nesting when
 * recursing into subdirectories like _fragments/. The output directory
 * is already tracked via `relOutputDir` (updated on each recursive
 * descent), so using just the filename is sufficient.
 */
function walkDir(currentDir, relOutputDir, outRoot, map, dryRun, warn) {
  const entries = fs.readdirSync(currentDir).sort();
  for (const entry of entries) {
    const srcPath = path.join(currentDir, entry);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      const childRelOutputDir = path.join(relOutputDir, entry);
      walkDir(srcPath, childRelOutputDir, outRoot, map, dryRun, warn);
      continue;
    }

    if (!stat.isFile()) continue;

    const relFile = entry;
    const outPath = path.resolve(outRoot, relOutputDir, relFile);

    // Path traversal defence: outPath must be inside outRoot
    const safeOutRoot = path.resolve(outRoot);
    if (!outPath.startsWith(safeOutRoot + path.sep) && outPath !== safeOutRoot) {
      warn(`substitute-placeholders: skipping file outside outRoot: ${outPath}`);
      continue;
    }

    const content = fs.readFileSync(srcPath, 'utf8');
    const substituted = substituteFile(content, map);

    if (!dryRun) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, substituted, 'utf8');
    }
  }
}

// ── Pi target walker ─────────────────────────────────────────────────────────

/**
 * Walk the base-pack directory and write files to outRoot for --target pi.
 *
 * Shares ~80% of walkBasePack logic; differs only in output-path mapping:
 *   - Output is flat (e.g., `workflows/` not `.forge/workflows/`)
 *   - Only PI_TARGET_SUBDIRS are included; all others are silently skipped
 *   - Substitution map is always new Map() — all {{KEY}} tokens preserved
 *   - Path-traversal defence (same outPath.startsWith(safeOutRoot) check as walkBasePack)
 *
 * @param {string} src      — absolute path to base-pack source directory
 * @param {string} outRoot  — absolute output root
 * @param {boolean} dryRun  — if true, perform no writes
 * @param {{ warn: function }} io — pluggable stderr for warnings
 */
function walkBasePackPi(src, outRoot, dryRun, io) {
  const warn = (io && io.warn) || ((msg) => process.stderr.write(msg + '\n'));

  // Empty substitution map — all {{KEY}} tokens preserved (pass-through)
  const emptyMap = new Map();

  const topEntries = fs.readdirSync(src).sort();
  for (const subdir of topEntries) {
    const subdirPath = path.join(src, subdir);
    const stat = fs.statSync(subdirPath);
    if (!stat.isDirectory()) continue;

    if (!PI_TARGET_SUBDIRS.has(subdir)) {
      // Expected skips (e.g., commands/) are debug-level; no user-facing warning
      continue;
    }

    // Flat layout: output directly to outRoot/<subdir>/... (no .forge/ wrapper)
    walkDir(subdirPath, subdir, outRoot, emptyMap, dryRun, warn);
  }
}

// ── CLI entry point ───────────────────────────────────────────────────────────

if (require.main === module) {
  try {
    const argv = process.argv.slice(2);

    // ── Defect C fix: short-circuit --help/-h BEFORE any path resolution ────────
    if (argv.includes('--help') || argv.includes('-h')) {
      process.stdout.write([
        'substitute-placeholders.cjs — Phase 3 (Materialize) engine.',
        '',
        'Usage:',
        '  node substitute-placeholders.cjs [options]',
        '',
        'Options:',
        '  --target <claude-code|pi>  Output layout target (default: claude-code)',
        '  --src <path>               Base-pack source dir for --target pi',
        '  --forge-root <path>        Forge plugin root directory',
        '  --base-pack <path>         Base-pack directory (probes .base-pack/ then init/base-pack/)',
        '  --config <path>            Path to .forge/config.json',
        '  --context <path>           Path to project-context.json',
        '  --rules <path>             Path to build-base-pack-rules.json',
        '  --out <path>               Output root directory (default: cwd)',
        '  --dry-run                  Preview without writing',
        '  --category <name[,name]>   Limit materialisation to named subdirectories',
        '                             (personas, skills, workflows, templates, commands)',
        '  --help, -h                 Show this message and exit',
      ].join('\n') + '\n');
      process.exit(0);
    }

    const args = parseCliArgs(argv);

    const dryRun = args.dryRun || false;
    const target = args.target || 'claude-code';

    // Validate target
    const VALID_TARGETS = new Set(['claude-code', 'pi']);
    if (!VALID_TARGETS.has(target)) {
      process.stderr.write(
        `substitute-placeholders: unknown --target "${target}". Valid targets: claude-code, pi\n`
      );
      process.exit(1);
    }

    // Resolve output root
    const outRoot = args.out || process.cwd();

    if (target === 'pi') {
      // ── --target pi dispatch ──────────────────────────────────────────────

      // Warn if --config, --context, or --rules were passed (they are ignored)
      if (args.config || args.context || args.rules) {
        process.stderr.write(
          'Warning: --config and --context are ignored when --target pi\n'
        );
      }

      // Resolve --src (default: <forgeRoot>/init/base-pack)
      const forgeRoot = args.forgeRoot || resolveForgeRoot();
      const src = args.src || path.join(forgeRoot, 'init', 'base-pack');
      if (!fs.existsSync(src)) {
        process.stderr.write(`substitute-placeholders: --src path not found at ${src}\n`);
        process.exit(1);
      }

      // Walk pi base-pack (pass-through, no substitution)
      walkBasePackPi(src, outRoot, dryRun, null);

      if (dryRun) {
        process.stdout.write('substitute-placeholders: dry run complete (no files written)\n');
      } else {
        process.stdout.write('substitute-placeholders: pi layout complete\n');
      }
      process.exit(0);
    }

    // ── --target claude-code dispatch (default) ───────────────────────────────

    // Resolve forge root
    const forgeRoot = args.forgeRoot || resolveForgeRoot();

    // Resolve base-pack — Defect C fix: when no --base-pack flag given,
    // probe .base-pack/ (bundled layout) before init/base-pack (source layout).
    let basePack;
    if (args.basePack) {
      basePack = args.basePack;
    } else {
      const dotBasePack = path.resolve(process.cwd(), '.base-pack');
      const initBasePack = path.join(forgeRoot, 'init', 'base-pack');
      if (fs.existsSync(dotBasePack)) {
        basePack = dotBasePack;
      } else {
        basePack = initBasePack;
      }
    }
    if (!fs.existsSync(basePack)) {
      process.stderr.write(`substitute-placeholders: base-pack not found at ${basePack}\n`);
      process.exit(1);
    }

    // Resolve config
    const configPath = args.config || path.resolve(process.cwd(), '.forge', 'config.json');
    if (!fs.existsSync(configPath)) {
      process.stderr.write(`substitute-placeholders: config not found at ${configPath}\n`);
      process.exit(1);
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Resolve project-context (optional)
    let context = null;
    const contextPath = args.context;
    if (contextPath) {
      if (!fs.existsSync(contextPath)) {
        process.stderr.write(`substitute-placeholders: context not found at ${contextPath}\n`);
        process.exit(1);
      }
      context = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
    } else {
      // Try default location
      const defaultContext = path.resolve(process.cwd(), '.forge', 'project-context.json');
      if (fs.existsSync(defaultContext)) {
        context = JSON.parse(fs.readFileSync(defaultContext, 'utf8'));
      }
    }

    // Resolve build-base-pack-rules.json (optional)
    let rules = null;
    const rulesPath = args.rules || path.join(forgeRoot, 'tools', 'build-base-pack-rules.json');
    if (fs.existsSync(rulesPath)) {
      rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    }

    // Build substitution map — exits 1 if required keys are missing
    let map;
    try {
      map = buildSubstitutionMap(config, context, rules);
    } catch (err) {
      process.stderr.write(err.message + '\n');
      process.exit(1);
    }

    // Defect E: parse --category flag into a Set<string> filter (or null for all)
    let categoryFilter = null;
    if (args.category) {
      const cats = args.category.split(',').map((c) => c.trim()).filter(Boolean);
      categoryFilter = new Set(cats);
    }

    // Walk and materialise
    walkBasePack(basePack, map, outRoot, dryRun, null, categoryFilter);

    if (dryRun) {
      process.stdout.write('substitute-placeholders: dry run complete (no files written)\n');
    } else {
      process.stdout.write('substitute-placeholders: materialisation complete\n');
    }
    process.exit(0);
  } catch (err) {
    process.stderr.write(`substitute-placeholders: fatal error: ${err.message}\n`);
    process.exit(1);
  }
}

// ── CLI argument parser ───────────────────────────────────────────────────────

function parseCliArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') { args.dryRun = true; continue; }
    if (a === '--target' && argv[i + 1]) { args.target = argv[++i]; continue; }
    if (a === '--src' && argv[i + 1]) { args.src = argv[++i]; continue; }
    if (a === '--forge-root' && argv[i + 1]) { args.forgeRoot = argv[++i]; continue; }
    if (a === '--base-pack' && argv[i + 1]) { args.basePack = argv[++i]; continue; }
    if (a === '--config' && argv[i + 1]) { args.config = argv[++i]; continue; }
    if (a === '--context' && argv[i + 1]) { args.context = argv[++i]; continue; }
    if (a === '--rules' && argv[i + 1]) { args.rules = argv[++i]; continue; }
    if (a === '--out' && argv[i + 1]) { args.out = argv[++i]; continue; }
    if (a === '--category' && argv[i + 1]) { args.category = argv[++i]; continue; }
  }
  return args;
}

// ── Forge root resolver ───────────────────────────────────────────────────────

function resolveForgeRoot() {
  const configPath = path.resolve(process.cwd(), '.forge', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.paths && cfg.paths.forgeRoot) return cfg.paths.forgeRoot;
    } catch (_) { /* fall through */ }
  }
  // Default: assume we're running from within forge/forge/tools/
  return path.resolve(__dirname, '..');
}

// ── Exports (for unit testing) ────────────────────────────────────────────────

module.exports = {
  buildSubstitutionMap,
  applySubstitutions,
  extractFrontmatter,
  substituteFile,
  walkBasePackPi,        // NEW — layout-reshape walker for --target pi
  PI_TARGET_SUBDIRS,     // NEW — exported constant for tests
  REQUIRED_KEYS,
  RUNTIME_PASSTHROUGH_KEYS,
};
