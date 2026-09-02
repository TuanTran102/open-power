---
description: Execute the implementation plan using strict Test-Driven Development (TDD) and Subagents, ticking off tasks.md.
---

# Implement Workflow (/implement)

**Purpose**: Execute the implementation plan using isolated Git Worktrees, strict Test-Driven Development (TDD), and Subagents.

## Steps

1. **MANDATORY HARD-GATE: Isolated Workspace (Git Worktree)**:
   - Invoke `using-git-worktrees` with automatic enforcement.
   - **DO NOT ASK FOR CONSENT**: Worktree isolation is mandatory for all implementation tasks.
   - Check if currently running inside the isolated worktree:
     ```bash
     GIT_DIR=$(cd "$(git rev-parse --git-dir 2>/dev/null)" && pwd -P)
     GIT_COMMON=$(cd "$(git rev-parse --git-common-dir 2>/dev/null)" && pwd -P)
     ```
   - If not isolated (`GIT_DIR == GIT_COMMON`), immediately create and switch:
     1. Verify `.worktrees` is ignored: `git check-ignore -q .worktrees || (echo ".worktrees/" >> .gitignore && git commit -am "chore: ignore .worktrees")`
     2. Create worktree: `git worktree add .worktrees/<change-name> -b feat/<change-name>`
   - **CRITICAL CONSTRAINT**: ALL subsequent file edits, tool calls, and test executions MUST target the `.worktrees/<change-name>/` directory. NEVER touch the root workspace during implementation.
   - Run baseline tests inside `.worktrees/<change-name>/` to verify clean state before proceeding.

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

