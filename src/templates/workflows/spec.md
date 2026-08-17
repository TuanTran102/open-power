---
description: Author a clear, unambiguous OpenSpec requirement document before writing any code.
---

# Spec Workflow (/spec)

**Purpose**: Author a clear, unambiguous OpenSpec requirement document before writing any code.

## Steps

1. **Clarification & Brainstorming**:
   - Invoke `brainstorming` and `spec-driven-development`.
   - Interview the user regarding feature goals, edge cases, data constraints, and non-goals.

2. **Draft the OpenSpec**:
   - Check `.opow/specs/templates/feature.spec.md` or `.opow/specs/templates/api.spec.md`.
   - Create `.opow/specs/<feature-name>.spec.md`.
   - Document:
     - Context & Problem Statement
     - Architecture & Schemas (JSON Schema)
     - **Acceptance Criteria (AC)** strictly formatted as:
       ```markdown
       ### Scenario: [Scenario Name]
       - **Given**: [Precondition]
       - **When**: [Action]
       - **Then**: [Observable outcome]
       ```

3. **Review & Gate**:
   - Request user feedback and approval on the spec before proceeding to `/plan`.
