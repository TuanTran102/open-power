---
name: spec-driven-development
description: Use when authoring requirements, API contracts, or features - guides creating OpenSpec proposals, delta specs, and managing living specs
---

# Spec-Driven Development (OpenSpec)

Use this skill whenever you are defining, designing, or implementing a new feature, API contract, or architecture change.

## Core Principle

**No code without a spec. No spec without unambiguous Acceptance Criteria.**

OpenSpec treats specifications as living system documentation with an explicit lifecycle:
$$\text{Propose (Active Changes)} \longrightarrow \text{Apply (TDD Execution)} \longrightarrow \text{Verify} \longrightarrow \text{Archive (Merge into Living Specs)}$$

---

## 1. Directory Structure

```text
.opow/
├── specs/                          # LIVING SPECS: Source of truth of current system behavior
│   └── <domain>/spec.md
├── changes/                        # ACTIVE CHANGES: In-flight change proposals
│   └── <change-id>/
│       ├── proposal.md             # Why, problem statement, and scope
│       ├── design.md               # Architecture and technical design
│       ├── tasks.md                # Trackable implementation checklist
│       └── specs/                  # Delta Specs for this change
│           └── <domain>.spec.md
├── archive/                        # COMPLETED HISTORY: Archived changes
│   └── <change-id>/
└── templates/                      # Standard OpenSpec templates
    ├── proposal.md
    ├── design.md
    ├── tasks.md
    ├── delta.spec.md
    └── living.spec.md
```

---

## 2. Delta Specs Format

Delta specs in `.opow/changes/<change-id>/specs/` define precise requirement deltas:

### `ADDED` Requirements
New capabilities introduced to the system.
```markdown
### ADDED Requirements

#### Requirement: [New Feature Name]
The system SHALL [description].

### Scenario: [Scenario Name]
- **Given**: [Precondition]
- **When**: [Action]
- **Then**: [Observable outcome]
```

### `MODIFIED` Requirements
Existing behavior being changed (includes Before & After).
```markdown
### MODIFIED Requirements

#### Requirement: [Feature Name]
- **Before**: [Previous behavior]
- **After**: [Updated behavior]

### Scenario: [Updated Scenario Name]
- **Given**: [Precondition]
- **When**: [Action]
- **Then**: [New observable outcome]
```

### `REMOVED` Requirements
Capabilities or endpoints being deprecated or deleted.
```markdown
### REMOVED Requirements

#### Requirement: [Feature Name]
- **Reason**: [Why removed]
- **Migration**: [Alternative path]
```

---

## 3. The 6-Step Development Loop

1. **`brainstorming`**: Clarify product intent, requirements, and edge cases.
2. **`openspec-explore` (`/explore`)**: Audit codebase, dependencies, and breaking changes.
3. **`/spec`**: Create `.opow/changes/<change-id>/` with `proposal.md`, `design.md`, `tasks.md`, and delta `specs/`.
4. **`writing-plans` (`/plan`)**: Break down `tasks.md` into atomic TDD steps in `.opow/plans/<change-id>.plan.md`.
5. **`test-driven-development` (`/implement`)**: Implement each task using Red-Green-Refactor + subagents.
6. **`/verify` & `/archive`**: Verify 100% Acceptance Criteria, then merge delta specs into `.opow/specs/` and move the change folder to `.opow/archive/<change-id>/`.
