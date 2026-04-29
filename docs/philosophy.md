# Philosophy

Forge exists because of one observation: **LLMs produce quality software only when the process that governs them is itself high quality.**

An LLM given a vague instruction produces vague code. An LLM given a precise specification, a plan verified against that specification, and a review loop that checks implementation against both — produces shippable software.

Forge automates that chain. It does not skip steps.

---

## The Verification Chain

Every piece of work in Forge follows a single chain of verifiable steps:

```
Unambiguous requirements
  → Plan that aligns to requirements (verified by plan review)
    → Implementation that aligns to plan (verified by tests and code review)
      → Evidence that every agent followed the process (verified by documentation and code)
```

If any link breaks, the output is not trusted. If the requirements are vague, the plan cannot be verified. If the plan is not reviewed, the implementation has no anchor. If the implementation is not tested and reviewed, the commit is not safe.

This chain is not overhead. It is the product.

---

## When Forge makes sense

Forge is for **non-trivial software that has real accountability requirements.**

- Software where bugs have consequences — data loss, security exposure, financial cost.
- Projects that need auditability — who did what, why, and whether it was verified.
- Teams (even teams of one) that ship to production and cannot afford "it worked on my machine."

Forge enforces the verification chain at every step. Each phase produces artifacts. Each artifact is reviewed. Each review has a verdict. Every verdict is recorded.

---

## When Forge does not make sense

- **Small projects.** A 200-line script does not need sprints, plans, reviews, and retrospectives.
- **One-page websites.** Forge is not a website builder.
- **Content creation.** Forge creates and modifies software. It does not write blog posts, marketing copy, or documentation articles.
- **Prototyping without accountability.** If nobody reviews what you ship and there are no consequences for breakage, Forge adds process without benefit.

Using Forge for these cases is like hiring a building inspector for a treehouse. Technically correct, practically wasteful.

---

## Technology agnostic, opinionated about process

Forge does not care what language you write in, what framework you use, or where you deploy. It reads your codebase and adapts.

Forge has strong opinions about **process**:

- **Plan before implement.** Every task starts with a plan. No exceptions.
- **Review before approve.** Every plan is reviewed. Every implementation is reviewed. No exceptions.
- **Test before commit.** Gate checks run on every implementation. Tests must pass.
- **Record everything.** Every phase emits events. Every verdict is stored. Every sprint closes with a retrospective.

The review steps are deliberate. They are not bureaucratic overhead. They are the mechanism that turns an LLM's output into trustworthy software. Removing them removes the value.

---

## One-shot shippable software

Following Forge's default process flow produces software that ships on the first pass. Not because LLMs are perfect, but because the review loops catch problems before they reach the commit. The Engineer writes a plan. The Supervisor catches the gaps. The Engineer revises. The Engineer implements. The Supervisor catches the deviations. The Engineer revises again. By the time the Architect approves and the commit lands, the code has survived adversarial review.

This is the design intent. If your default flow is not producing shippable software, the knowledge base needs calibration — run `/forge:calibrate` or `/forge:health` to find the gaps.

---

## Don't start day one with Forge

Forge works best when it has something to read. An existing codebase — even a small one — gives discovery something to work with. The generated knowledge base, personas, and review criteria are derived from what exists, not from guesses.

**The best starting point for Forge:**

1. Build a basic framework. Get your project structure in place.
2. Research and decide on your tech stack. Write it down.
3. Add domain knowledge — what the project is about, what the entities are, what the constraints are.
4. Then run `/forge:init`.

Starting Forge on an empty directory works, but the generated output is lower confidence and needs more manual correction. The [new project guide](new-project.md) covers this in detail.

---

## Self-improving by design

Forge learns about your project as you work with it. Every sprint adds to the knowledge base. Every retrospective promotes patterns that worked and retires patterns that didn't. The Supervisor adds new checks when it catches something worth catching again. The Bug Fixer tags root causes and builds preventive checks.

By Sprint 3, the system understands your project better than any static prompt could. It keeps improving.

Forge also self-heals. When agents make mistakes, the review loops catch them. When the knowledge base drifts from the codebase, `/forge:health` detects it. When workflows need updating, `/forge:regenerate` refreshes them.

---

## Commit all Forge artifacts

Forge generates artifacts in `.forge/` and `engineering/`. Commit them. These files are not build artifacts — they are project state. They record what was planned, what was built, what was reviewed, and what was learned.

Committing Forge artifacts helps future-you and future-team-members. A new contributor can read the knowledge base and understand the project. A sprint history shows what was built and why. A retrospective archive shows what was learned.

---

## Version 1.0: solo engineers

Forge v1.0 targets one-person engineering teams. Every workflow, every persona, every review step assumes a single human directing the process.

Team collaboration tools and project visualization are in development. Follow [forge-ember](https://github.com/Entelligentsia/forge-ember) for progress.