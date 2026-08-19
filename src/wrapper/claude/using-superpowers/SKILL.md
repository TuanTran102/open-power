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
1. If brainstorming or designing a feature/API: invoke `brainstorming` and `spec-driven-development` to create/update the OpenSpec in `.opow/specs/`.
2. Ensure Acceptance Criteria (*Given - When - Then*) are defined.
3. Then invoke `writing-plans` (saving plan to `.opow/plans/`) and `test-driven-development`.

Then announce "Using [skill] to [purpose]" and follow the skill exactly. If it has a checklist, create a todo per item.

## Skill Priority

When multiple skills apply, process and specification skills come first — they set the approach, then implementation skills carry it out.

- "Let's build X" → `brainstorming` + `spec-driven-development` (create OpenSpec in `.opow/specs/`) → `writing-plans` (plan in `.opow/plans/`) → `test-driven-development`.
- "Fix this bug" → `systematic-debugging` (root cause analysis) → domain skills → verification.
- "Wrap up feature" → `verification-before-completion` (verify 100% OpenSpec Acceptance Criteria).

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

## Platform Adaptation: Claude Code

You are running inside **Claude Code** (Anthropic CLI). To use Superpowers and OpenSpec effectively in Claude Code:

- **Skills Discovery:** Claude Code accesses project skills in `.claude/skills/`. When a skill is relevant, view its `SKILL.md` file using your file viewing tool before proceeding.
- **Commands & Slash Workflows:** Slash commands and workflows are stored in `.claude/commands/` (`/spec`, `/plan`, `/implement`, `/verify`). You can reference or execute these workflow instructions when prompted.
- **OpenSpec & Workflows:** Specifications and plans reside in `.opow/` (`.opow/specs/` and `.opow/plans/`). Refer to the `spec-driven-development` skill for the unified 5-phase lifecycle.
- **Subagents & Tool Execution:** For skills requiring subagent execution — `subagent-driven-development`, `dispatching-parallel-agents`, `requesting-code-review` — formulate clear, focused task boundaries for any delegated workers with their specific OpenSpec slice.
- **Verification:** Run test commands and verify 100% of Acceptance Criteria before reporting completion.

## User Instructions

User instructions (`CLAUDE.md`, `.claude.json`, direct requests) take precedence over skills, which in turn override default behavior. Only skip skill workflows or instructions when your human partner has explicitly told you to.
