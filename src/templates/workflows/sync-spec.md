---
description: Audit codebase modifications or Git diff and synchronize changes into OpenSpec living specs or change proposals.
---

# Sync Spec Workflow (/sync-spec)

**Purpose**: Detect spec drift and synchronize undocumented code changes into OpenSpec format.

## Steps

1. **Invoke Skill**:
   - Activate `openspec-sync`.

2. **Audit Codebase Drift**:
   - Inspect uncommitted changes (`git diff`, `git status`) or specified commit range.
   - Cross-reference against current Living Specs in `.opow/specs/`.

3. **Select Sync Mode**:
   - **Mode A (Change Proposal)**: Scaffold `.opow/changes/sync-<feature>/` with `proposal.md`, `design.md`, `tasks.md`, and delta `specs/`.
   - **Mode B (Direct Sync)**: Directly update the corresponding `.opow/specs/<domain>/spec.md` with new/modified requirements.

4. **Verify & Sign-off**:
   - Review the generated or updated specifications with the user to ensure 100% alignment with actual code behavior.
