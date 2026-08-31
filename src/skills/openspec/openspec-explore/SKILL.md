---
name: openspec-explore
description: Use when exploring the codebase, auditing technical impact, analyzing dependencies, or preparing Delta Spec inputs before proposing changes
---

# OpenSpec Explore (`openspec-explore`)

Use this skill as a technical investigation partner to understand the codebase and evaluate technical feasibility before drafting a change proposal.

## Core Purpose

Bridge the gap between product intent and codebase reality:
- **Codebase Auditing**: Identify which services, modules, APIs, or UI components currently handle the relevant logic.
- **Impact & Dependency Analysis**: Find all consumers, callers, schemas, and tests that could be affected or broken.
- **Delta Preparation**: Map out the exact requirements that will be `ADDED`, `MODIFIED`, or `REMOVED` in `.opow/changes/<change-id>/specs/`.

---

## 1. Investigation Workflow

1. **Locate Core Files**:
   - Grep and inspect relevant entry points, services, and tests.
   - Trace data flow from input to storage / output.

2. **Assess Technical Constraints & Feasibility**:
   - Check framework versions, data schemas, and runtime limits.
   - Run lightweight probes / spikes if behavior is uncertain.

3. **Identify Breaking Changes**:
   - Will existing endpoints or function signatures change?
   - Will database schemas or configuration files require migration?

4. **Map to OpenSpec Artifacts**:
   - Summarize findings into:
     - **Proposal context**: What modules need changes and why.
     - **Delta Specs**: Specific requirements to add/modify/remove.
     - **Tasks list**: High-level technical checklist.

---

## 2. Integration with `/spec` & Standalone Usage

- **Within `/spec`**: Executed automatically during Step 1 of the `/spec` workflow to ground requirements in codebase realities before scaffolding.
- **Standalone `/explore`**: Used as a fast spike and technical probe when testing feasibility without creating proposal files. Once findings are confirmed, transition to `/spec` to formally scaffold the `.opow/changes/<change-name>/` directory.
