---
description: Author a structured OpenSpec change proposal (proposal.md, design.md, tasks.md, delta specs) in .opow/changes/.
---

# Spec Workflow (/spec)

**Purpose**: Audit the codebase and author a structured OpenSpec change proposal in `.opow/changes/YYYY-MM-DD-<slug>/` before writing any code.

## Steps

1. **Clarification, Exploration & Brainstorming**:
   - Invoke `brainstorming`, `openspec-explore`, and `spec-driven-development`.
   - **Audit Codebase**: Trace existing control flows, schemas, APIs, and identify affected files/modules or potential breaking changes.
   - **Product Intent & Edge Cases**: Discuss requirements, constraints, and scope with the user.
   - **UI & Frontend Changes**: If the feature involves UI/UX, invoke the `designing-with-pencil` skill. Create the design file under `.opow/changes/YYYY-MM-DD-<slug>/designs/<feature>.pen`, open it automatically in the IDE (`antigravity-ide <file.pen>`), and use Pencil MCP (`execute`, `get_app_state`) to render visual mockups on canvas. If the Pencil MCP server is unavailable or fails to connect, notify the user immediately and halt without proceeding further.

2. **Initialize Change Workspace**:
   - Create `.opow/changes/YYYY-MM-DD-<slug>/` (using current ISO date `YYYY-MM-DD` and short descriptive slug) with subfolder `specs/`.
   - Copy and populate standard templates from `.opow/templates/` with YAML frontmatter (`change_id`, `created_at`, `status`):
     - `proposal.md`: Why, Motivation, Scope, Non-Goals.
     - `design.md`: Architecture overview, codebase audit findings, technical decisions, and UI/UX wireframes (`.pen` design file links and screenshot embeds).
     - `tasks.md`: Trackable checklist of implementation steps.
     - `specs/<domain>.spec.md`: Delta Specs with `ADDED`, `MODIFIED`, `REMOVED` requirements and *Given-When-Then* scenarios.

3. **User Review Gate**:
   - Present the proposal, delta specs, and visual UI mockups to the user/developer.
   - Verify visual, architectural, and contract accuracy of the specification.
   - Wait for explicit approval before proceeding to `/plan`.
