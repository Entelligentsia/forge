# Generation: Skills

## Purpose

Generate project-specific skill sets for each persona, mapping universal 
techniques to project-specific tools and contexts.

## Inputs

- `$FORGE_ROOT/meta/skills/meta-*.md` (Meta-skill templates)
- Discovery context (from Phase 1)
- Generated knowledge base (from Phase 2)
- `.forge/config.json` (specifically `installedSkills`)

## Outputs

Skill sets are written as standalone files in `.forge/skills/`.
Each file is named after the role it supports (e.g., `.forge/skills/supervisor-skills.md`).

## Instructions

For each persona role defined in the project:
1. Identify the relevant meta-skills from `$FORGE_ROOT/meta/skills/`.
2. For each skill, produce a project-interpolated version that:
   - Replaces generic placeholders with actual project tools, libraries, and paths.
   - Incorporates specific constraints discovered during Phase 1.
   - Maps universal techniques to the project's actual implementation patterns.
3. Integrate `installedSkills` from `.forge/config.json`:
   - If a marketplace skill is installed that enhances a specific technique, 
     explicitly reference it in the skill set.
   - Ensure the skill set explains *how* the persona should combine the 
     universal marketplace skill with the project-specific skill set.

**Skill set format**:
Each file should be structured as a cohesive set of capabilities, 
techniques, and checklists tailored for that specific role within the project.
