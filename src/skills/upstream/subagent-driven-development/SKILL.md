---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
---

# Subagent-Driven Development

Execute a plan by dispatching a fresh implementer subagent per task, running a task review (spec compliance + code quality) after each, and running a final whole-branch review.

**Core principle:** Fresh subagent per task + per-task review + broad final review. Subagents receive only what they need — never your session history.
**Narration:** At most one short line between tool calls; the ledger and tool results carry the record.
**Continuous execution:** Do not pause to check in between tasks. Execute all tasks until complete or blocked by one of the four stop conditions.

## Rulings, Not Stalls

Resolve conflicts, ambiguities, and plan defects yourself using the **spec** as binding authority and the **plan** as its argument. Record every decision in the ledger:
`Ruling: <what you decided> — <why> — <what it costs if wrong>`

**Only 4 stop conditions:**
1. Irreversible or destructive operation
2. Security-sensitive action
3. External side effect (merge, push to shared branch, publish)
4. Plan so broken that every path forward is a guess

## Setup

1. **Isolated workspace:** Use `using-git-worktrees` to verify/create a worktree. Never implement on `main`/`master` without explicit consent.
2. **Plan workspace & ledger:** Run `scripts/sdd-workspace PLAN_FILE` (prints `<repo-root>/.superpowers/sdd/<plan-basename>/`). Never read or write another plan's directory.
   - Check `<workspace>/progress.md`. If its first line matches `# SDD ledger — plan: <plan file path>`, skip tasks marked `Task <N>: complete` and resume at the next task (or next fix round). Otherwise create a fresh ledger with that header.
   - After compaction, trust the ledger and `git log` over recollection.
3. **Read plan & spec once:** Create a todo per task. Read the referenced spec (if any); rulings without a reachable spec are provisional.
4. **Pre-flight conflict scan:** Check every pair of tasks sharing a file/interface and every task's internal consistency (specified tests vs code, created vs touched files). Write a scan table to `<workspace>/progress.md`, rule on any conflicts against the spec, and proceed.

## Model Selection

Always specify the model explicitly (omitting it inherits your session's expensive model).
- **Cheap tier:** 1–2 file mechanical tasks, verbatim code transcription from plan, single-file mechanical fixes.
- **Standard/mid tier (floor for reviewers & prose implementers):** Multi-file integration, debugging, prose-based implementation, scoped re-reviews.
- **Most capable tier:** Architecture/design judgment, broad codebase understanding, **final whole-branch review** (never session default).
- **Escalation:** Rounds 4–5 of a fix loop escalate at least +1 tier above the stuck implementer.

## The Task Loop

**Batch small same-shape edits:** Group identical trivial edits across files into one dispatch brief and review as one unit.
**No inline history:** Hand artifacts as files, never paste prior-task summaries into prompts.
**No worker-spawned subagents:** Implementers never dispatch helpers or reviewers.
**No parallel implementers:** Dispatch implementation subagents sequentially to avoid conflicts.
**Waiting:** Keep doing local bookkeeping while children run; when idle, wait in bounded 5–10m stretches and reconcile any silent children.

### 1. Dispatch Implementer
Record `BASE=$(git rev-parse HEAD)`. Run `scripts/task-brief PLAN_FILE N` to extract the task brief file.
Dispatch with: (1) one-line project context, (2) brief path ("read this first — exact values verbatim"), (3) cross-task interfaces/rulings/parked ledger pointers, (4) ambiguity resolutions, (5) report path (`…/task-N-report.md` — short return contract: status, commits, 1-line test summary, concerns). Never let subagents read the whole plan.
Template: [implementer-prompt.md](implementer-prompt.md)

### 2. Handle Report
- **DONE:** Generate review package (`scripts/review-package PLAN_FILE BASE HEAD` — never `HEAD~1`), then dispatch task reviewer.
- **DONE_WITH_CONCERNS:** Read concerns; resolve correctness/scope issues before review, or note observations and proceed.
- **NEEDS_CONTEXT:** Supply missing context and re-dispatch.
- **BLOCKED:** Fix context, escalate model tier, split task, or rule on plan error and re-dispatch. Never retry unchanged.

### 3. Review Task
Both **spec compliance ✅** and **task quality approved** are required (self-review never replaces task review).
- Pass the reviewer 3 paths: brief file, report file, and `review-package` output file, plus verbatim Global Constraints from the spec/plan.
- Do not ask reviewers to re-run tests already evidenced in the report, do not add open-ended "check all uses" directives, and **never pre-judge findings** ("do not flag X").
- Resolve any `⚠️ Cannot verify from diff` items yourself; if a real gap, enter the fix loop.
Template: [task-reviewer-prompt.md](task-reviewer-prompt.md)

### 4. Fix Loop (Max 5 Rounds)
Triggers on spec ❌, Critical/Important findings, or confirmed `⚠️` gaps.
- **Minor findings:** Log `Task <N>: minor (deferred): <one-liner>` in ledger for final review triage; never enter the loop.
- **Plan-mandated conflicts:** Weigh against spec, ledger the ruling, then act.
- **Rounds 1–3:** Resume original implementer (or fresh with brief + report path if harness cannot resume) with verbatim findings.
- **Rounds 4–5:** Fresh implementer on a more capable model (`"A prior implementer attempted this task N times; you own it now. Read the report file."`).
- Verify fix report lists covering test files, command, and output, then run `scripts/review-package PLAN_FILE FIX_BASE HEAD` and dispatch [re-review-prompt.md](re-review-prompt.md).
- Log each round: `Task <N>: fix round <R>/5 (<X> addressed, <Y> open — <one-liners>; commits <a7>..<b7>)`. Never fix findings directly in the controller session.
- **Round 5 Breaker:** Stop dispatching and adjudicate each open finding:
  - Contestable / non-load-bearing → `Task <N>: parked — <finding> — Ruling: <reason>`
  - Real & load-bearing → `Task <N>: Ruling: <finding> — <decision & why>` (carry into next task; stop only if every path is a guess).

### 5. Complete Task
Append `Task <N>: complete (commits <base7>..<head7>, review clean | <K> parked)` to `<workspace>/progress.md` and mark todo complete.

## Final Review & Finish

1. Run `scripts/review-package PLAN_FILE MERGE_BASE HEAD` (`MERGE_BASE = git merge-base main HEAD`).
2. Dispatch [code-reviewer.md](../requesting-code-review/code-reviewer.md) on the **most capable model**, pointing it at the package + ledger deferred-minor/parked lines.
3. If findings remain: dispatch **ONE** fix subagent for all findings, then **ONE** scoped re-review ([re-review-prompt.md](re-review-prompt.md)). Adjudicate any residuals.
4. Collect all `Ruling:` lines from the ledger into your final message under **"Rulings I made"** with cost-if-wrong, then delete `<workspace>` (`rm -rf <workspace>`).

### Handoff and Lifecycle
- **OpenSpec / OpenPower Workflows:** If executing a plan in `.opow/plans/` or `.opow/changes/`, do NOT remove the git worktree or merge/delete the feature branch. Keep the worktree intact and run `verification-before-completion` before `/archive`.
- **Standalone Plans:** Outside OpenSpec, use `superpowers:finishing-a-development-branch`.

## Red Flags — STOP

| Rationalization | Reality |
|---|---|
| "Close enough on spec compliance" | Fix or adjudicate at Round 5 cap — no silent exits. |
| "I'll fix it myself" | Controller fixes pollute context and skip review. |
| "One more round past cap / skip re-review" | Past cap is structural; unreviewed fixes land regressions. |
| "Skip ledger / obviously wrong finding" | Ledger survives compaction; silent discards are forbidden. |
| "Implementer spawned its own reviewer" | Duplicate seat; task review is the gate. |
