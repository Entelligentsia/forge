# Project

The **Project** is the root concept in Forge. It represents the codebase and business intent of the software you are building. Everything in Forge is scoped to a single Project.

## Purpose

A Project serves as the top-level container:
- It owns the architecture rules (`engineering/architecture/`).
- It defines the business domain (`engineering/business-domain/`).
- It is the ultimate boundary for all code, documentation, and metadata managed by Forge.

## Working with Projects

Forge manages a single project per repository. When you install Forge, you initialize it for the current repository, making that repository the working Project. 

For commands related to project initialization and health, see the [Commands Reference](../commands/INDEX.md).
