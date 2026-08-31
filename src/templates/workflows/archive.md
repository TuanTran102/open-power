---
description: Merge verified delta specs into living specs (.opow/specs/) and move completed change to .opow/archive/.
---

# Archive Workflow (/archive)

**Purpose**: Finalize a completed change by updating the system's Living Specs and archiving the change artifacts.

## Prerequisites

- `/verify` workflow has completed with **100% test pass rate** and all Acceptance Criteria verified.

## Steps

1. **Locate Change Artifacts**:
   - Open `.opow/changes/<change-id>/`.
   - Read delta specs in `.opow/changes/<change-id>/specs/`.

2. **Merge into Living Specs (`.opow/specs/`)**:
   - For each modified domain, update or create `.opow/specs/<domain>/spec.md`:
     - Apply `ADDED` requirements to the living spec.
     - Update `MODIFIED` requirements in the living spec.
     - Deprecate or remove `REMOVED` requirements from the living spec.

3. **Move to Archive**:
   - Move the entire folder `.opow/changes/<change-id>/` to `.opow/archive/<change-id>/`.

4. **Sign-off**:
   - Inform the user that the change has been successfully integrated into the system's Living Specs.
