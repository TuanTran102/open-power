---
name: using-superpowers
description: Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, ignore this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## The Rule

**Invoke relevant or requested skills BEFORE any response or action** — including clarifying questions, exploring the codebase, or checking files. If it turns out wrong for the situation, you don't have to use it.

**Before entering plan mode or writing code:**
1. If exploring ideas or auditing the codebase: invoke `brainstorming` and `openspec-explore`.
2. If designing a feature/API: invoke `spec-driven-development` to create/update the change proposal in `.opow/changes/YYYY-MM-DD-<slug>/`.
3. Ensure Acceptance Criteria (*Given - When - Then*) and Delta Specs are defined.
4. Then invoke `writing-plans` (saving plan to `.opow/plans/YYYY-MM-DD-<slug>.plan.md`) and `test-driven-development`.

Then announce "Using [skill] to [purpose]" and follow the skill exactly. If it has a checklist, create a todo per item.

## Skill Priority

When multiple skills apply, process and specification skills come first — they set the approach, then implementation skills (frontend-design, etc.) carry it out.

- "Let's explore/build X" → `brainstorming` + `openspec-explore` → `spec-driven-development` (create proposal in `.opow/changes/YYYY-MM-DD-<slug>/`) → `writing-plans` (plan in `.opow/plans/`) → `test-driven-development`.
- "Fix this bug" → `systematic-debugging` (root cause analysis) → domain skills → verification.
- "Wrap up feature" → `verification-before-completion` (verify 100% Delta Acceptance Criteria) → `/archive` (merge into `.opow/specs/`).

## Red Flags

These thoughts mean STOP—you're rationalizing:

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "I can check git/files quickly" | Files lack conversation context. Check for skills. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read current version. |
| "This doesn't count as a task" | Action = task. Check for skills. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "This feels productive" | Undisciplined action wastes time. Skills prevent this. |
| "I know what that means" | Knowing the concept ≠ using the skill. Invoke it. |

## Platform Adaptation: Cline

You are running inside **Cline**. Cline loads skills on-demand and activates them automatically when your request matches a skill's description. To use Superpowers and OpenSpec effectively in Cline:

- **Automatic triggering:** Cline sees the list of available skills at startup. When a request matches a skill's description, Cline activates it via the `use_skill` tool, which loads the full SKILL.md instructions. Trust this mechanism — it is your primary way to invoke skills.
- **OpenSpec & Workflows:** Specifications and plans reside in `.opow/` (`.opow/specs/`, `.opow/changes/`, `.opow/archive/`, and `.opow/plans/`). Refer to the `spec-driven-development` skill for the unified 5-step lifecycle.
- **Subagents:** Cline provides a `use_subagents` tool (up to 5 in parallel). Skills that dispatch subagents — `subagent-driven-development`, `dispatching-parallel-agents`, `requesting-code-review` — rely on this. Pass focused prompts with their specific OpenSpec slice.
- **Running scripts:** Skills may reference helper scripts. Cline executes these via `execute_command`.
- **Todo tracking & Verification:** Use Cline's task_progress tracking to check off all OpenSpec Acceptance Criteria before finishing.

## User Instructions

User instructions (CLAUDE.md, AGENTS.md, GEMINI.md, direct requests) take precedence over skills, which in turn override default behavior. Only skip skill workflows or instructions when your human partner has explicitly told you to.
