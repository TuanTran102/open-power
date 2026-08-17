---
description: Transform an approved OpenSpec document into an actionable, atomic implementation plan.
---

# Plan Workflow (/plan)

**Purpose**: Transform an approved OpenSpec document into an actionable, atomic implementation plan.

## Steps

1. **Load OpenSpec**:
   - Locate and read the relevant specification file in `.opow/specs/<feature-name>.spec.md`.
   - Verify that all Acceptance Criteria are well-defined.

2. **Deconstruct into Atomic Tasks & Save Plan**:
   - Invoke `writing-plans`.
   - Break down the requirements into small, testable tasks.
   - For every task, map it 1:1 to specific Acceptance Criteria from the spec.
   - **Save the plan to `.opow/plans/<feature-name>.plan.md`** (overriding any default `docs/` path).

3. **Plan TDD Test Strategy**:
   - Specify which unit/integration tests must be authored for each task.
   - Order tasks logically with dependencies resolved first.

4. **Review & Gate**:
   - Present the implementation plan in `.opow/plans/<feature-name>.plan.md` to the user for approval before running `/implement`.
