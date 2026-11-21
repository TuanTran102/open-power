---
name: brainstorming
description: "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
---

# Brainstorming Ideas Into Designs

Turn ideas into validated designs/specs through collaborative dialogue before any implementation.

<HARD-GATE>
Do NOT invoke any implementation skill, write code, or scaffold projects until you have presented your intent/design and your human partner has explicitly approved it. Ceremony scales with the task; the approval gate never does.
</HARD-GATE>

## Three Paths (Classify First & Announce)

State your classification out loud before your first question. When in doubt, take the heavier path. Hidden complexity upgrades the path mid-task (never downgrades).

- **Spike** (feasibility question, throwaway code):
  1. Explore minimal context → 2. Present question + probe plan (2–3 sentences) → 3. Get nod → 4. Run cheapest probe → 5. Report recommendation (label code throwaway).
- **Bounded** (well-scoped change to an *existing* flow in this repo):
  1. Explore files/docs/commits → 2. Ask clarifying questions (one at a time) → 3. Present short design in chat (approach, files, tests) → 4. **STOP for explicit yes** → 5. Implement with TDD (no plan doc).
- **Architectural** (new project/subsystem, cross-component or interface changes):
  1. Explore project context → 2. Ask clarifying questions (one at a time) → 3. Propose 2–3 approaches with trade-offs & recommendation (YAGNI) → 4. Present design in sections (architecture, components, data flow, errors, testing), confirming each → 5. Write spec doc → 6. **Spec Self-Review** → 7. **User Review Gate** → 8. Transition ONLY to `writing-plans` (or OpenSpec `/plan`).

## Core Design Principles

- **Decompose large scope first:** If a request spans multiple independent subsystems, help decompose into sub-projects before refining details.
- **One question per message:** Prefer multiple-choice when natural; focus on purpose, constraints, and success criteria.
- **Isolation & clarity:** Break into focused units with clear interfaces; follow existing repo patterns and include only targeted cleanup that serves the goal.
- **Visual Companion (just-in-time only):** Only when a genuinely visual question arises (mockup, layout, architecture diagram), offer it in its own message; if accepted, read `skills/brainstorming/visual-companion.md`. Never offer upfront or for text questions.

## Architectural Exit Gates

1. **Documentation:** Write validated spec to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` (user/OpenSpec `.opow/changes/` paths override this default) and commit if appropriate.
2. **Spec Self-Review (fix inline):**
   - **Placeholders:** No "TBD", "TODO", or incomplete sections.
   - **Consistency:** No contradictions between sections/architecture/requirements.
   - **Scope:** Focused enough for a single implementation plan.
   - **Ambiguity:** Every requirement has one explicit interpretation.
3. **User Review Gate:** Ask user to review the written spec and wait for approval before transitioning to `writing-plans`.

## Red Flags

| Thought | Reality |
|---|---|
| "Too simple for a design / approval" | Artifact scales down (2 sentences in chat); approval gate never skips. |
| "I'll call it bounded to skip the spec" | Doubt means take the heavier path; existing repo flow is required for bounded. |
| "Design is obvious, I'll start while they read" | Present, then STOP and wait for explicit yes. |
| "Spike works, I'll keep the code" / "They approved spike" | Keeping spike code is a new request with its own classification and approval. |
| "Grew mid-task, almost done" | Hidden complexity upgrades the path — stop and announce. |
