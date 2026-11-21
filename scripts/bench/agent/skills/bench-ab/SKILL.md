---
name: bench-ab
description: Use when user asks to benchmark or A/B test opow skill/workflow changes
---

# A/B Benchmark Orchestrator

Run an isolated A/B benchmark comparing two opow variants (default: `HEAD` vs uncommitted `WORKTREE`, or `--project <path>` with `--prompt`).

## Steps

1. **Prepare workspaces**:
   Run:
   ```bash
   node scripts/benchmark.js prepare <user-args>
   ```
   - If the command fails because `--project` is missing `--prompt`, ask the user for the task prompt and re-run.
   - If it fails for any other reason (e.g., no changes in `bin/`, `src/`, `package.json`), report the error to the user and stop.
   - Parse the JSON stdout `{ runDir, jobs: [{ id, variant, task, run, workspace, prompt }] }`.

2. **Spawn subagents**:
   - Launch jobs via `invoke_subagent` with `TypeName: "self"`, `Role: "Bench <job.id>"`, `Prompt: job.prompt`, up to 6 in parallel.
   - Immediately after each `invoke_subagent` returns a `conversationId`, record it:
     ```bash
     node scripts/benchmark.js record --run <runDir> --job <job.id> --conv <conversationId>
     ```

3. **Wait without interfering**:
   - End your turn to wait for subagents to finish.
   - Do NOT edit files, debug, or help subagents.
   - If a subagent asks a question, reply only with:
     `Make a reasonable assumption and continue without asking.`

4. **Generate and present report**:
   - Once all jobs finish, run:
     ```bash
     node scripts/benchmark.js report --run <runDir>
     ```
   - Paste `report.md` verbatim to the user, followed by at most 5 lines of commentary and clickable file links to `report.md` and `report.json`.

5. **Clean up**:
   - Unless the user passed `--keep`, run:
     ```bash
     node scripts/benchmark.js clean --run <runDir>
     ```
