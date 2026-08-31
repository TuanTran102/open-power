---
description: Author a structured OpenSpec change proposal (proposal.md, design.md, tasks.md, delta specs) in .opow/changes/.
---

# Spec Workflow (/spec)

**Purpose**: Author a structured OpenSpec change proposal in `.opow/changes/<change-name>/` before writing any code.

## Steps

1. **Clarification & Brainstorming**:
   - Invoke `brainstorming` and `spec-driven-development`.
   - Discuss product intent, edge cases, and scope with the user.

2. **Initialize Change Workspace**:
   - Create `.opow/changes/<change-name>/` with subfolder `specs/`.
   - Copy and populate standard templates from `.opow/templates/`:
     - `proposal.md`: Why, Motivation, Scope, Non-Goals.
     - `design.md`: Architecture overview and technical decisions.
     - `tasks.md`: Trackable checklist of implementation steps.
     - `specs/<domain>.spec.md`: Delta Specs with `ADDED`, `MODIFIED`, `REMOVED` requirements and *Given-When-Then* scenarios.

3. **User Review Gate**:
   - Present the proposal and delta specs to the user.
   - Wait for explicit approval before proceeding to `/plan`.
