---
description: Validate 100% of Delta Acceptance Criteria and verify automated test coverage before archiving.
---

# Verify Workflow (/verify)

**Purpose**: Validate 100% of Delta Acceptance Criteria and verify automated test coverage before completion.

## Steps

1. **Run Full Automated Test Suite**:
   - Execute all project tests (e.g. `npm test` or `pytest`).
   - Ensure 100% pass rate.

2. **Step-by-step Delta Acceptance Criteria Check**:
   - Invoke `verification-before-completion`.
   - Open `.opow/changes/<change-name>/specs/*.spec.md`.
   - Walk through every single scenario (*Given - When - Then*) in the `ADDED` and `MODIFIED` sections.

3. **Verify Living Spec Ready**:
   - Confirm all delta requirements are implemented and ready to merge into `.opow/specs/`.

4. **Handoff**:
   - Prompt the user or automatically transition to `/archive` to finalize the change.
