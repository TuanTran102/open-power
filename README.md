# open-power (`opow`)

CLI to install and auto-update **Superpowers skills** and **OpenSpec standards** for **Cline**, **Antigravity**, **Claude Code**, and **Codex** (project-level).

`open-power` unifies the requirements rigor of **OpenSpec** (Spec-Driven Development & Living Specs) with the execution discipline of **Superpowers** (Brainstorming, Codebase Auditing, TDD, Subagents, Systematic Debugging, Verification) into a single, seamless developer tool.

---

## What is Open-Power?

| Layer | Component | Focus |
|---|---|---|
| **WHAT (Requirements & Living Specs)** | **OpenSpec** | Living Specs (`.opow/specs/`), Active Change Proposals (`.opow/changes/`), Delta Specs (`ADDED`, `MODIFIED`, `REMOVED`), and History Archive (`.opow/archive/`) |
| **HOW (Execution Discipline)** | **Superpowers** | Engineering discipline: Brainstorming → Codebase Audit (`openspec-explore`) → Atomic TDD Plans (`.opow/plans/`) → Red-Green-Refactor → Verification |

---

## Features

- **Living Spec & Change Workspace (`.opow/`)**:
  - `.opow/specs/<domain>/spec.md`: Living specifications representing current system behavior & changelog history.
  - `.opow/changes/YYYYMMDDHHmmss-<slug>/`: Active in-flight changes (`proposal.md`, `design.md`, `tasks.md`, delta `specs/` with YAML frontmatter).
  - `.opow/archive/YYYYMMDDHHmmss-<slug>/`: Audit history of completed changes.
  - `.opow/templates/`: Reusable templates (`proposal.md`, `design.md`, `tasks.md`, `delta.spec.md`, `living.spec.md`) with standardized YAML frontmatter.
  - `.opow/plans/YYYYMMDDHHmmss-<slug>.plan.md`: Actionable atomic TDD implementation plans.
- **Multi-Platform Agent Integration**:
  - **Antigravity**: `<project>/.agent/skills/` + workflows at `<project>/.agent/workflows/` + manifest at `<project>/.agent/superpowers-manifest.json`
  - **Cline**: `<project>/.cline/skills/` + workflows at `<project>/.clinerules/workflows/` + manifest at `<project>/.cline/superpowers-manifest.json`
  - **Claude Code**: `<project>/.claude/skills/` + commands at `<project>/.claude/commands/` + manifest at `<project>/.claude/superpowers-manifest.json`
  - **Codex**: `<project>/.codex/skills/` + workflows at `<project>/.codex/workflows/` + manifest at `<project>/.codex/superpowers-manifest.json`
- **Tailored Platform Wrappers (`using-superpowers`)**:
  - **Antigravity**: Progressive Disclosure (`view_file`), rules (`AGENTS.md` / `GEMINI.md`), and subagents.
  - **Cline**: `use_skill`, `use_subagents`, and slash commands.
  - **Claude Code**: Anthropic CLI file viewing, slash commands (`.claude/commands/`), and delegated worker tasks.
  - **Codex**: OpenAI agent workflows, slash commands (`.codex/workflows/`), and hierarchical instructions (`AGENTS.md` / `CODEX.md`).
- **Dedicated Skills**:
  - `openspec-explore`: Technical thinking partner for auditing codebase, checking dependencies, and preparing Delta Spec inputs.
  - `openspec-sync`: Audits codebase modifications or Git diff to detect spec drift and reverse-sync changes into OpenSpec.
  - `spec-driven-development`: Guides drafting delta specs, managing the Propose ➔ Apply ➔ Archive lifecycle, and designing UI mockups via Pencil (pen.dev) MCP.
- **Automatic .gitignore & Conciseness Rules**:
  - Automatically provisions `.gitignore` entries for `.opow/`, `.worktrees/`, and all AI agent directories.
  - Configures concise response rules (`be brief`) for Antigravity (`.agent/rules/brief.md`), Cline (`.clinerules`), Claude Code (`CLAUDE.md`), and Codex (`AGENTS.md`) without overwriting existing guidelines.
- **Offline & Deterministic (Vendored Bundled Skills)**:
  - 100% offline installation & updates directly from bundled skills package (`src/skills/upstream/` and `src/skills/openspec/`).
  - Zero runtime network calls, git cache dependencies, or transient upstream breakage.
- **Maintainer Upstream Synchronization**:
  - Maintainers can synchronize with upstream Superpowers repo on demand via `npm run sync:upstream`.
- **Safe Sync & Updates**: Uses manifests to only touch managed files, leaving custom skills and specs intact.

---

## Installation

### Option 1: Global install from local directory (Recommended)

```bash
# Run from this repository directory
npm install -g .
```

### Option 2: Using `npm link`

```bash
# Run from this repository directory (useful for development)
npm link
```

### Option 3: Run directly with Node or npx

```bash
# Run directly with Node
node bin/cli.js <command>

# Or via npx
npx . <command>
```

---

## Usage

Navigate to your project directory:

```bash
cd /path/to/my-project

# Install OpenSpec templates & skills for default targets (Cline & Antigravity)
opow install

# Install for all 4 platforms simultaneously
opow install all

# Install only for Claude Code (.claude/skills, .claude/commands)
opow install claude
# or:
opow install cc

# Install only for Codex (.codex/skills, .codex/workflows)
opow install codex
# or:
opow install cdx

# Install only for Antigravity (.agent/skills, .agent/workflows)
opow install antigravity
# or:
opow install agy

# Install only for Cline (.cline/skills, .clinerules/workflows)
opow install cline

# Check installation and upstream status across all targets
opow status all

# Update skills and OpenSpec templates in the current project
opow update

# Uninstall skills from a specific target
opow uninstall claude
opow uninstall codex
opow uninstall antigravity
opow uninstall cline

# Uninstall all skills and purge the entire .opow/ workspace
opow uninstall --all
# or:
opow uninstall -a
```

---

## How to Use with Your AI Agent (Slash Commands & Workflows)

`opow install` registers native **Slash Commands** across all platforms (`.agent/workflows/` for Antigravity, `.clinerules/workflows/` for Cline, `.claude/commands/` for Claude Code, `.codex/workflows/` for Codex). You can trigger each phase simply by typing `/` in the chat!

### Slash Commands & Workflows

```
/spec ──▶ /plan ──▶ /implement ──▶ /archive
  │                                    │
  └──────────── /sync-spec ────────────┘

(Optional standalone spike/probe: /explore)
```

| Slash Command | Purpose | Underlying Skills |
|---|---|---|
| **`/spec [name]`** | Selectively load `.opow/specs/<domain>/spec.md`, audit codebase (`openspec-explore`), brainstorm, and create `.opow/changes/<name>/` (`proposal`, `design`, `tasks`, delta `specs/`) | `brainstorming`, `openspec-explore`, `spec-driven-development` |
| **`/plan [name]`** | Transform change proposal into atomic TDD implementation plan in `.opow/plans/<name>.plan.md` | `writing-plans` |
| **`/implement`** | Set up isolated workspace (`.worktrees/<name>`), execute tasks with strict TDD & Subagents, and verify 100% of Delta Acceptance Criteria & tests | `using-git-worktrees`, `test-driven-development`, `subagent-driven-development`, `verification-before-completion` |
| **`/archive`** | Merge delta specs & sync `Key Files / Code Map` into Living Specs (`.opow/specs/`), merge code into main, clean up worktree, and move change + plan to `.opow/archive/` | `spec-driven-development` |
| **`/explore`** *(Optional)* | Standalone fast spike to audit codebase, dependencies, and evaluate feasibility without scaffolding files | `openspec-explore` |
| **`/sync-spec`** | Audit code drift or Git diff and reverse-sync into OpenSpec living specs or proposals | `openspec-sync` |


---

### Step-by-Step Example

1. **Explore & Author Change Proposal**: Type `/spec user-auth`
   > Agent selectively reads `.opow/specs/<domain>/spec.md` (baseline capabilities & `Key Files / Code Map`), investigates existing auth flows/schemas (`openspec-explore`), brainstorms requirements, and drafts `proposal.md`, `design.md`, `tasks.md`, and delta specs (`specs/auth.spec.md`) with `ADDED` / `MODIFIED` / `REMOVED` criteria in `.opow/changes/user-auth/`.

2. **Generate the Plan**: Type `/plan user-auth`
   > Agent breaks the spec into atomic tasks linked to each Acceptance Criterion and saves to `.opow/plans/user-auth.plan.md`.

3. **Develop & Verify in Isolated Worktree with TDD**: Type `/implement`
   > Agent creates an isolated Git Worktree (`.worktrees/user-auth` on branch `feat/user-auth`) via `using-git-worktrees`, authors failing tests (Red), writes minimal code to pass (Green), refactors, ticks off `tasks.md`, then runs the full test suite and verifies 100% of Acceptance Criteria in `.opow/changes/user-auth/specs/` via `verification-before-completion` (keeping the worktree intact for review).

4. **Archive, Merge & Clean Up**: Type `/archive`
   > Agent merges delta specs and syncs `Key Files / Code Map` from `design.md` into `.opow/specs/auth/spec.md` (Living Specs), merges `feat/user-auth` into `main`, removes `.worktrees/user-auth`, and moves the change folder and plan to `.opow/archive/user-auth/`.


---

## Project Structure

```
<project>/
├── .opow/                                # Open-Power specifications & plans
│   ├── specs/                            # Living Specs (Source of Truth by domain)
│   │   └── auth/spec.md
│   ├── changes/                          # Active change proposals (YYYYMMDDHHmmss-<slug>)
│   │   └── 20260901143000-user-auth/
│   │       ├── proposal.md
│   │       ├── design.md
│   │       ├── tasks.md
│   │       └── specs/
│   │           └── auth.spec.md          # Delta spec (ADDED / MODIFIED / REMOVED)
│   ├── archive/                          # Completed history archive (YYYYMMDDHHmmss-<slug>)
│   ├── templates/                        # Reusable OpenSpec templates with YAML frontmatter
│   └── plans/                            # Implementation plans (YYYYMMDDHHmmss-<slug>.plan.md)
├── .claude/                              # Claude Code target (.claude/skills/, .claude/commands/)
├── .codex/                               # Codex target (.codex/skills/, .codex/workflows/)
├── .agent/                               # Antigravity target (.agent/skills/, .agent/workflows/)
└── .cline/                               # Cline target (.cline/skills/, .clinerules/workflows/)
```

---

## Commands & Options

| Command | Description |
|---|---|
| `install [target]` | Initialize OpenSpec workspace and install bundled skills into current project |
| `update [target]` | Re-sync skills & OpenSpec templates from the bundled package |
| `status [target]` | Show bundled commit, OpenSpec workspace status, and installed skills |
| `uninstall [target]` | Safely remove installed skills from current project (auto-cleans pristine `.opow/` or preserves user specs) |
| `help` | Show usage and help information |

**Targets**: `cline`, `antigravity` (or `agy`), `claude` (or `cc`), `codex` (or `cdx`), `all`.

**Options**:
- `-t, --target <name>`: Specify target platform (`cline`, `antigravity`, `agy`, `claude`, `cc`, `codex`, `cdx`, `all`).
- `-a, --all`: Purge all skills and remove the entire `.opow/` workspace directory.
- `-h, --help`: Show help text.

---

## Maintainer Workflow

### Updating Upstream Skills

To pull the latest upstream skills from `obra/superpowers` into the `open-power` package repository:

```bash
# Pull new upstream changes and update src/skills/upstream/ & vendor-meta.json
npm run sync:upstream

# Run the test suite to verify compatibility
npm test
```

### Benchmarking Flow Changes (`npm run bench`)

Zero-dependency hybrid harness in `scripts/benchmark.js` to evaluate workflow/skill changes on both static prompt budget and real runtime session logs:

#### 1. Commands

```bash
# Diff uncommitted worktree changes against HEAD (~est. tokens across src/) (default)
npm run bench -- static

# Diff static prompt tokens between two specific git commits/refs
npm run bench -- static --base HEAD~1 --head HEAD

# Print the current worktree static snapshot (no diff) as Markdown tables
npm run bench -- static --no-diff --md

# Parse real session JSONL log (auto-detects Antigravity, Claude Code, Codex)
npm run bench -- session <path/to/log.jsonl> [--format agy|claude|codex] [--md|--json]

# A/B comparison across multiple runs (aggregates by median)
npm run bench -- compare \
  --label-a Old --a runA1.jsonl,runA2.jsonl,runA3.jsonl --pass-a 2/3 \
  --label-b New --b runB1.jsonl,runB2.jsonl,runB3.jsonl --pass-b 3/3 \
  --md
```

#### 2. Default Session Log Locations

- **Antigravity**: `~/.gemini/antigravity/brain/<conversation-id>/.system_generated/logs/transcript.jsonl`
- **Claude Code**: `~/.claude/projects/<project-slug>/<session-id>.jsonl`
- **Codex**: `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`

#### 3. Interpreting Results

| Metric | Meaning | Better When |
|---|---|---|
| `~est. tokens` (static) | Heuristic static prompt size per category and per flow (`/explore`, `/spec`, `/plan`, `/implement`, `/archive`, `/sync-spec`) | Small or justified by runtime savings |
| `Uncached Input` | Fresh non-cached input tokens billed/processed | **Lower** |
| `Cache Hit %` | Prompt cache reuse (`cache_read / total_input`) | **Higher** |
| `Output` | Tokens generated by the model | **Lower** or unchanged |
| `LLM Steps` | Model invocation turns | **Lower** |
| `User Turns` | Human follow-up prompts / corrections (friction) | **Lower** |
| `reads + searches` | File reads and repo search calls (measures Context Manifest / Code Map efficiency) | **Lower** |
| `Tokens / Passing Task` | Total tokens divided by passing runs (`--pass-a` / `--pass-b`) | **Lower** |

- **Verdict**: `BETTER` (key axes improved, none regressed), `WORSE` (only regressions), `MIXED` (trade-offs across axes, e.g. cheaper tokens but lower pass rate), or `NEUTRAL` (changes within noise thresholds).
- **Warnings**: Automatically flagged when `uncached_input` rises `>10%`, `reads + searches` rises `>20%`, `user_turns` increases, or `pass_rate_pct` drops.

---

## License

MIT