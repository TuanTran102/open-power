# open-power (`opow`)

CLI to install and auto-update **Superpowers skills** and **OpenSpec standards** for **Cline**, **Antigravity**, **Claude Code**, and **Codex** (project-level).

`open-power` unifies the requirements rigor of **OpenSpec** (Spec-Driven Development & Living Specs) with the execution discipline of **Superpowers** (Brainstorming, Codebase Auditing, TDD, Subagents, Systematic Debugging, Verification) into a single, seamless developer tool.

---

## What is Open-Power?

| Layer | Component | Focus |
|---|---|---|
| **WHAT (Requirements & Living Specs)** | **OpenSpec** | Living Specs (`.opow/specs/`), Active Change Proposals (`.opow/changes/`), Delta Specs (`ADDED`, `MODIFIED`, `REMOVED`), and History Archive (`.opow/archive/`) |
| **HOW (Execution Discipline)** | **Superpowers** | Engineering discipline: Brainstorming → Codebase Audit (`openspec-explore`) → Atomic TDD Plans (`tasks.md`) → Red-Green-Refactor → Verification |

---

## Features

- **Living Spec & Change Workspace (`.opow/`)**:
  - `.opow/specs/<domain>/spec.md`: Living specifications representing current system behavior & changelog history.
  - `.opow/changes/YYYYMMDDHHmmss-<slug>/`: Active in-flight changes (`proposal.md`, `design.md`, `tasks.md` enriched in-place as atomic TDD plan, delta `specs/` with YAML frontmatter).
  - `.opow/archive/YYYYMMDDHHmmss-<slug>/`: Audit history of completed changes.
  - `.opow/templates/`: Reusable templates (`proposal.md`, `design.md`, `tasks.md`, `delta.spec.md`, `living.spec.md`) with standardized YAML frontmatter.
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
/opow-spec ──▶ /opow-plan ──▶ /opow-implement ──▶ /opow-archive
  │                                                   │
  └─────────────────── /opow-sync-spec ───────────────┘

(Optional standalone spike/probe: /opow-explore | Fast-track bugfix <3 files: /opow-fast)
```

| Slash Command | Purpose | Underlying Skills |
|---|---|---|
| **`/opow-spec [name]`** | Selectively load `.opow/specs/<domain>/spec.md`, audit codebase (`opow-openspec-explore`), brainstorm, and create `.opow/changes/<name>/` (`proposal`, `design`, `tasks`, delta `specs/`) | `opow-brainstorming`, `opow-openspec-explore`, `opow-spec-driven-development` |
| **`/opow-plan [name]`** | Enrich `.opow/changes/<name>/tasks.md` in-place into an atomic TDD implementation plan | `opow-writing-plans` |
| **`/opow-implement`** | Set up isolated workspace (`.worktrees/<name>`), execute tasks with strict TDD & Subagents, and verify 100% of Delta Acceptance Criteria & tests | `opow-using-git-worktrees`, `opow-test-driven-development`, `opow-subagent-driven-development`, `opow-verification-before-completion` |
| **`/opow-archive`** | Merge delta specs & sync `Key Files / Code Map` into Living Specs (`.opow/specs/`), merge code into main, clean up worktree, and move change folder (with `tasks.md`) to `.opow/archive/` | `opow-spec-driven-development` |
| **`/opow-fast`** *(Fast-Track)* | Fast-track bugfixes and small changes (<3 source files) using systematic debugging, TDD, and minimal delta tracking without `proposal.md`/`design.md` | `opow-systematic-debugging`, `opow-test-driven-development`, `opow-verification-before-completion` |
| **`/opow-explore`** *(Optional)* | Standalone fast spike to audit codebase, dependencies, and evaluate feasibility without scaffolding files | `opow-openspec-explore` |
| **`/opow-sync-spec`** | Audit code drift or Git diff and reverse-sync into OpenSpec living specs or proposals | `opow-openspec-sync` |

*(All installed skills and workflow slash commands are prefixed with `opow-` to prevent collisions with skills/commands from other workflows.)*


---

### Step-by-Step Example

1. **Explore & Author Change Proposal**: Type `/opow-spec user-auth`
   > Agent selectively reads `.opow/specs/<domain>/spec.md` (baseline capabilities & `Key Files / Code Map`), investigates existing auth flows/schemas (`opow-openspec-explore`), brainstorms requirements, and drafts `proposal.md`, `design.md`, `tasks.md`, and delta specs (`specs/auth.spec.md`) with `ADDED` / `MODIFIED` / `REMOVED` criteria in `.opow/changes/user-auth/`.

2. **Generate the Plan**: Type `/opow-plan user-auth`
   > Agent enriches `.opow/changes/user-auth/tasks.md` in-place into atomic TDD steps linked to each Acceptance Criterion.

3. **Develop & Verify in Isolated Worktree with TDD**: Type `/opow-implement`
   > Agent creates an isolated Git Worktree (`.worktrees/user-auth` on branch `feat/user-auth`) via `opow-using-git-worktrees`, authors failing tests (Red), writes minimal code to pass (Green), refactors, ticks off `tasks.md`, then runs the full test suite and verifies 100% of Acceptance Criteria in `.opow/changes/user-auth/specs/` via `opow-verification-before-completion` (keeping the worktree intact for review).

4. **Archive, Merge & Clean Up**: Type `/opow-archive`
   > Agent merges delta specs and syncs `Key Files / Code Map` from `design.md` into `.opow/specs/auth/spec.md` (Living Specs), merges `feat/user-auth` into `main`, removes `.worktrees/user-auth`, and moves the change folder (including `tasks.md`) to `.opow/archive/user-auth/`.


---

## Project Structure

```
<project>/
├── .opow/                                # Open-Power specifications & changes
│   ├── specs/                            # Living Specs (Source of Truth by domain)
│   │   └── auth/spec.md
│   ├── changes/                          # Active change proposals (YYYYMMDDHHmmss-<slug>)
│   │   └── 20260901143000-user-auth/
│   │       ├── proposal.md
│   │       ├── design.md
│   │       ├── tasks.md                  # Checklist & atomic TDD plan (enriched by /opow-plan)
│   │       └── specs/
│   │           └── auth.spec.md          # Delta spec (ADDED / MODIFIED / REMOVED)
│   ├── archive/                          # Completed history archive (YYYYMMDDHHmmss-<slug>)
│   └── templates/                        # Reusable OpenSpec templates with YAML frontmatter
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

### Benchmarking Flow Changes (`/bench` & `npm run bench`)

Automated A/B benchmark harness to compare `HEAD` vs uncommitted `WORKTREE` changes (or a target project using `--project <path> --prompt "<text>"`):

1. **One-command AI benchmark**: Run `/bench` (after `npm run bench:link`) in Antigravity — the agent prepares isolated A/B workspaces, spawns subagents for each job, parses their transcripts, grades outcomes, and renders a fixed-format report.
2. **CLI subcommands** (`scripts/benchmark.js`):
   - `npm run bench -- prepare [--base HEAD] [--head WORKTREE] [--project <path>] [--task <ids|all>] [--prompt "<text>"] [--check "<cmd>"] [--runs N]`
   - `npm run bench -- record --run <dir> --job <id> --conv <conversationId>`
   - `npm run bench -- report --run <dir>`
   - `npm run bench -- clean --run <dir>`
   - `npm run bench:link` — install `bench-ab` skill & `/bench` workflow into `.agent/`

---

## License

MIT