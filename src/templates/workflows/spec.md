---
description: Author a structured OpenSpec change proposal (proposal.md, design.md, tasks.md, delta specs) in .opow/changes/.
---

# Spec Workflow (/spec)

**Purpose**: Author a structured OpenSpec change proposal in `.opow/changes/<change-name>/` before writing any code.

## Steps

1. **Clarification & Brainstorming**:
   - Invoke `brainstorming` and `spec-driven-development`.
   - Discuss product intent, edge cases, and scope with the user.
   - **UI & Frontend Changes**: If the feature involves UI/UX, invoke the Pencil MCP server (`pencil`) tools (`open_document`, `batch_design`, `snapshot_layout`, `get_screenshot`) to draw or update UI mockups in `.pen` design files.

2. **Initialize Change Workspace**:
   - Create `.opow/changes/<change-name>/` with subfolder `specs/`.
   - Copy and populate standard templates from `.opow/templates/`:
     - `proposal.md`: Why, Motivation, Scope, Non-Goals.
     - `design.md`: Architecture overview, technical decisions, and UI/UX wireframes (`.pen` design file links and screenshot embeds).
     - `tasks.md`: Trackable checklist of implementation steps.
     - `specs/<domain>.spec.md`: Delta Specs with `ADDED`, `MODIFIED`, `REMOVED` requirements and *Given-When-Then* scenarios.

3. **User Review Gate**:
   - Present the proposal, delta specs, and visual UI mockups to the user/developer.
   - Verify visual and contract accuracy of the specification.
   - Wait for explicit approval before proceeding to `/plan`.

