---
description: Author a structured OpenSpec change proposal (proposal.md, design.md, tasks.md, delta specs) in .opow/changes/.
---

# Spec Workflow (/spec)

**Purpose**: Audit the codebase and author a structured OpenSpec change proposal in `.opow/changes/YYYYMMDDHHmmss-<slug>/` before writing any code.

## Steps

1. **Clarification, Exploration & Brainstorming**:
   - Invoke `brainstorming`, `openspec-explore`, and `spec-driven-development`.
   - **Audit Codebase**: Trace existing control flows, schemas, APIs, and identify affected files/modules or potential breaking changes.
   - **Product Intent & Edge Cases**: Discuss requirements, constraints, and scope with the user.

2. **Initialize Change Workspace**:
   - Create `.opow/changes/YYYYMMDDHHmmss-<slug>/` (using current timestamp `YYYYMMDDHHmmss` and short descriptive slug, e.g. `20260901143000-auth-feature`) with subfolder `specs/`.
   - Copy and populate standard templates from `.opow/templates/` with YAML frontmatter (`change_id`, `created_at`, `status`):
     - `proposal.md`: Why, Motivation, Scope, Non-Goals.
     - `design.md`: Architecture overview, codebase audit findings, and technical decisions.
     - `tasks.md`: Trackable checklist of implementation steps.
     - `specs/<domain>.spec.md`: Delta Specs with `ADDED`, `MODIFIED`, `REMOVED` requirements and *Given-When-Then* scenarios.

3. **User Review Gate**:
   - Present the proposal and delta specs to the user/developer.
   - Verify architectural and contract accuracy of the specification.
   - Wait for explicit approval before proceeding to `/plan`.
