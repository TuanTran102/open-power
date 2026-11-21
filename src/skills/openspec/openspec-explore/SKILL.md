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

1. **Load Relevant Living Specs First (Selective & Progressive)**:
   - List `.opow/specs/` domain directories; select ONLY the matching `.opow/specs/<domain>/spec.md` file(s) (never load unrelated domains into context).
   - **Progressive Reading for Large Specs (>200 lines)**: NEVER read an entire large spec file blindly upfront. Read only the first ~80 lines (Overview + `Key Files / Code Map`), then grep `### Requirement:` / `### Capability:` or feature keywords and read ONLY the matching line ranges needed for `MODIFIED`/`REMOVED` delta specs (skip unrelated capabilities and changelog history).
   - Use the Living Spec's capabilities, contracts, and `Key Files / Code Map` as the baseline for `MODIFIED`/`REMOVED` delta specs and targeted code inspection.

2. **Locate Core Files**:
   - Start from the Living Spec's `Key Files / Code Map` when available; fall back to targeted grep only for unmapped or new areas.
   - Inspect relevant entry points, services, and tests, and trace data flow from input to storage / output.

3. **Assess Technical Constraints & Feasibility**:
   - Check framework versions, data schemas, and runtime limits.
   - Run lightweight probes / spikes if behavior is uncertain.

4. **Identify Breaking Changes**:
   - Will existing endpoints or function signatures change?
   - Will database schemas or configuration files require migration?

5. **Map to OpenSpec Artifacts & Context Manifest**:
   - Summarize findings into:
     - **Proposal context**: What modules need changes and why.
     - **Affected Files & Context Manifest**: Compile concrete file paths for Target Files to Modify, Target Files to Create, Reference/Dependency Files, and Test Files to eliminate downstream repo searches.
     - **Delta Specs**: Specific requirements to add/modify/remove.
     - **Tasks list**: High-level technical checklist linking directly to target files and test files.

---

## 2. Integration with `/opow-spec` & Standalone Usage

- **Within `/opow-spec`**: Executed automatically during Step 1 of the `/opow-spec` workflow to ground requirements in codebase realities before scaffolding.
- **Standalone `/opow-explore`**: Used as a fast spike and technical probe when testing feasibility without creating proposal files. Once findings are confirmed, transition to `/opow-spec` to formally scaffold the `.opow/changes/<change-name>/` directory.
