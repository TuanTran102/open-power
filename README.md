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
  - `.opow/specs/<domain>/spec.md`: Living specifications representing current system behavior (Source of Truth).
  - `.opow/changes/<change-id>/`: Active in-flight changes (`proposal.md`, `design.md`, `tasks.md`, delta `specs/`).
  - `.opow/archive/<change-id>/`: Audit history of completed changes.
  - `.opow/templates/`: Reusable templates (`proposal.md`, `design.md`, `tasks.md`, `delta.spec.md`, `living.spec.md`).
  - `.opow/plans/<change-id>.plan.md`: Actionable atomic TDD implementation plans.
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
  - `spec-driven-development`: Guides drafting delta specs and managing the Propose ➔ Apply ➔ Archive lifecycle.
- **Safe Sync & Updates**: Uses manifests to only touch managed files, leaving custom skills and specs intact.
- **Upstream Cache**: Cached upstream in `~/.open-power/repo` for ultra-fast multi-project setups.

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
```

---

## How to Use with Your AI Agent (Slash Commands & Workflows)

`opow install` registers native **Slash Commands** across all platforms (`.agent/workflows/` for Antigravity, `.clinerules/workflows/` for Cline, `.claude/commands/` for Claude Code, `.codex/workflows/` for Codex). You can trigger each phase simply by typing `/` in the chat!

### 6-Step End-to-End Development Loop

```
/explore ──▶ /spec ──▶ /plan ──▶ /implement ──▶ /verify ──▶ /archive
```

| Slash Command | Purpose | Underlying Skills |
|---|---|---|
| **`/explore`** | Audit codebase, dependencies, and evaluate feasibility before proposing changes | `openspec-explore` |
| **`/spec [name]`** | Interview, brainstorm, and create `.opow/changes/<name>/` (`proposal`, `design`, `tasks`, delta `specs/`) | `brainstorming`, `spec-driven-development` |
| **`/plan [name]`** | Transform change proposal into atomic TDD implementation plan in `.opow/plans/<name>.plan.md` | `writing-plans` |
| **`/implement`** | Execute tasks using strict Test-Driven Development (Red-Green-Refactor) and Subagents | `test-driven-development`, `subagent-driven-development` |
| **`/verify`** | Run test suite and check off 100% of Acceptance Criteria against Delta Specs | `verification-before-completion` |
| **`/archive`** | Merge delta specs into Living Specs (`.opow/specs/`) and move change to `.opow/archive/` | `spec-driven-development` |

---

### Step-by-Step Example

1. **Investigate Codebase**: Type `/explore user-auth`
   > Agent inspects existing authentication routes, databases, and dependencies, and outlines affected areas.

2. **Author the Change Proposal**: Type `/spec user-auth`
   > Agent drafts `proposal.md`, `design.md`, `tasks.md`, and delta specs (`specs/auth.spec.md`) with `ADDED` / `MODIFIED` / `REMOVED` criteria in `.opow/changes/user-auth/`.

3. **Generate the Plan**: Type `/plan user-auth`
   > Agent breaks the spec into atomic tasks linked to each Acceptance Criterion and saves to `.opow/plans/user-auth.plan.md`.

4. **Develop with TDD**: Type `/implement`
   > Agent authors failing tests (Red), writes minimal code to pass (Green), refactors, and ticks off `tasks.md`.

5. **Verify**: Type `/verify`
   > Agent runs the entire test suite and confirms 100% of Acceptance Criteria in `.opow/changes/user-auth/specs/` are fulfilled.

6. **Archive & Update Living Specs**: Type `/archive`
   > Agent merges delta specs into `.opow/specs/auth/spec.md` (Living Specs) and moves the change to `.opow/archive/user-auth/`.

---

## Project Structure

```
<project>/
├── .opow/                                # Open-Power specifications & plans
│   ├── specs/                            # Living Specs (Source of Truth by domain)
│   │   └── auth/spec.md
│   ├── changes/                          # Active change proposals
│   │   └── user-auth/
│   │       ├── proposal.md
│   │       ├── design.md
│   │       ├── tasks.md
│   │       └── specs/
│   │           └── auth.spec.md          # Delta spec (ADDED / MODIFIED / REMOVED)
│   ├── archive/                          # Completed history archive
│   ├── templates/                        # Reusable OpenSpec templates
│   └── plans/                            # Implementation plans
├── .claude/                              # Claude Code target (.claude/skills/, .claude/commands/)
├── .codex/                               # Codex target (.codex/skills/, .codex/workflows/)
├── .agent/                               # Antigravity target (.agent/skills/, .agent/workflows/)
└── .cline/                               # Cline target (.cline/skills/, .clinerules/workflows/)
```

---

## Commands & Options

| Command | Description |
|---|---|
| `install [target]` | Initialize OpenSpec workspace and install skills into current project |
| `update [target]` | Pull latest upstream cache and re-sync skills & OpenSpec templates |
| `status [target]` | Show current commit, update availability, OpenSpec status, and skills |
| `uninstall [target]` | Safely remove installed skills from current project |
| `help` | Show usage and help information |

**Targets**: `cline`, `antigravity` (or `agy`), `claude` (or `cc`), `codex` (or `cdx`), `all`.

**Options**:
- `-t, --target <name>`: Specify target platform (`cline`, `antigravity`, `agy`, `claude`, `cc`, `codex`, `cdx`, `all`).
- `-h, --help`: Show help text.

---

## License

MIT