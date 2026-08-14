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

**Before entering plan mode:** if you haven't already brainstormed, invoke the brainstorming skill first.

Then announce "Using [skill] to [purpose]" and follow the skill exactly. If it has a checklist, create a todo per item.

## Skill Priority

When multiple skills apply, process skills come first — they set the approach, then implementation skills (frontend-design, etc.) carry it out. Brainstorming and systematic-debugging are Superpowers' most common process skills, but the rule holds for any of them.

- "Let's build X" → superpowers:brainstorming first, then implementation skills.
- "Fix this bug" → superpowers:systematic-debugging first, then domain skills.

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

You are running inside **Cline**. Cline loads skills on-demand and activates them automatically when your request matches a skill's description. To use Superpowers effectively in Cline:

- **Automatic triggering:** Cline sees the list of available skills (name + description) at startup. When a request matches a skill's description, Cline activates it via the `use_skill` tool, which loads the full SKILL.md instructions. Trust this mechanism — it is your primary way to invoke skills.
- **Manual triggering:** You can also invoke a skill explicitly with a slash command in the chat input, e.g. `/brainstorming`, `/test-driven-development`, `/systematic-debugging`. Use this when you want to force a specific skill immediately.
- **Subagents:** Cline provides a `use_subagents` tool (up to 5 in parallel). Skills that dispatch subagents — `subagent-driven-development`, `dispatching-parallel-agents`, `requesting-code-review`, `writing-skills` — rely on this. When a skill says "dispatch a subagent", use `use_subagents` with a focused prompt per subagent.
- **Running scripts:** Skills may reference helper scripts (e.g. `subagent-driven-development`'s `scripts/`). Cline can execute these via `execute_command`.
- **Todo tracking:** When a skill instructs you to create a todo per checklist item, use Cline's task_progress tracking to maintain the checklist.

## User Instructions

User instructions (CLAUDE.md, AGENTS.md, GEMINI.md, etc, direct requests) take precedence over skills, which in turn override default behavior. Only skip skill workflows or instructions when your human partner has explicitly told you to.
