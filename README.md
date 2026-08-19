# open-power (`opow`)

CLI to install and auto-update **Superpowers skills** and **OpenSpec standards** for **Cline**, **Antigravity**, **Claude Code**, and **Codex** (project-level).

`open-power` unifies the requirements rigor of **OpenSpec** (Spec-Driven Development) with the execution methodology of **Superpowers** (TDD, Subagents, Systematic Debugging, Verification) into a single, seamless developer tool.

---

## What is Open-Power?

| Layer | Component | Focus |
|---|---|---|
| **WHAT (Requirements)** | **OpenSpec** | Standardized markdown specs (`.opow/specs/`), data schemas, and *Given-When-Then* Acceptance Criteria |
| **HOW (Execution)** | **Superpowers** | Engineering discipline: Brainstorming → Plans (`.opow/plans/`) → TDD (Red-Green) → Verification |

---

## Features

- **Spec & Plan Workspace (`.opow/`)**:
  - `.opow/specs/templates/`: Standard templates for features (`feature.spec.md`), API contracts (`api.spec.md`), and schemas (`schema-template.json`).
  - `.opow/specs/<feature>.spec.md`: Active feature specifications and data contracts.
  - `.opow/plans/<feature>.plan.md`: Actionable atomic implementation plans.
- **Multi-Platform Agent Integration**:
  - **Cline**: `<project>/.cline/skills/` + workflows at `<project>/.clinerules/workflows/` + manifest at `<project>/.cline/superpowers-manifest.json`
  - **Antigravity**: `<project>/.agent/skills/` + workflows at `<project>/.agent/workflows/` + manifest at `<project>/.agent/superpowers-manifest.json`
  - **Claude Code**: `<project>/.claude/skills/` + commands at `<project>/.claude/commands/` + manifest at `<project>/.claude/superpowers-manifest.json`
  - **Codex**: `<project>/.codex/skills/` + workflows at `<project>/.codex/workflows/` + manifest at `<project>/.codex/superpowers-manifest.json`
- **Tailored Platform Wrappers (`using-superpowers`)**:
  - **Cline**: Optimized for `use_skill`, `use_subagents`, and slash commands.
  - **Antigravity**: Optimized for Progressive Disclosure (`view_file`), hierarchical rules (`AGENTS.md` / `GEMINI.md`), and subagents.
  - **Claude Code**: Optimized for Anthropic CLI file viewing, slash commands (`.claude/commands/`), and delegated worker tasks.
  - **Codex**: Optimized for OpenAI agent workflows, slash commands (`.codex/workflows/`), and hierarchical instructions (`AGENTS.md` / `CODEX.md`).
- **Dedicated Skill (`spec-driven-development`)**: Teaches the agent to formulate specs and convert Acceptance Criteria directly into TDD tests.
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

### 4-Phase Slash Command Workflow

| Slash Command | Purpose | Underlying Skills |
|---|---|---|
| **`/spec [feature-name]`** | Interview, brainstorm edge cases, and draft `.opow/specs/<feature>.spec.md` with Acceptance Criteria | `brainstorming`, `spec-driven-development` |
| **`/plan [feature-name]`** | Transform approved OpenSpec into atomic implementation tasks in `.opow/plans/<feature>.plan.md` | `writing-plans` |
| **`/implement`** | Execute tasks using strict Test-Driven Development (Red-Green-Refactor) and Subagents | `test-driven-development`, `subagent-driven-development` |
| **`/verify`** | Run test suite and check off 100% of Acceptance Criteria against OpenSpec | `verification-before-completion` |

---

### Step-by-Step Example

1. **Author the Spec**: Type `/spec user-auth`
   > Agent interviews you on schema and requirements, drafts `.opow/specs/user-auth.spec.md` with Given-When-Then criteria, and waits for your approval.

2. **Generate the Plan**: Type `/plan user-auth`
   > Agent breaks the spec into atomic tasks linked to each Acceptance Criterion and saves to `.opow/plans/user-auth.plan.md`.

3. **Develop with TDD**: Type `/implement`
   > Agent authors failing tests (Red), writes minimal code to pass (Green), refactors, and checks off tasks.

4. **Verify & Sign-Off**: Type `/verify`
   > Agent runs the entire test suite and confirms 100% of Acceptance Criteria in `.opow/specs/user-auth.spec.md` are fulfilled.

---

## Project Structure

```
<project>/
├── .opow/                                # Open-Power specifications & plans
│   ├── specs/                            # Active specifications & templates
│   │   ├── templates/                    # Reusable spec templates
│   │   │   ├── feature.spec.md
│   │   │   ├── api.spec.md
│   │   │   └── schema-template.json
│   │   └── <feature>.spec.md
│   └── plans/                            # Implementation plans
│       └── <feature>.plan.md
├── .claude/                              # Claude Code target
│   ├── skills/                           # Superpowers skills
│   ├── commands/                         # Slash commands (/spec, /plan, /implement, /verify)
│   └── superpowers-manifest.json
├── .codex/                               # Codex target
│   ├── skills/                           # Superpowers skills
│   ├── workflows/                        # Slash commands (/spec, /plan, /implement, /verify)
│   └── superpowers-manifest.json
├── .agent/                               # Antigravity target
│   ├── skills/                           # Superpowers skills
│   ├── workflows/                        # Slash commands (/spec, /plan, /implement, /verify)
│   └── superpowers-manifest.json
└── .cline/                               # Cline target
    ├── skills/                           # Superpowers skills
    └── superpowers-manifest.json
```

---

## Commands & Options

| Command | Description |
|---|---|
| `install [target]` | Initialize OpenSpec templates and install skills into current project |
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