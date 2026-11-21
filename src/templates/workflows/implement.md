---
description: Execute the implementation plan using strict TDD and Subagents, then verify 100% of Delta Acceptance Criteria and automated tests before archiving.
---

# Implement Workflow (/implement)

**Purpose**: Execute the implementation plan using isolated Git Worktrees, strict Test-Driven Development (TDD), and Subagents, and validate 100% of Delta Acceptance Criteria and automated test coverage before handoff to `/archive`.

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
   - **Commit**: Commit changes using the spec timestamp prefix: `git commit -m "[<timestamp>] <type>: <message>"` (e.g. `[20260902171500] feat: handle restart focus`).

4. **Bounded Subagent Delegation (Optional — Lazy-Load)**:
   - **Lazy-load only**: Do NOT read or invoke `subagent-driven-development` upfront when executing small or sequential tasks directly; invoke it **only when** dispatching 2+ independent tasks to subagents.
   - **Bounded Context Handoff**: When delegating to a subagent, the prompt MUST provide:
     1. Exact target file path(s) to modify or create.
     2. Exact test file path(s) and specific test command.
     3. The exact delta acceptance criteria and requirements to implement.
   - **Prohibit Unconstrained Exploration**: Subagents are strictly forbidden from running unconstrained repo searches or repo grepping across the entire workspace; they MUST operate strictly within the provided target files and test files.
   - Ensure commit messages adhere to the `[<timestamp>]` prefix.

5. **Task Completion**:
   - Check off `- [x]` in `.opow/changes/<change-name>/tasks.md` and repeat until all tasks are complete.

6. **Final Verification Gate (`verification-before-completion`)**:
   - **Run Full Automated Test Suite**: Execute all project tests inside `.worktrees/<change-name>/` (e.g. `npm test` or `pytest`) and ensure a 100% pass rate.
   - **Step-by-step Delta Acceptance Criteria Check**:
     - Invoke `verification-before-completion`.
     - Open `.opow/changes/<change-name>/specs/*.spec.md`.
     - Walk through every single scenario (*Given - When - Then*) in the `ADDED` and `MODIFIED` sections.
   - **Verify Living Spec Ready**: Confirm all delta requirements are implemented and ready to merge into `.opow/specs/`.

7. **Handoff to Archive (DO NOT CLOSE WORKTREE)**:
   - **CRITICAL**: DO NOT merge branches, delete, or clean up `.worktrees/<change-name>`.
   - **CRITICAL**: DO NOT invoke `finishing-a-development-branch`. Worktrees are managed solely by `/archive`.
   - Keep the worktree intact for user review/UAT and inform the user that implementation and verification are complete and ready for `/archive`.

