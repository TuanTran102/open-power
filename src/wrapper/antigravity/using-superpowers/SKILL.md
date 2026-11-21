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
1. If exploring ideas or auditing the codebase: invoke `opow-brainstorming` and `opow-openspec-explore`.
2. If designing a feature/API: invoke `opow-spec-driven-development` to create/update the change proposal in `.opow/changes/YYYYMMDDHHmmss-<slug>/`.
3. Ensure Acceptance Criteria (*Given - When - Then*) and Delta Specs are defined.
4. Then invoke `opow-writing-plans` (enriching `.opow/changes/YYYYMMDDHHmmss-<slug>/tasks.md` in-place) and `opow-test-driven-development`.

Then announce "Using [skill] to [purpose]" and follow the skill exactly. If it has a checklist, create a todo per item.

## Skill Priority

When multiple skills apply, process and specification skills come first — they set the approach, then implementation skills (frontend-design, etc.) carry it out.

- "Let's explore/build X" → `opow-brainstorming` + `opow-openspec-explore` → `opow-spec-driven-development` (create proposal in `.opow/changes/YYYYMMDDHHmmss-<slug>/`) → `opow-writing-plans` (enrich `tasks.md` in-place) → `opow-test-driven-development`.
- "Fix this bug" → `/opow-fast` (`opow-systematic-debugging` → `opow-test-driven-development` → `opow-verification-before-completion`).
- "Wrap up feature" → `opow-verification-before-completion` (verify 100% Delta Acceptance Criteria) → `/opow-archive` (merge into `.opow/specs/`).

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

## Platform Adaptation: Antigravity

You are running inside **Google Antigravity**. Antigravity discovers skills in workspace (`.agent/skills/`) and global roots, presenting their names and descriptions in the system prompt. To use Superpowers and OpenSpec effectively in Antigravity:

- **Skill Activation & Progressive Disclosure:** Antigravity lists available skills in your prompt. When a task or workflow matches a skill, activate it immediately by viewing its `SKILL.md` file using `view_file` (with `IsSkillFile: true` when applicable) before proceeding.
- **OpenSpec & Workflows:** Specifications and plans reside in `.opow/` (`.opow/specs/`, `.opow/changes/`, and `.opow/archive/`). Refer to the `opow-spec-driven-development` skill for the unified 4-step lifecycle.
- **Subagents & Delegation:** Antigravity provides subagent mechanisms. For skills requiring subagent execution — `opow-subagent-driven-development`, `opow-dispatching-parallel-agents`, `opow-requesting-code-review` — formulate clear, focused prompts for each subagent with their specific OpenSpec slice.
- **Rules & Hierarchies:** Hierarchical rules (`AGENTS.md`, `GEMINI.md`, `.agent/rules/*.md`) complement skills. Superpowers process skills guide the execution lifecycle.
- **Execution & Verification:** Execute commands via `run_command` and verify all OpenSpec Acceptance Criteria before marking tasks complete.

## User Instructions

User instructions (GEMINI.md, AGENTS.md, CLAUDE.md, direct requests) take precedence over skills, which in turn override default behavior. Only skip skill workflows or instructions when your human partner has explicitly told you to.
