---
change_id: YYYYMMDDHHmmss-[change-slug]
title: Implementation Tasks for [Change Title]
created_at: YYYY-MM-DDTHH:mm:ssZ
status: in_progress
plan_status: draft # draft | ready (enriched in-place by /opow-plan)
---

# Implementation Tasks: [Change Name]

> Each task MUST link directly to its target file `[target/file]` and corresponding test file `Test: [test/file]`. `/opow-spec` creates this checklist; `/opow-plan` enriches it in-place into an atomic TDD plan (`Red → Green → Refactor`) mapped to Delta Acceptance Criteria (`AC:`).

## Phase 1: Setup & Scaffolding
- [ ] 1.1: `[target/file]` Initialize new directories, schemas, and configurations. AC: `[Scenario/Requirement]` | Test: `[test/file]` (Command: `npm test path/to/test`)
  - Red → Green → Refactor: [Atomic step notes filled by /opow-plan]
- [ ] 1.2: `[test/file]` Set up base test fixtures and mocks.

## Phase 2: Core Implementation
- [ ] 2.1: `[target/file]` Implement [Feature Part A]. AC: `[Scenario/Requirement]` | Test: `[test/file]` (Command: `npm test path/to/test`)
  - Red: [Failing test assertion] → Green: [Minimal implementation] → Refactor: [Cleanup]
- [ ] 2.2: `[target/file]` Implement [Feature Part B]. AC: `[Scenario/Requirement]` | Test: `[test/file]` (Command: `npm test path/to/test`)
  - Red: [Failing test assertion] → Green: [Minimal implementation] → Refactor: [Cleanup]

## Phase 3: Integration, Documentation & Verification
- [ ] 3.1: `[test/suite]` Run integration test suite across modules.
- [ ] 3.2: `[specs/<domain>.spec.md]` Verify 100% of Acceptance Criteria in Delta Specs.
- [ ] 3.3: `[README.md]` Update user-facing documentation (README.md, CLI help, guides).
