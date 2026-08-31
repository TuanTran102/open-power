---
name: openspec-sync
description: Use when auditing code changes or Git diff against OpenSpec living specifications to detect spec drift and reverse-sync specs
---

# OpenSpec Sync (`openspec-sync`)

Use this skill when existing code changes (uncommitted modifications, PR branches, or legacy modules) have drifted from or lack documentation in `.opow/specs/`.

## Core Purpose

Detect spec drift and reverse-engineer accurate OpenSpec specifications directly from the codebase:
- **Drift Detection**: Compare Git diff (`git diff`, `git status`, or target branch diffs) against living specs in `.opow/specs/`.
- **Requirement Extraction**: Reverse-engineer requirements, schemas, business logic, and error behaviors into standard OpenSpec format.
- **Bi-directional Reconciliation**: Bring system documentation back into 100% alignment with the running codebase.

---

## 1. Audit & Drift Detection Workflow

1. **Inspect Code Changes**:
   - Check modified files via `git status` and `git diff`.
   - Audit changed functions, routes, data models, error codes, and configuration options.

2. **Cross-Reference Living Specs**:
   - Inspect existing living specifications in `.opow/specs/<domain>/spec.md`.
   - Identify missing requirements, altered contracts, or deprecated features.

3. **Extract Requirements & Scenarios**:
   - Formulate unambiguous requirements using RFC 2119 keywords (`SHALL`, `MUST`).
   - Extract testable scenarios using the standard *Given - When - Then* format.

---

## 2. Synchronization Modes

Choose the appropriate synchronization mode based on workflow needs:

### Mode A: Change Proposal Generation (Recommended)
Use when code changes need formal review, traceability, or team sign-off before updating living specs.

1. Create a change proposal folder `.opow/changes/sync-<feature>/`.
2. Generate the standard OpenSpec change bundle:
   - `proposal.md`: Summary of code changes and rationale for syncing.
   - `design.md`: Reverse-engineered technical architecture and contracts.
   - `tasks.md`: Verification checklist for tests.
   - `specs/<domain>.spec.md`: Delta specifications using `ADDED`, `MODIFIED`, and `REMOVED` sections.
3. Review the proposal with the user before archiving via `/archive`.

### Mode B: Direct Living Spec Sync
Use for immediate updates or when reconciling living documentation directly without an intermediate change package.

1. Identify the target domain under `.opow/specs/<domain>/spec.md`.
2. Update the living spec directly:
   - Add new capabilities under the appropriate requirements.
   - Update modified signatures, types, or behavior.
   - Remove or deprecate obsolete requirements.
3. Confirm with the user that `.opow/specs/` accurately reflects current codebase behavior.

---

## 3. Best Practices

- **Strict Gherkin Formatting**: Always use Given-When-Then for scenarios.
- **Evidence-Based Extraction**: Derive specifications strictly from actual code implementation and unit test assertions, not speculative intent.
- **Preserve Domain Separation**: Maintain modularity by keeping specifications organized by domain under `.opow/specs/<domain>/` or `.opow/changes/<change-id>/specs/<domain>.spec.md`.
