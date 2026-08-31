---
description: Transform an approved OpenSpec change into an actionable, atomic TDD implementation plan.
---

# Plan Workflow (/plan)

**Purpose**: Transform an approved change proposal into an actionable, atomic implementation plan.

## Steps

1. **Load OpenSpec Change Proposal**:
   - Locate and read `.opow/changes/YYYYMMDDHHmmss-<slug>/proposal.md`, `design.md`, and `specs/*.spec.md`.
   - Verify that all Acceptance Criteria and Delta Requirements are complete.

2. **Deconstruct into Atomic Tasks & Align `tasks.md`**:
   - Invoke `writing-plans`.
   - Synchronize and detail `.opow/changes/YYYYMMDDHHmmss-<slug>/tasks.md`.
   - Map every task 1:1 to specific Acceptance Criteria from the Delta Specs.
   - **Save the plan to `.opow/plans/YYYYMMDDHHmmss-<slug>.plan.md`** matching the change ID.

3. **Plan TDD Test Strategy**:
   - Specify unit/integration tests for each atomic step following Red-Green-Refactor.

4. **Review & Gate**:
   - Present the plan to the user for sign-off before running `/implement`.
