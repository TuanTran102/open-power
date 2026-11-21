---
description: Fast-track bugfixes and small changes (<3 files) using opow-systematic-debugging, TDD, and minimal delta tracking without full /spec ceremony.
---

# Fast-Track Workflow (/opow-fast)

**Purpose**: Fix bugs or apply small, well-scoped changes (< 3 source files, no architectural or breaking API changes) using `opow-systematic-debugging`, strict TDD, and minimal delta tracking without full `/opow-spec` ceremony.

## Scope & Escalation Guard

- **Eligible**: Bugfixes, hotfixes, or small enhancements touching **< 3 source files** with no schema, public API contract, or architectural changes.
- **Escalate**: If diagnosis reveals **>= 3 source files**, breaking/API contract changes, or architectural impact, **STOP and escalate to `/opow-spec`**.

## Steps

1. **Diagnose & Ground (`opow-systematic-debugging`)**:
   - Invoke `opow-systematic-debugging` to reproduce the issue and isolate the root cause.
   - If a matching domain spec exists under `.opow/specs/`, read only its `Key Files / Code Map` and relevant requirement section to confirm expected behavior.
   - Confirm the fix touches < 3 source files; otherwise escalate to `/opow-spec`.

2. **Minimal Delta Tracking (No `proposal.md` / `design.md`)**:
   - Do **NOT** scaffold `proposal.md` or `design.md`.
   - If observable behavior or a contract scenario changes, create only a minimal delta spec at `.opow/changes/YYYYMMDDHHmmss-fast-<slug>/specs/<domain>.spec.md` (`ADDED` / `MODIFIED` scenario only).
   - For internal bugfixes with no spec change, skip `.opow/changes/` entirely.

3. **TDD Implementation (`opow-test-driven-development`)**:
   - Invoke `opow-test-driven-development`:
     - **Red**: Write a failing regression test reproducing the bug or new behavior.
     - **Green**: Implement the minimal fix to make the test pass.
     - **Refactor**: Clean up while keeping all tests green.

4. **Verify & Finalize (`opow-verification-before-completion`)**:
   - Invoke `opow-verification-before-completion` and run the relevant/full automated test suite (100% pass).
   - Commit with `[<timestamp>] fix: <description>` (if using a change ID) or `fix: <description>`.
   - If a minimal delta spec was created, merge it into `.opow/specs/<domain>/spec.md` (with Changelog entry) and move the folder to `.opow/archive/YYYYMMDDHHmmss-fast-<slug>/`.
