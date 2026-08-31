---
name: spec-driven-development
description: Use when authoring requirements, API contracts, or features - guides creating OpenSpec proposals, delta specs, and managing living specs
---

# Spec-Driven Development (OpenSpec)

Use this skill whenever you are defining, designing, or implementing a new feature, API contract, or architecture change.

## Core Principle

**No code without a spec. No spec without unambiguous Acceptance Criteria.**

OpenSpec treats specifications as living system documentation with an explicit lifecycle:
$$\text{Propose (Explore \& Spec)} \longrightarrow \text{Plan} \longrightarrow \text{Apply (TDD Execution)} \longrightarrow \text{Verify} \longrightarrow \text{Archive (Merge into Living Specs)}$$

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

## 3. UI & Visual Specifications (Pencil MCP)

For frontend or UI/UX features, text specifications alone can leave ambiguity in layout, component structure, and responsiveness.

1. **Pencil MCP Integration**:
   - Use the Pencil MCP server (`pencil`) tools (`open_document`, `batch_design`, `snapshot_layout`, `get_screenshot`) to create or update visual UI designs in `.pen` files.
   - Design files are stored under `.opow/changes/<change-id>/designs/` or project design folders.

2. **Embedding Visual Assets in OpenSpec**:
   - Capture snapshots or screenshots of the `.pen` designs using `get_screenshot` / `snapshot_layout`.
   - Embed visual links and images in `design.md` under `## UI / UX Wireframes & Mockups`.
   - Map visual elements directly to Acceptance Criteria scenarios in delta specs.

3. **Developer Verification Gate**:
   - Reviewers and developers inspect both the Given-When-Then scenarios and rendered Pencil mockups to verify visual precision before code implementation.

4. **Pencil MCP Availability Guard & Halting**:
   - If the Pencil MCP server is unavailable, fails to connect, or returns an error during UI visual spec creation, notify the user immediately.
   - Halt all further execution and wait for the user to complete setup before proceeding with specification or implementation.

---

## 4. The 5-Step Development Loop

1. **`/spec` (Explore & Spec)**: Brainstorm requirements (`brainstorming`), audit codebase and dependencies (`openspec-explore`), design visual UI mockups (`pencil` MCP - halt and alert user if unavailable), and author `.opow/changes/<change-id>/` (`proposal.md`, `design.md`, `tasks.md`, delta `specs/`).
2. **`writing-plans` (`/plan`)**: Break down `tasks.md` into atomic TDD steps in `.opow/plans/<change-id>.plan.md`.
3. **`test-driven-development` (`/implement`)**: Set up an isolated workspace via `using-git-worktrees` (`.worktrees/<change-id>`), then implement each task using Red-Green-Refactor + subagents.
4. **`/verify` (`verification-before-completion`)**: Validate 100% Acceptance Criteria and automated test suites.
5. **`/archive`**: Merge delta specs into living specs (`.opow/specs/`), merge feature branch into `main`, clean up `.worktrees/<change-id>`, and move the change folder to `.opow/archive/<change-id>/`.

*(Note: `/explore` remains available as an optional standalone spike command for lightweight investigations without scaffolding files).*

