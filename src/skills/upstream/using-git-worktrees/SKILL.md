---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback
---

# Using Git Worktrees

**Core principle:** Detect existing isolation first → use native worktree tools → fall back to manual `git worktree` only if no native tool exists. Never fight the harness.

## Step 0: Detect Existing Isolation

Check before creating anything:

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
git rev-parse --show-superproject-working-tree 2>/dev/null  # non-empty = submodule, NOT worktree
```

- **If `GIT_DIR != GIT_COMMON` (and not a submodule):** Already in an isolated worktree. Report path + branch (or detached HEAD) and skip to **Step 2**.
- **If `GIT_DIR == GIT_COMMON` (or in a submodule):** Normal checkout. Honor any declared instruction preference (e.g., `/implement` mandates worktree without asking); otherwise ask consent before creating one.

## Step 1: Create Isolated Workspace

### 1a. Native Worktree Tools (Preferred)
If your harness provides a native tool (`EnterWorktree`, `WorktreeCreate`, `/worktree`, `--worktree`), use it and skip to **Step 2**. Bypassing native tools creates phantom state the harness cannot track.

### 1b. Git Worktree Fallback
Only when no native tool is available:
1. **Directory priority:** Declared instruction preference > existing `.worktrees/` > existing `worktrees/` > default `.worktrees/`.
2. **Safety check (project-local dirs):** MUST verify ignored before creating:
   ```bash
   git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
   ```
   If NOT ignored, add to `.gitignore` and commit before proceeding.
3. **Create & enter:**
   ```bash
   git worktree add "$LOCATION/$BRANCH_NAME" -b "$BRANCH_NAME" && cd "$LOCATION/$BRANCH_NAME"
   ```
   *Sandbox fallback:* If permission is denied by sandbox, tell the user and run setup + baseline tests in place.

## Step 2: Project Setup

Auto-detect and install/build dependencies if needed:
- `package.json` → `npm install`
- `Cargo.toml` → `cargo build`
- `requirements.txt` → `pip install -r requirements.txt` / `pyproject.toml` → `poetry install`
- `go.mod` → `go mod download`

## Step 3: Verify Clean Baseline

Run the project's test suite (`npm test` / `cargo test` / `pytest` / `go test ./...`).
- **If tests fail:** Report failures and ask whether to proceed or investigate.
- **If tests pass:** Report `Worktree ready at <full-path> | Tests passing (<N> tests, 0 failures) | Ready to implement <feature-name>`.

## Red Flags

- Skipping Step 0 detection (submodules and harness-managed worktrees fool eyeballing).
- Using `git worktree add` when a native worktree tool is available.
- Creating `.worktrees/` without verifying `git check-ignore -q` (commits whole worktree into repo).
- Skipping baseline tests (makes later failures ambiguous).
