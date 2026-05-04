#!/usr/bin/env node
'use strict';

/**
 * build-base-pack.cjs — Development-time build script.
 *
 * Regenerates forge/init/base-pack/ from meta-sources by:
 *   1. Stripping LLM guidance (## Generation Instructions, ## Purpose)
 *   2. Applying structural transformations per category (persona, skill, workflow)
 *   3. Applying genericization rules from build-base-pack-rules.json
 *      (replacing hardcoded "Forge" persona names with {{PROJECT_NAME}} placeholders)
 *   4. Generating command files from the explicit 16-entry metadata table
 *   5. Copying verbatim where no meta source exists (run_sprint.md, quiz_agent.md,
 *      base-pack-only personas/skills, templates, enhance.md)
 *
 * CLI:
 *   node build-base-pack.cjs [--forge-root <path>] [--out <path>]
 *
 *   --forge-root  Path to the forge/ plugin directory (default: directory of this script)
 *   --out         Output root (default: <forge-root>/init/base-pack)
 *
 * The build is idempotent — running it twice produces byte-identical output.
 * Validates that all expected output files exist after generation (exits 1 if any missing).
 *
 * Exported API (for unit tests):
 *   GENERICIZATION_RULES        Array of { from, to } string-replacement pairs
 *   COMMAND_METADATA            Array of 16 command metadata objects
 *   transformPersona(content)   Strip frontmatter + Gen Instructions + structural transform
 *   transformWorkflow(content)  Strip Gen Instructions + Purpose + fix title + preserve frontmatter
 *   transformSkill(content)     Strip Gen Instructions + promote ### to ## + strip file_ref
 *   applyGenericizationRules(content, rules)  Apply all string replacements
 *   generateCommand(name, meta) Generate command file content from metadata
 *   buildBasePack({ forgeRoot, outRoot })  Run the full build into outRoot
 */

const fs   = require('fs');
const path = require('path');

// ── Constants ─────────────────────────────────────────────────────────────────

const SCRIPT_DIR = path.dirname(__filename);

// ── Load rules from JSON ──────────────────────────────────────────────────────

const RULES_PATH = path.join(SCRIPT_DIR, 'build-base-pack-rules.json');
const RULES      = JSON.parse(fs.readFileSync(RULES_PATH, 'utf8'));

/**
 * GENERICIZATION_RULES: array of { from: string, to: string }
 * Applied after structural transformation to replace hardcoded "Forge" names.
 */
const GENERICIZATION_RULES = RULES.stringReplacements;

/**
 * COMMAND_METADATA: 16-entry explicit command metadata table.
 * Each entry: { file, description, workflow }
 * workflow === 'ENHANCE_AGENT_SENTINEL' → copy-verbatim from existing base-pack.
 */
const COMMAND_METADATA = RULES.commandMetadata;

// ── Persona project-context map ───────────────────────────────────────────────

const PERSONA_PROJECT_CONTEXT = RULES.personaProjectContext;

// ── Persona symbol/banner/tagline map ─────────────────────────────────────────
// Derived from meta-*.md Symbol + Banner sections and Generation Instructions.
// These are stable values; update if the meta sources change.

const PERSONA_IDENTITY = {
  'architect': {
    symbol:  '🗻',
    banner:  'north',
    tagline: 'I hold the shape of the whole. I give final sign-off before commit.',
    roleSummary: (name) =>
      `I am the ${name} Architect. I plan sprints, approve completed tasks, and maintain architectural coherence across the project. I have final sign-off before code is committed.`,
  },
  'engineer': {
    symbol:  '🌱',
    banner:  'forge',
    tagline: 'I plan what will be built before any code is written. I do not move forward until the code is clean.',
    roleSummary: (name) =>
      `I am the ${name} Engineer. I plan, implement, and document task work with test-first discipline. I read requirements, write code, run tests, and keep PROGRESS.md current.`,
  },
  'supervisor': {
    symbol:  '🌿',
    banner:  'oracle',
    tagline: 'I review before things move forward. I read the actual code, not the report.',
    roleSummary: (name) =>
      `I am the ${name} Supervisor. I review plans and implementations for correctness, security, architecture alignment, and convention adherence. I do NOT write code. I verify everything independently by reading actual files, not agent reports.`,
  },
  'collator': {
    symbol:  '🍃',
    banner:  'drift',
    tagline: 'I gather what exists and arrange it into views. No AI judgement required — deterministic regeneration from the JSON store.',
    roleSummary: (name) =>
      `I am the ${name} Collator. I deterministically regenerate markdown views from the JSON store. I do not make AI judgements — I invoke the generated tool or fall back to manual collation per spec.`,
  },
  'bug-fixer': {
    symbol:  '🐛',
    banner:  'oracle',
    tagline: 'I reproduce, isolate, and fix what\'s broken. I don\'t move on until the regression test passes.',
    roleSummary: (name) =>
      `I am the ${name} Bug Fixer. I triage, reproduce, root-cause, and fix reported bugs. I classify root causes for trend analysis and write back preventative knowledge.`,
  },
  'qa-engineer': {
    symbol:  '🍵',
    banner:  'lumen',
    tagline: 'I validate against what was promised. The code compiling is not enough.',
    roleSummary: (name) =>
      `I am the ${name} QA Engineer. I validate that implementations satisfy the acceptance criteria. I test boundaries, not just happy paths. Absence of a test is not evidence of passing. I do not review code quality — that is the Supervisor's job.`,
  },
};

// ── Utility functions ─────────────────────────────────────────────────────────

/**
 * Ensure a directory exists (recursive mkdir).
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Strip YAML frontmatter block (--- ... ---) from content.
 * Returns { frontmatter: string|null, body: string }
 * frontmatter includes the opening and closing --- delimiters.
 */
function extractFrontmatter(content) {
  if (!content.startsWith('---')) {
    return { frontmatter: null, body: content };
  }
  const lines = content.split('\n');
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trimEnd() === '---') { end = i; break; }
  }
  if (end === -1) {
    return { frontmatter: null, body: content };
  }
  const frontmatter = lines.slice(0, end + 1).join('\n');
  const body = lines.slice(end + 1).join('\n');
  return { frontmatter, body };
}

/**
 * Strip a named section (## Heading) and its content until the next ## heading.
 * Strips multiple occurrences if present.
 */
function stripSection(content, heading) {
  // Match the heading line and everything until the next ## heading or end of string
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}[^\\n]*\\n[\\s\\S]*?(?=^##\\s|\\z)`, 'gm');
  return content.replace(re, '').trimEnd();
}

/**
 * More robust section stripper using split-and-reconstruct approach.
 * Strips a section starting with a line that equals `heading` exactly.
 */
function stripSectionBlock(content, heading) {
  const lines = content.split('\n');
  const result = [];
  let skipping = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimEnd();

    // Detect section start: must exactly match "## Heading" style
    if (trimmed === heading || trimmed.startsWith(heading + ' ')) {
      // Verify it's a ## heading (two # chars at start)
      if (/^#{1,3}\s/.test(trimmed) && trimmed.startsWith(heading)) {
        skipping = true;
        continue;
      }
    }

    if (skipping) {
      // Stop skipping when we hit another heading of the same level or higher
      if (/^#{1,3}\s/.test(trimmed) && trimmed !== heading) {
        skipping = false;
        result.push(line);
      }
      // else: skip this line
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

/**
 * Strip a ## section block from content.
 * More robust version: finds the heading line and removes until next ##.
 */
function stripH2Section(content, sectionHeading) {
  const lines = content.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Check if this line is the target heading
    if (line.trimEnd() === sectionHeading) {
      // Skip this heading and all content until next ## heading
      i++;
      while (i < lines.length) {
        const next = lines[i].trimEnd();
        if (next.startsWith('## ') || next.startsWith('# ')) {
          break;
        }
        i++;
      }
      // Remove trailing blank lines in result
      while (result.length > 0 && result[result.length - 1].trim() === '') {
        result.pop();
      }
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join('\n');
}

// ── Core transformation functions ─────────────────────────────────────────────

/**
 * transformPersona(metaContent) → string
 *
 * Transforms a meta-persona file into a base-pack persona file:
 * - Strips YAML frontmatter
 * - Strips ## Generation Instructions section
 * - Transforms Symbol+Banner+Role sections → first-person Identity block with banner command
 * - Renames "What the X Needs to Know" → "What I Need to Know"
 * - Renames "What the X Produces" → "What I Produce"
 * - Adds ## Project Context with placeholders
 * - Adds ## Commands and ## Installed Skill Wiring with standard placeholders
 */
function transformPersona(metaContent) {
  const { frontmatter: _fm, body } = extractFrontmatter(metaContent);

  // Extract role from frontmatter to look up identity config
  let role = null;
  if (_fm) {
    const roleMatch = _fm.match(/^role:\s*(.+)$/m);
    if (roleMatch) role = roleMatch[1].trim();
  }

  const identity = role ? PERSONA_IDENTITY[role] : null;

  // Start with the body after frontmatter
  let content = body;

  // Strip ## Generation Instructions section
  content = stripH2Section(content, '## Generation Instructions');

  // Strip ## Symbol section
  content = stripH2Section(content, '## Symbol');

  // Strip ## Banner section
  content = stripH2Section(content, '## Banner');

  // Strip ## Role section — will be replaced with ## Identity block
  const roleSection = content.match(/^## Role\n([\s\S]*?)(?=^## |\z)/m);
  const roleProse = roleSection ? roleSection[1].trim() : '';
  content = stripH2Section(content, '## Role');

  // Rename heading variants
  content = content.replace(/^## What the [A-Za-z\s]+ Needs to Know/m, '## What I Need to Know');
  content = content.replace(/^## What the [A-Za-z\s]+ Produces/m, '## What I Produce');

  // Strip the meta title line (# Meta-Persona: ...)
  content = content.replace(/^# Meta-Persona:.*\n/m, '');

  // Trim leading blank lines
  content = content.replace(/^\n+/, '');

  // Build the first-person identity block
  let identityBlock = '';
  if (identity) {
    const projectNamePlaceholder = `{{PROJECT_NAME}} ${role.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}`;
    identityBlock = [
      `${identity.symbol} **{{PROJECT_NAME}} ${role.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}** — ${identity.tagline}`,
      '',
      '## Identity',
      '',
      identity.roleSummary('{{PROJECT_NAME}}'),
      '',
      'Run this command using the Bash tool as my first action (before any file reads or other tool use):',
      '```bash',
      `FORGE_ROOT=$(node -e "console.log(require('./.forge/config.json').paths.forgeRoot)") && node "$FORGE_ROOT/tools/banners.cjs" ${identity.banner}`,
      '```',
      '',
    ].join('\n');
  }

  // Build Project Context section
  const ctxLines = PERSONA_PROJECT_CONTEXT[role] || [];
  const projectContextBlock = [
    '',
    '## Project Context',
    '',
    ...ctxLines,
    '',
  ].join('\n');

  // Build Commands and Skill Wiring blocks
  const commandsBlock = [
    '',
    '## Commands',
    '',
    '- **Syntax check**: `{{TEST_COMMAND}}`',
    '- **Lint**: `{{LINT_COMMAND}}`',
    '',
    '## Installed Skill Wiring',
    '',
    '{{SKILL_DIRECTIVES}}',
  ].join('\n');

  // Assemble final content
  let result = identityBlock + content.trimStart() + projectContextBlock + commandsBlock;

  // Final cleanup: normalize multiple blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}

/**
 * transformWorkflow(metaContent) → string
 *
 * Transforms a meta-workflow file into a base-pack workflow file:
 * - Preserves YAML frontmatter verbatim (CRITICAL — required by acceptance gate tests)
 * - Strips ## Generation Instructions section
 * - Strips ## Purpose section
 * - Replaces "# 🌱 Meta-Workflow: Title" with "# Title"
 * - Replaces "see Generation Instructions" with "see `_fragments/finalize.md`"
 */
function transformWorkflow(metaContent) {
  const { frontmatter, body } = extractFrontmatter(metaContent);

  let content = body;

  // Strip ## Generation Instructions section
  content = stripH2Section(content, '## Generation Instructions');

  // Strip ## Purpose section
  content = stripH2Section(content, '## Purpose');

  // Replace Meta-Workflow: prefix in title line
  // e.g. "# 🌱 Meta-Workflow: Plan Task" → "# Plan Task"
  // Also handles emoji variants: "# 🗻 Meta-Workflow: ..."
  content = content.replace(/^# [^\n]*Meta-Workflow:\s*/m, '# ');

  // Replace "see Generation Instructions" references
  content = content.replace(/see Generation Instructions/gi, 'see `_fragments/finalize.md`');

  // Trim leading blank lines from body
  content = content.replace(/^\n+/, '');

  // Reassemble with frontmatter (verbatim) if present
  if (frontmatter) {
    return frontmatter + '\n\n' + content;
  }
  return content;
}

/**
 * transformSkill(metaContent) → string
 *
 * Transforms a meta-skill file into a base-pack skill file:
 * - Strips file_ref from YAML frontmatter
 * - Strips ## Generation Instructions section
 * - Promotes ### headings to ## headings (within the skill content)
 * - Inserts the project-context placeholder after the first ## heading
 * - Adds "# {{PROJECT_NAME}} <Role> Skills" heading
 */
function transformSkill(metaContent) {
  const { frontmatter, body } = extractFrontmatter(metaContent);

  // Build cleaned frontmatter (strip file_ref line)
  let cleanedFm = null;
  if (frontmatter) {
    const fmLines = frontmatter.split('\n').filter(l => !l.match(/^file_ref:/));
    cleanedFm = fmLines.join('\n');
  }

  let content = body;

  // Strip ## Generation Instructions section
  content = stripH2Section(content, '## Generation Instructions');

  // Strip "## Skill Set" heading (the content under it is what we want, just with ### → ##)
  content = stripH2HeadingOnly(content, '## Skill Set');

  // Promote ### to ##
  content = content.replace(/^### /gm, '## ');

  // Strip the meta title line (# ... Meta-Skills ...)
  content = content.replace(/^# [^\n]*\n/m, '');

  // Trim leading blank lines
  content = content.replace(/^\n+/, '');

  // Determine role name and context placeholder for the first ## section
  let roleName = 'Unknown';
  let contextPlaceholder = '{{SKILL_PROJECT_CONTEXT}}';
  if (frontmatter) {
    const roleMatch = frontmatter.match(/^role:\s*(.+)$/m);
    const idMatch   = frontmatter.match(/^id:\s*(.+)$/m);
    if (idMatch) {
      // Derive role name and placeholder from id
      // e.g. "architect-skills" → role=Architect, placeholder={{ARCHITECT_SKILL_PROJECT_CONTEXT}}
      const id = idMatch[1].trim().replace(/-skills$/, '');
      roleName = id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
      const placeholderKey = id.toUpperCase().replace(/-/g, '_') + '_SKILL_PROJECT_CONTEXT';
      contextPlaceholder = `{{${placeholderKey}}}`;
    } else if (roleMatch) {
      roleName = roleMatch[1].trim();
    }
  }

  // Build title line
  const titleLine = `# {{PROJECT_NAME}} ${roleName} Skills`;

  // Insert project-context placeholder after the first ## heading
  const lines = content.split('\n');
  const firstH2Idx = lines.findIndex(l => l.startsWith('## '));
  let finalContent;
  if (firstH2Idx !== -1) {
    const before = lines.slice(0, firstH2Idx + 1);
    const after  = lines.slice(firstH2Idx + 1);
    // Find where the content of this first section starts (skip blank lines)
    let insertIdx = 0;
    while (insertIdx < after.length && after[insertIdx].trim() === '') insertIdx++;
    const withPlaceholder = [
      ...before,
      '',
      contextPlaceholder,
      '',
      ...after.slice(insertIdx),
    ];
    finalContent = withPlaceholder.join('\n');
  } else {
    finalContent = content;
  }

  // Normalize multiple blank lines
  finalContent = finalContent.replace(/\n{3,}/g, '\n\n');

  // Assemble: cleaned frontmatter + title + content
  const parts = [];
  if (cleanedFm) {
    parts.push(cleanedFm);
    parts.push('');
    parts.push(titleLine);
    parts.push('');
    parts.push(finalContent.trimStart());
  } else {
    parts.push(titleLine);
    parts.push('');
    parts.push(finalContent.trimStart());
  }

  return parts.join('\n');
}

/**
 * Strip a ## heading line but keep its content (unlike stripH2Section which strips both).
 */
function stripH2HeadingOnly(content, heading) {
  return content.replace(new RegExp(`^${escapeRegex(heading)}\\n`, 'm'), '');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * applyGenericizationRules(content, rules) → string
 *
 * Applies an array of { from, to } string replacement rules to content.
 * All replacements are literal string replacements (not regex), applied in order.
 */
function applyGenericizationRules(content, rules) {
  let result = content;
  for (const rule of rules) {
    // Use split/join for reliable literal string replacement (all occurrences)
    result = result.split(rule.from).join(rule.to);
  }
  return result;
}

/**
 * generateCommand(name, meta) → string
 *
 * Generates a command file from metadata.
 * name: filename e.g. "plan.md"
 * meta: { description, workflow }
 */
function generateCommand(name, meta) {
  const commandName = name.replace(/\.md$/, '');
  return [
    '---',
    `name: ${commandName}`,
    `description: ${meta.description}`,
    '---',
    '',
    `# /{{PREFIX}}:${commandName}`,
    '',
    `Read the ${commandName} workflow and follow it.`,
    '',
    '## Locate the Forge plugin',
    '',
    '```',
    'FORGE_ROOT: !`echo "${CLAUDE_PLUGIN_ROOT}"`',
    '```',
    '',
    '## Execute',
    '',
    `Read \`.forge/workflows/${meta.workflow}\` and follow it.`,
    '',
    '## Arguments',
    '',
    '$ARGUMENTS',
  ].join('\n');
}

// ── buildBasePack ─────────────────────────────────────────────────────────────

/**
 * buildBasePack({ forgeRoot, outRoot })
 *
 * Runs the full base-pack build:
 *   - forgeRoot: path to the forge/ plugin directory
 *   - outRoot:   output root (base-pack directory)
 *
 * Reads meta-sources from forgeRoot/meta/ and existing base-pack from
 * forgeRoot/init/base-pack/ (for copy-verbatim items).
 * Writes output to outRoot/.
 *
 * Throws if any expected output file is missing after generation.
 */
function buildBasePack({ forgeRoot, outRoot }) {
  const metaDir     = path.join(forgeRoot, 'meta');
  const basePackDir = path.join(forgeRoot, 'init', 'base-pack');

  // Create output directories
  ensureDir(path.join(outRoot, 'personas'));
  ensureDir(path.join(outRoot, 'skills'));
  ensureDir(path.join(outRoot, 'workflows'));
  ensureDir(path.join(outRoot, 'workflows', '_fragments'));
  ensureDir(path.join(outRoot, 'templates'));
  ensureDir(path.join(outRoot, 'commands'));

  const rules = GENERICIZATION_RULES;

  // ── 1. Personas ─────────────────────────────────────────────────────────────
  //
  // Meta-backed (6): architect, bug-fixer, collator, engineer, qa-engineer, supervisor
  //   → transform from meta source
  // Base-pack-only (3): librarian, orchestrator, product-manager
  //   → copy verbatim from existing base-pack

  const META_BACKED_PERSONAS = [
    ['meta-architect.md',   'architect.md'],
    ['meta-bug-fixer.md',   'bug-fixer.md'],
    ['meta-collator.md',    'collator.md'],
    ['meta-engineer.md',    'engineer.md'],
    ['meta-qa-engineer.md', 'qa-engineer.md'],
    ['meta-supervisor.md',  'supervisor.md'],
  ];
  const BASE_PACK_ONLY_PERSONAS = [
    'librarian.md',
    'orchestrator.md',
    'product-manager.md',
  ];

  for (const [src, out] of META_BACKED_PERSONAS) {
    const metaContent = fs.readFileSync(path.join(metaDir, 'personas', src), 'utf8');
    let transformed = transformPersona(metaContent);
    transformed = applyGenericizationRules(transformed, rules);
    writeFile(path.join(outRoot, 'personas', out), transformed);
  }

  for (const fname of BASE_PACK_ONLY_PERSONAS) {
    const src = path.join(basePackDir, 'personas', fname);
    let content = fs.readFileSync(src, 'utf8');
    content = applyGenericizationRules(content, rules);
    writeFile(path.join(outRoot, 'personas', fname), content);
  }

  // ── 2. Skills ────────────────────────────────────────────────────────────────
  //
  // Meta-backed (7): architect, bug-fixer, collator, engineer, generic, qa-engineer, supervisor
  //   → transform from meta source
  // Base-pack-only (2): librarian-skills, store-custodian-skills
  //   → copy verbatim from existing base-pack

  const META_BACKED_SKILLS = [
    ['meta-architect-skills.md',   'architect-skills.md'],
    ['meta-bug-fixer-skills.md',   'bug-fixer-skills.md'],
    ['meta-collator-skills.md',    'collator-skills.md'],
    ['meta-engineer-skills.md',    'engineer-skills.md'],
    ['meta-generic-skills.md',     'generic-skills.md'],
    ['meta-qa-engineer-skills.md', 'qa-engineer-skills.md'],
    ['meta-supervisor-skills.md',  'supervisor-skills.md'],
  ];
  const BASE_PACK_ONLY_SKILLS = [
    'librarian-skills.md',
    'store-custodian-skills.md',
  ];

  for (const [src, out] of META_BACKED_SKILLS) {
    const metaContent = fs.readFileSync(path.join(metaDir, 'skills', src), 'utf8');
    let transformed = transformSkill(metaContent);
    transformed = applyGenericizationRules(transformed, rules);
    writeFile(path.join(outRoot, 'skills', out), transformed);
  }

  for (const fname of BASE_PACK_ONLY_SKILLS) {
    const src = path.join(basePackDir, 'skills', fname);
    let content = fs.readFileSync(src, 'utf8');
    content = applyGenericizationRules(content, rules);
    writeFile(path.join(outRoot, 'skills', fname), content);
  }

  // ── 3. Workflows ─────────────────────────────────────────────────────────────
  //
  // Meta-backed (16): all except run_sprint.md and quiz_agent.md
  //   → transform from meta source
  // Copy-verbatim from existing base-pack (2):
  //   - run_sprint.md (null meta source)
  //   - quiz_agent.md (deferral — quiz questions need follow-up task)

  const META_BACKED_WORKFLOWS = [
    ['meta-approve.md',                  'architect_approve.md'],
    ['meta-collate.md',                  'collator_agent.md'],
    ['meta-commit.md',                   'commit_task.md'],
    ['meta-fix-bug.md',                  'fix_bug.md'],
    ['meta-implement.md',                'implement_plan.md'],
    ['meta-migrate.md',                  'migrate_structural.md'],
    ['meta-orchestrate.md',              'orchestrate_task.md'],
    ['meta-plan-task.md',                'plan_task.md'],
    ['meta-retrospective.md',            'sprint_retrospective.md'],
    ['meta-review-implementation.md',    'review_code.md'],
    ['meta-review-plan.md',              'review_plan.md'],
    ['meta-review-sprint-completion.md', 'architect_review_sprint_completion.md'],
    ['meta-sprint-intake.md',            'architect_sprint_intake.md'],
    ['meta-sprint-plan.md',              'architect_sprint_plan.md'],
    ['meta-update-implementation.md',    'update_implementation.md'],
    ['meta-update-plan.md',              'update_plan.md'],
    ['meta-validate.md',                 'validate_task.md'],
  ];
  const COPY_VERBATIM_WORKFLOWS = [
    'run_sprint.md',
    'quiz_agent.md',
  ];

  for (const [src, out] of META_BACKED_WORKFLOWS) {
    const metaContent = fs.readFileSync(path.join(metaDir, 'workflows', src), 'utf8');
    let transformed = transformWorkflow(metaContent);
    transformed = applyGenericizationRules(transformed, rules);
    writeFile(path.join(outRoot, 'workflows', out), transformed);
  }

  for (const fname of COPY_VERBATIM_WORKFLOWS) {
    const src = path.join(basePackDir, 'workflows', fname);
    let content = fs.readFileSync(src, 'utf8');
    content = applyGenericizationRules(content, rules);
    writeFile(path.join(outRoot, 'workflows', fname), content);
  }

  // ── 3a. Workflow Fragments ────────────────────────────────────────────────────
  //
  // All 4 fragment files: copy verbatim from meta/workflows/_fragments/

  const FRAGMENT_FILES = [
    'context-injection.md',
    'event-emission-schema.md',
    'finalize.md',
    'progress-reporting.md',
  ];

  for (const fname of FRAGMENT_FILES) {
    const src = path.join(metaDir, 'workflows', '_fragments', fname);
    let content = fs.readFileSync(src, 'utf8');
    content = applyGenericizationRules(content, rules);
    writeFile(path.join(outRoot, 'workflows', '_fragments', fname), content);
  }

  // ── 4. Templates ─────────────────────────────────────────────────────────────
  //
  // All 10 template files are sourced from the EXISTING base-pack.
  // Meta templates (meta/templates/meta-*.md) describe template STRUCTURE for
  // LLM generation — they do not contain actual template body content.
  // The actual content lives in base-pack/templates/ and is hand-crafted.
  //
  // Class (a) — base-pack-sourced, strip Gen Instructions if present:
  //   CODE_REVIEW_TEMPLATE.md, PLAN_TEMPLATE.md, PLAN_REVIEW_TEMPLATE.md,
  //   PROGRESS_TEMPLATE.md, RETROSPECTIVE_TEMPLATE.md, SPRINT_MANIFEST_TEMPLATE.md,
  //   SPRINT_REQUIREMENTS_TEMPLATE.md, TASK_PROMPT_TEMPLATE.md
  //
  // Class (b) — base-pack-sourced, copy as-is:
  //   COST_REPORT_TEMPLATE.md, PLAN_SUMMARY_TEMPLATE.json
  //
  // String replacements from build-base-pack-rules.json are applied to all.

  const ALL_TEMPLATE_FILES = [
    'CODE_REVIEW_TEMPLATE.md',
    'COST_REPORT_TEMPLATE.md',
    'PLAN_REVIEW_TEMPLATE.md',
    'PLAN_SUMMARY_TEMPLATE.json',
    'PLAN_TEMPLATE.md',
    'PROGRESS_TEMPLATE.md',
    'RETROSPECTIVE_TEMPLATE.md',
    'SPRINT_MANIFEST_TEMPLATE.md',
    'SPRINT_REQUIREMENTS_TEMPLATE.md',
    'TASK_PROMPT_TEMPLATE.md',
  ];

  for (const fname of ALL_TEMPLATE_FILES) {
    const src = path.join(basePackDir, 'templates', fname);
    let content = fs.readFileSync(src, 'utf8');
    // Strip ## Generation Instructions if present (class-a templates may have it)
    content = stripH2Section(content, '## Generation Instructions');
    // Apply genericization rules
    content = applyGenericizationRules(content, rules);
    writeFile(path.join(outRoot, 'templates', fname), content);
  }

  // ── 5. Commands ───────────────────────────────────────────────────────────────
  //
  // 15 files generated from metadata table.
  // 1 file (enhance.md) copied verbatim from existing base-pack (ENHANCE_AGENT_SENTINEL).

  for (const meta of COMMAND_METADATA) {
    if (meta.workflow === 'ENHANCE_AGENT_SENTINEL') {
      // Copy verbatim from existing base-pack
      const src = path.join(basePackDir, 'commands', meta.file);
      let content = fs.readFileSync(src, 'utf8');
      content = applyGenericizationRules(content, rules);
      writeFile(path.join(outRoot, 'commands', meta.file), content);
    } else {
      let content = generateCommand(meta.file, meta);
      content = applyGenericizationRules(content, rules);
      writeFile(path.join(outRoot, 'commands', meta.file), content);
    }
  }

  // ── Validation: verify all expected output files exist ────────────────────────

  const expectedFiles = [
    // Personas (9)
    'personas/architect.md', 'personas/bug-fixer.md', 'personas/collator.md',
    'personas/engineer.md', 'personas/librarian.md', 'personas/orchestrator.md',
    'personas/product-manager.md', 'personas/qa-engineer.md', 'personas/supervisor.md',
    // Skills (9)
    'skills/architect-skills.md', 'skills/bug-fixer-skills.md', 'skills/collator-skills.md',
    'skills/engineer-skills.md', 'skills/generic-skills.md', 'skills/librarian-skills.md',
    'skills/qa-engineer-skills.md', 'skills/store-custodian-skills.md', 'skills/supervisor-skills.md',
    // Workflows (19)
    'workflows/architect_approve.md', 'workflows/architect_review_sprint_completion.md',
    'workflows/architect_sprint_intake.md', 'workflows/architect_sprint_plan.md',
    'workflows/collator_agent.md', 'workflows/commit_task.md', 'workflows/fix_bug.md',
    'workflows/implement_plan.md', 'workflows/migrate_structural.md',
    'workflows/orchestrate_task.md', 'workflows/plan_task.md',
    'workflows/quiz_agent.md', 'workflows/review_code.md', 'workflows/review_plan.md',
    'workflows/run_sprint.md', 'workflows/sprint_retrospective.md',
    'workflows/update_implementation.md', 'workflows/update_plan.md', 'workflows/validate_task.md',
    // Fragments (4)
    'workflows/_fragments/context-injection.md', 'workflows/_fragments/event-emission-schema.md',
    'workflows/_fragments/finalize.md', 'workflows/_fragments/progress-reporting.md',
    // Templates (10)
    'templates/CODE_REVIEW_TEMPLATE.md', 'templates/COST_REPORT_TEMPLATE.md',
    'templates/PLAN_REVIEW_TEMPLATE.md', 'templates/PLAN_SUMMARY_TEMPLATE.json',
    'templates/PLAN_TEMPLATE.md', 'templates/PROGRESS_TEMPLATE.md',
    'templates/RETROSPECTIVE_TEMPLATE.md', 'templates/SPRINT_MANIFEST_TEMPLATE.md',
    'templates/SPRINT_REQUIREMENTS_TEMPLATE.md', 'templates/TASK_PROMPT_TEMPLATE.md',
    // Commands (16)
    'commands/approve.md', 'commands/collate.md', 'commands/commit.md', 'commands/enhance.md',
    'commands/fix-bug.md', 'commands/implement.md', 'commands/plan.md', 'commands/quiz-agent.md',
    'commands/retrospective.md', 'commands/review-code.md', 'commands/review-plan.md',
    'commands/run-sprint.md', 'commands/run-task.md', 'commands/sprint-intake.md',
    'commands/sprint-plan.md', 'commands/validate.md',
  ];

  const missing = expectedFiles.filter(f => !fs.existsSync(path.join(outRoot, f)));
  if (missing.length > 0) {
    throw new Error(`Build validation failed — missing output files:\n${missing.map(f => `  ${f}`).join('\n')}`);
  }
}

/**
 * Write content to file, creating parent directories as needed.
 * Normalizes line endings to LF.
 */
function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n');
  fs.writeFileSync(filePath, normalized, 'utf8');
}

// ── CLI entry point ───────────────────────────────────────────────────────────

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    let forgeRoot = SCRIPT_DIR ? path.resolve(SCRIPT_DIR, '..') : process.cwd();
    let outRoot   = null;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--forge-root' && args[i + 1]) {
        forgeRoot = path.resolve(args[++i]);
      } else if (args[i] === '--out' && args[i + 1]) {
        outRoot = path.resolve(args[++i]);
      }
    }

    if (!outRoot) {
      outRoot = path.join(forgeRoot, 'init', 'base-pack');
    }

    process.stdout.write(`build-base-pack: forgeRoot=${forgeRoot}\n`);
    process.stdout.write(`build-base-pack: outRoot=${outRoot}\n`);

    buildBasePack({ forgeRoot, outRoot });

    process.stdout.write('build-base-pack: done\n');
    process.exit(0);
  } catch (err) {
    process.stderr.write(`build-base-pack error: ${err.message}\n`);
    if (err.stack) process.stderr.write(err.stack + '\n');
    process.exit(1);
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  GENERICIZATION_RULES,
  COMMAND_METADATA,
  transformPersona,
  transformWorkflow,
  transformSkill,
  applyGenericizationRules,
  generateCommand,
  buildBasePack,
};
