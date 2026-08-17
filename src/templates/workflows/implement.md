---
description: Execute the implementation plan using strict Test-Driven Development (TDD) and Subagents.
---

# Implement Workflow (/implement)

**Purpose**: Execute the implementation plan using strict Test-Driven Development (TDD) and Subagents.

## Steps

1. **Pick the Next Task**:
   - Select the next incomplete task from `.opow/plans/<feature-name>.plan.md` and its corresponding Acceptance Criteria from `.opow/specs/<feature-name>.spec.md`.

2. **TDD Cycle (Red - Green - Refactor)**:
   - Invoke `test-driven-development`.
   - **Red**: Author unit / integration test verifying the Acceptance Criteria. Run the test to confirm it fails.
   - **Green**: Write the minimal code required to pass the test.
   - **Refactor**: Clean up the code while keeping tests green.

3. **Subagent Delegation (Optional)**:
   - For isolated sub-modules, invoke `subagent-driven-development` or dispatch subagents with precise spec slices.

4. **Task Completion**:
   - Check off the task in `.opow/plans/<feature-name>.plan.md` and proceed to the next until all tasks are complete.
