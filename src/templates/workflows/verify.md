---
description: Validate 100% of OpenSpec Acceptance Criteria and verify automated test coverage before completion.
---

# Verify Workflow (/verify)

**Purpose**: Validate 100% of OpenSpec Acceptance Criteria and verify automated test coverage before completion.

## Steps

1. **Run Full Test Suite**:
   - Execute all unit, integration, and end-to-end tests across the project.
   - Ensure 100% pass rate.

2. **Step-by-step Acceptance Criteria Check**:
   - Invoke `verification-before-completion`.
   - Open `.opow/specs/<feature-name>.spec.md`.
   - Walk through every single scenario (*Given - When - Then*) and verify observable behavior.

3. **Walkthrough & Final Report**:
   - Summarize code changes, tests executed, and verified Acceptance Criteria.
   - Present the final report to the user for sign-off.
