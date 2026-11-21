---
description: Transform an approved OpenSpec change into an actionable, atomic TDD implementation plan.
---

# Plan Workflow (/opow-plan)

**Purpose**: Transform an approved change proposal into an actionable, atomic implementation plan.

## Steps

1. **Load OpenSpec Change Proposal**:
   - Locate and read `.opow/changes/YYYYMMDDHHmmss-<slug>/proposal.md`, `design.md`, `tasks.md`, and `specs/*.spec.md`.
   - Verify that all Acceptance Criteria and Delta Requirements are complete.

2. **Enrich `tasks.md` In-Place into Atomic TDD Plan**:
   - Invoke `opow-writing-plans`.
   - Enrich `.opow/changes/YYYYMMDDHHmmss-<slug>/tasks.md` **in-place** into an atomic TDD implementation plan (do NOT create a separate `.opow/plans/` file).
   - Inherit explicit file links and concrete file paths from `design.md` and `tasks.md` directly into atomic implementation steps without redundant repo grepping.
   - Map every task 1:1 to specific Acceptance Criteria (`AC:`) from the Delta Specs, including target test paths, test commands, and Red-Green-Refactor steps.
   - Set `plan_status: ready` in `tasks.md` YAML frontmatter.

3. **Plan TDD Test Strategy**:
   - Specify unit/integration tests for each atomic step following Red-Green-Refactor.

4. **Review & Gate**:
   - Present the plan to the user for sign-off before running `/opow-implement`.
