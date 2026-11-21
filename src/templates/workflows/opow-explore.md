---
description: Optional lightweight investigation to audit codebase, evaluate technical feasibility, and run spikes before creating a spec.
---

# Explore Workflow (/opow-explore)

**Purpose**: Act as an optional technical thinking partner to audit the codebase, run quick spikes, or evaluate feasibility without scaffolding a change proposal.

## Steps

1. **Invoke Skill**:
   - Activate `opow-openspec-explore`.

2. **Investigate Codebase & Run Spikes**:
   - Check `.opow/specs/` first (selective & progressive): list domain folders and open ONLY the relevant `.opow/specs/<domain>/spec.md`. Read the top overview and `Key Files / Code Map` (~80 lines) first; for large specs (>200 lines), grep `### Requirement:` / `### Capability:` or feature keywords and read ONLY matching line ranges rather than loading the entire file upfront.
   - Trace existing control flows, schemas, and API contracts.
   - Identify which files/services would be affected by the requested feature.
   - Check for potential breaking changes or technical constraints.
   - Conduct lightweight spikes/probes if feasibility is uncertain.

3. **Formulate Findings**:
   - Present a concise summary of affected modules, feasibility findings, and recommendations.
   - Confirm feasibility with the user.

4. **Handoff**:
   - When ready to formally scaffold a change proposal, transition to `/opow-spec`.
