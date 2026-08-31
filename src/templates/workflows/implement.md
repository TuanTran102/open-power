---
description: Execute the implementation plan using strict Test-Driven Development (TDD) and Subagents, ticking off tasks.md.
---

# Implement Workflow (/implement)

**Purpose**: Execute the implementation plan using isolated Git Worktrees, strict Test-Driven Development (TDD), and Subagents.

## Steps

1. **Set up Isolated Workspace (Git Worktree)**:
   - Invoke `using-git-worktrees`.
   - Create or switch to an isolated worktree at `.worktrees/<change-name>` on branch `feat/<change-name>` to prevent multi-tasking conflicts:
     ```bash
     git worktree add .worktrees/<change-name> -b feat/<change-name>
     ```
   - Verify baseline tests pass inside the worktree workspace before starting implementation.

2. **Pick the Next Task**:
   - Select the next item from `.opow/changes/<change-name>/tasks.md` (and `.opow/plans/<change-name>.plan.md`).

3. **TDD Cycle (Red - Green - Refactor)**:
   - Invoke `test-driven-development` inside the isolated worktree.
   - **Red**: Author unit / integration test verifying the Delta Acceptance Criteria. Confirm test fails.
   - **Green**: Write minimal code to make the test pass.
   - **Refactor**: Clean up the code while keeping all tests green.

4. **Subagent Delegation (Optional)**:
   - For isolated tasks, invoke `subagent-driven-development` to dispatch independent workers.

5. **Task Completion**:
   - Check off `- [x]` in `.opow/changes/<change-name>/tasks.md` and repeat until all tasks are complete.

