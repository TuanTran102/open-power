# open-power (`opow`)

CLI to install and auto-update **Superpowers skills** for **Cline** and **Antigravity** (project-level).

[Superpowers](https://github.com/obra/superpowers) is a set of skills (methodology) for coding agents: brainstorming, TDD, systematic-debugging, subagent-driven-development, etc. This CLI clones upstream, copies skills into your project's agent directory, and helps you update when upstream releases a new version.

## Features

- **Project-Level Installation**:
  - **Cline**: `<project>/.cline/skills/` + manifest at `<project>/.cline/superpowers-manifest.json`
  - **Antigravity**: `<project>/.agents/skills/` + manifest at `<project>/.agents/superpowers-manifest.json`
- **Platform-Specific Wrappers**: The `using-superpowers` skill is automatically adapted for each platform:
  - **Cline**: Optimized for `use_skill`, `use_subagents`, slash commands.
  - **Antigravity**: Optimized for Progressive Disclosure (`view_file`), hierarchical rules (`AGENTS.md` / `GEMINI.md`), and subagents.
- **Safe Uninstallation & Updates**: Uses per-project manifests to only touch skills installed by this CLI, leaving custom skills intact.
- **Upstream Cache**: Cached upstream repository in `~/.open-power/repo` for fast operations across projects.

## Installation

```bash
# Link globally
npm link

# Now you can use `opow`
```

Or run directly with Node:

```bash
node bin/cli.js <command>
```

## Usage

Navigate to your project directory:

```bash
cd /path/to/my-project

# Install for both Cline and Antigravity (default)
opow install

# Install only for Antigravity (.agents/skills)
opow install antigravity
# or: opow install agy

# Install only for Cline (.cline/skills)
opow install cline

# Check installation and upstream status in current project
opow status

# Update skills in current project to latest upstream
opow update

# Uninstall skills from current project
opow uninstall antigravity
opow uninstall cline
# or uninstall all:
opow uninstall
```

## Commands & Options

| Command | Description |
|---|---|
| `install [target]` | Clone upstream (if needed) and install skills into current project |
| `update [target]` | `git pull` upstream cache and re-sync project skills |
| `status [target]` | Show current commit, update availability, and installed skills |
| `uninstall [target]` | Remove installed skills from current project |
| `help` | Show usage and help information |

**Targets**: `cline`, `antigravity` (or `agy`), `all` (default).

## Structure

```
open-power/
├── bin/
│   └── cli.js                  # Entry point
├── src/
│   ├── commands/               # install / update / status / uninstall
│   ├── lib/                    # config, repo (git), sync, targets
│   └── wrapper/
│       ├── cline/              # Cline-specific skill wrapper
│       └── antigravity/        # Antigravity-specific skill wrapper
└── package.json
```

## Switching to a Fork as the Source (Optional)

By default it uses upstream `obra/superpowers`. To use a custom fork, edit `sourceUrl` in `~/.open-power/config.json`:

```json
{
    "sourceUrl": "https://github.com/your-username/superpowers.git"
}
```

## License

MIT