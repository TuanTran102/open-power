---
change_id: YYYYMMDDHHmmss-[change-slug]
title: Technical Design for [Change Title]
created_at: YYYY-MM-DDTHH:mm:ssZ
status: proposed
---

# Technical Design: [Change Name]

## 1. Architecture Overview
- High-level design and architectural components.
- Sequence / Flow diagrams if applicable.

## 2. UI / UX Wireframes & Mockups (.pen)
*(Applicable if change involves UI/Frontend components)*
- **Pencil (.pen) Design File**: `[path/to/design.pen]`
- **Screenshots / Visual Artifacts**: `![UI Mockup](path/to/screenshot.png)`
- **Key Visual Contracts**: Layout hierarchy, responsive breakpoints, interaction states.

## 3. Affected Files & Context Manifest
*(Pre-discovered during exploration to ground downstream /plan and /implement without exploratory search)*
- **Target Files to Modify**: `[path/to/existing/file]` - Core logic modifications.
- **Target Files to Create**: `[path/to/new/file]` - New interfaces, modules, or services.
- **Reference / Dependency Files**: `[path/to/dep]` - Relevant context, contracts, schemas.
- **Test Files**: `[path/to/test]` - Target test harness and unit/integration test files.

## 4. Component Breakdown & Responsibilities
- **[Component 1]**: Purpose, interfaces, and dependencies.
- **[Component 2]**: Purpose, interfaces, and dependencies.

## 5. Data Models & Schemas
- Input/Output data contracts and JSON Schema definitions.

## 6. Risks & Mitigations
- **Breaking Changes**: Impact on existing consumers and migration path.
- **Performance & Security Considerations**: Edge cases, rate limits, latency.

