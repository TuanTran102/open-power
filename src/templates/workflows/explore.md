---
description: Optional lightweight investigation to audit codebase, evaluate technical feasibility, and run spikes before creating a spec.
---

# Explore Workflow (/explore)

**Purpose**: Act as an optional technical thinking partner to audit the codebase, run quick spikes, or evaluate feasibility without scaffolding a change proposal.

## Steps

1. **Invoke Skill**:
   - Activate `openspec-explore`.

2. **Investigate Codebase & Run Spikes**:
   - Trace existing control flows, schemas, and API contracts.
   - Identify which files/services would be affected by the requested feature.
   - Check for potential breaking changes or technical constraints.
   - Conduct lightweight spikes/probes if feasibility is uncertain.

3. **Formulate Findings**:
   - Present a concise summary of affected modules, feasibility findings, and recommendations.
   - Confirm feasibility with the user.

4. **Handoff**:
   - When ready to formally scaffold a change proposal, transition to `/spec`.
