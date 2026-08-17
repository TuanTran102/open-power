# open-power (`opow`)

CLI to install and auto-update **Superpowers skills** and **OpenSpec standards** for **Cline** and **Antigravity** (project-level).

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
- **Project-Level Agent Integration**:
  - **Cline**: `<project>/.cline/skills/` + manifest at `<project>/.cline/superpowers-manifest.json`
  - **Antigravity**: `<project>/.agent/skills/` + manifest at `<project>/.agent/superpowers-manifest.json`
- **Tailored Platform Wrappers (`using-superpowers`)**:
  - **Cline**: Optimized for `use_skill`, `use_subagents`, and slash commands.
  - **Antigravity**: Optimized for Progressive Disclosure (`view_file`), hierarchical rules (`AGENTS.md` / `GEMINI.md`), and subagents.
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

# Install OpenSpec templates & skills for both Cline and Antigravity (default)
opow install

# Install only for Antigravity (.agent/skills)
opow install antigravity
# or:
opow install agy

# Install only for Cline (.cline/skills)
opow install cline

# Check installation and upstream status in the current project
opow status

# Update skills and OpenSpec templates in the current project
opow update

# Uninstall skills from the current project
opow uninstall antigravity
opow uninstall cline
# or uninstall all:
opow uninstall
```

---

## How to Use with Your AI Agent (Slash Commands & Workflows)

`opow install` registers native **Slash Commands** (`.agent/workflows/` for Antigravity, `.clinerules/workflows/` for Cline). You can trigger each phase simply by typing `/` in the chat!

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

## Project Structure After `opow install`

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
├── .agent/skills/                        # Antigravity skills (or .cline/skills)
│   ├── brainstorming/
│   ├── test-driven-development/
│   ├── subagent-driven-development/
│   ├── systematic-debugging/
│   ├── verification-before-completion/
│   ├── spec-driven-development/          # OpenSpec authoring skill
│   └── using-superpowers/                # Integrated platform wrapper
└── .agent/superpowers-manifest.json
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

**Targets**: `cline`, `antigravity` (or `agy`), `all` (default).

**Options**:
- `-t, --target <name>`: Specify target platform (`cline`, `antigravity`, `agy`, `all`).
- `-h, --help`: Show help text.

---

## License

MIT