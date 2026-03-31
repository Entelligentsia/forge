# Meta-Workflow: Sprint Intake

## Purpose

Interview the user to capture structured sprint requirements before sprint
planning begins. Produces a `SPRINT_REQUIREMENTS.md` that the Architect reads
as the primary input to `meta-sprint-plan`.

This workflow is the entry point for every sprint. Nothing in the sprint should
be planned without a completed requirements document.

## Iron Law

YOU MUST NOT proceed to sprint planning until every Required section of
`SPRINT_REQUIREMENTS.md` has a non-vague answer. "TBD" and "to be decided"
are not acceptable in a completed requirements document. Ask again.

## Algorithm

### Step 1 — Open the Interview

Greet the user and set the frame:

> "Let's define what this sprint will deliver. I'll ask you a few questions —
> answer as briefly or in as much detail as you like, and I'll ask follow-ups
> where things need sharpening. We'll end with a requirements document you can
> review before planning starts."

Read the previous sprint's retrospective from `.forge/store/sprints/` if one
exists. Note any carry-over items or recurring themes to probe during the interview.

### Step 2 — Goals

Ask: **What does a successful sprint look like? What is delivered or resolved?**

Probe if the answer is vague:
- "Can you describe that in terms of something a user or the system can do that
  it couldn't before?"
- "Is this a capability, a fix, a performance improvement, or an internal change?"
- "How will you know it's done — what's the observable outcome?"

Capture 1–3 concrete sprint goals. If the user names more than 3, ask which
three matter most if time runs short.

### Step 3 — Scope

Ask: **What specific features, fixes, or changes are you expecting this sprint?**

For each item mentioned:
- Ask for a one-line description if not already given
- Ask: "Is this a must-have or a nice-to-have for this sprint?"
- Ask: "Does this depend on anything else in this list being done first?"
- Note any items that sound like multiple tasks bundled together and surface that

Ask explicitly: **What are we NOT doing this sprint that someone might expect?**
This out-of-scope boundary prevents scope creep during planning.

### Step 4 — Acceptance Criteria

For each must-have item, ask:
**How will the Supervisor know this is correctly implemented?**

Push for specific, testable criteria:
- "What does the happy path look like?"
- "What are the edge cases or failure conditions that must be handled?"
- "Is there a UI state, API response, or data condition that proves it works?"

Vague criteria ("it should work well") must be sharpened before proceeding.

### Step 5 — Constraints

Ask about each constraint category, skipping any clearly not applicable:

- **Technical**: "Any constraints on how this must be implemented — specific
  libraries, patterns to follow or avoid, performance requirements?"
- **Data**: "Any migrations, schema changes, or data integrity concerns?"
- **Dependencies**: "Does anything here depend on external work, a third-party
  API, or another team?"
- **Timeline**: "Is there a hard deadline on any item, or is the sprint timebox sufficient?"

### Step 6 — Risks

Ask: **What could go wrong or block progress on any of these items?**

Probe:
- "Is there anything technically uncertain — something that might take longer
  than expected if the approach turns out not to work?"
- "Any items where the requirements might change mid-sprint?"
- "Any external dependencies that could be delayed?"

### Step 7 — Confirm and Write

Summarise what was captured:

> "Here's what I've heard. Tell me what's wrong or missing before I write the
> requirements document."

Present a plain-language summary (not the formatted document) and wait for
corrections. Incorporate feedback, then write `SPRINT_REQUIREMENTS.md` using
the sprint requirements template.

Save to: `engineering/sprints/{SPRINT_ID}/SPRINT_REQUIREMENTS.md`
(Create the sprint directory if it does not exist. Use the next sequential
sprint ID from the store.)

### Step 8 — Hand Off

Tell the user:

> "Requirements are captured. Run `/sprint-plan` when you're ready to have
> the Architect break these into tasks with estimates and a dependency graph."

## Generation Instructions

- Reference the project's ID format for the sprint directory path
- Add domain-specific probes for Step 3 based on the project's entity model
  (e.g. for an e-commerce project: "Does this involve order state changes?")
- Add stack-specific constraint probes for Step 5
  (e.g. for Django: "Any new migrations?"; for React: "Any route changes?")
