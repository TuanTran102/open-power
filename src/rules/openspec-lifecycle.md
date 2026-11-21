---
trigger: always_on
description: Preserve worktrees across OpenSpec lifecycle until /archive and enforce commit message prefix
---
# OpenSpec Lifecycle & Commit Convention Rule

- When working on tasks governed by OpenSpec (`.opow/changes/` or workflows `/spec`, `/plan`, `/implement`, `/archive`):
  1. The isolated worktree (`.worktrees/<change-name>`) MUST remain intact after completing `/implement` (including its built-in verification gate) to facilitate user review and acceptance testing before `/archive`.
  2. DO NOT merge branches, delete, or clean up the worktree upon finishing implementation tasks.
  3. The worktree and feature branch MUST ONLY be merged and deleted during the `/archive` workflow step.
  4. **Commit Prefix**: All git commit messages created during implementation MUST be prefixed with the spec timestamp in brackets: `[<timestamp>] <type>: <description>` (e.g. `[20260902171500] feat: handle restart focus`), where `<timestamp>` is the 14-digit timestamp from the change ID (`YYYYMMDDHHmmss`).
