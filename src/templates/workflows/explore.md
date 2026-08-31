---
description: Investigate the codebase, evaluate technical feasibility, and map dependencies before proposing changes.
---

# Explore Workflow (/explore)

**Purpose**: Act as a technical thinking partner to audit the codebase and prepare for change proposals.

## Steps

1. **Invoke Skill**:
   - Activate `openspec-explore`.

2. **Investigate Codebase**:
   - Trace existing control flows, schemas, and API contracts.
   - Identify which files/services will be affected by the requested feature.
   - Check for potential breaking changes or technical constraints.

3. **Formulate Findings**:
   - Present a concise summary of affected modules and proposed delta requirements.
   - Confirm feasibility with the user.

4. **Handoff**:
   - Transition directly to `/spec` to author the formal change package.
