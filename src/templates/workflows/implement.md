---
description: Execute the implementation plan using strict Test-Driven Development (TDD) and Subagents, ticking off tasks.md.
---

# Implement Workflow (/implement)

**Purpose**: Execute the implementation plan using strict Test-Driven Development (TDD) and Subagents.

## Steps

1. **Pick the Next Task**:
   - Select the next item from `.opow/changes/<change-name>/tasks.md` (and `.opow/plans/<change-name>.plan.md`).

2. **TDD Cycle (Red - Green - Refactor)**:
   - Invoke `test-driven-development`.
   - **Red**: Author unit / integration test verifying the Delta Acceptance Criteria. Confirm test fails.
   - **Green**: Write minimal code to make the test pass.
   - **Refactor**: Clean up the code while keeping all tests green.

3. **Subagent Delegation (Optional)**:
   - For isolated tasks, invoke `subagent-driven-development` to dispatch independent workers.

4. **Task Completion**:
   - Check off `- [x]` in `.opow/changes/<change-name>/tasks.md` and repeat until all tasks are complete.
