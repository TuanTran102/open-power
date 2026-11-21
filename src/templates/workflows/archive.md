---
description: Merge verified delta specs into living specs (.opow/specs/) and move completed change to .opow/archive/.
---

# Archive Workflow (/archive)

**Purpose**: Finalize a completed change by updating the system's Living Specs and Changelog, merging isolated worktree code into main, cleaning up the worktree, and archiving change artifacts.

## Prerequisites

- `/implement` workflow (including its `verification-before-completion` gate) has completed with **100% test pass rate** and all Delta Acceptance Criteria verified.

## Steps

1. **Locate Change Artifacts**:
   - Open `.opow/changes/YYYYMMDDHHmmss-<slug>/`.
   - Read delta specs in `.opow/changes/YYYYMMDDHHmmss-<slug>/specs/`.
   - Read `design.md` (specifically `## 3. Affected Files & Context Manifest`) to collect finalized source and test file paths.

2. **Merge into Living Specs (`.opow/specs/`) & Record Changelog**:
   - For each modified domain, update or create `.opow/specs/<domain>/spec.md`:
     - Apply `ADDED` requirements to the living spec.
     - Update `MODIFIED` requirements in the living spec.
     - Deprecate or remove `REMOVED` requirements from the living spec.
     - Sync `Key Files / Code Map` from `design.md`'s `Affected Files & Context Manifest` (add newly created files, keep modified files current, remove deleted files) so future `/spec` runs avoid broad repo searches.
     - Keep the living spec lean and focused on current active behavior (remove superseded rules; detailed history stays in `.opow/archive/`).
     - Append entry to the `## Changelog & Audit History` section with date, `change_id`, summary, and author.

3. **Update User Documentation & README**:
   - Check if the change introduces new user-facing features, CLI commands, parameters, or behaviors.
   - Ensure `README.md` and user guides are fully updated and consistent with the new implementation.

4. **Merge Code & Clean up Worktree**:
   - Switch to the main branch on the primary workspace and merge `feat/<change-id>`:
     ```bash
     git checkout main
     git merge feat/<change-id>
     ```
   - Verify tests pass on `main`.
   - Remove the isolated worktree and delete the feature branch:
     ```bash
     git worktree remove .worktrees/<change-id>
     git branch -d feat/<change-id>
     ```

5. **Move to Archive & Clean up Plans**:
   - Move the entire folder `.opow/changes/YYYYMMDDHHmmss-<slug>/` to `.opow/archive/YYYYMMDDHHmmss-<slug>/`.
   - If an implementation plan exists at `.opow/plans/YYYYMMDDHHmmss-<slug>.plan.md`, move it to `.opow/archive/YYYYMMDDHHmmss-<slug>/plan.md`.

6. **Sign-off**:
   - Inform the user that the change has been successfully integrated into the system's Living Specs, Changelog, and main branch.
