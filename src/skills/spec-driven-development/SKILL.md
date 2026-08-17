---
name: spec-driven-development
description: Use when authoring requirements, API contracts, or features - guides creating OpenSpec documents in .opow/specs/ and converting Acceptance Criteria into TDD tests
---

# Spec-Driven Development (OpenSpec)

Use this skill whenever you are defining, designing, or implementing a new feature, API contract, or architecture component.

## Core Principle

**No code without a spec. No spec without unambiguous Acceptance Criteria.**

All specifications and plans live in the project's `.opow/` directory (`.opow/specs/` and `.opow/plans/`) and serve as the single source of truth for both implementation and verification.

---

## 1. Directory Structure

```
.opow/
├── specs/
│   ├── templates/                     # Reusable templates
│   │   ├── feature.spec.md
│   │   ├── api.spec.md
│   │   └── schema-template.json
│   └── <feature-name>.spec.md         # Active feature specifications
└── plans/
    └── <feature-name>.plan.md         # Actionable atomic implementation plans
```

---

## 2. Writing an OpenSpec Document

When drafting a new specification:
1. Choose the appropriate template from `.opow/specs/templates/`.
2. Define the **Problem Statement**, **Goals**, and **Non-Goals**.
3. Detail the **Data Models / Schemas** using JSON Schema syntax.
4. Write strict **Acceptance Criteria (AC)** using the *Given - When - Then* format:

```markdown
### Scenario: User Authentication via Token
- **Given**: A valid bearer token for user ID "usr_100".
- **When**: The client calls `GET /api/v1/profile`.
- **Then**: Response status is `200 OK` and payload contains user profile object.
```

---

## 3. Integrating with Superpowers Skills

- **Brainstorming**: Use the `brainstorming` skill to explore edge cases before finalizing the OpenSpec.
- **Planning (`writing-plans`)**: Break the OpenSpec down into atomic tasks and save the plan to `.opow/plans/<feature>.plan.md`. Every task must reference an Acceptance Criterion.
- **TDD (`test-driven-development`)**: Convert each *Given - When - Then* scenario directly into a test case before writing implementation code.
- **Verification (`verification-before-completion`)**: Verify that all Acceptance Criteria in `.opow/specs/<feature>.spec.md` pass before marking work complete.
