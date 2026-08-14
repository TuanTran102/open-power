# superpowers-cline

CLI to install and auto-update **Superpowers skills** for **Cline**.

[Superpowers](https://github.com/obra/superpowers) is a set of skills (methodology) for coding agents: brainstorming, TDD, systematic-debugging, subagent-driven-development, etc. This CLI clones upstream, copies skills into Cline, and helps you update when upstream releases a new version — no manual copying, no getting outdated.

## Features

- **install** — clone upstream `obra/superpowers` and install skills into `~/.cline/skills/` (global).
- **install-project** — install skills into `.cline/skills/` in the current project (workaround for IDE extensions that don't detect global skills).
- **update** — `git pull` upstream then re-sync global skills.
- **status** — view the current commit, whether a new version is available, and the list of installed skills.
- **uninstall** — remove global skills installed by this CLI (won't touch your other skills).
- **uninstall-project** — remove project skills installed by this CLI.
- **Cline-specific wrapper** — the `using-superpowers` skill is replaced with an optimized version for Cline (guidance on using `use_skill`, `use_subagents`, slash commands).

## Installation

```bash
# From this project directory
npm link          # creates a globally usable `supcline` command
```

Or run directly:

```bash
node bin/cli.js install
```

## Usage

```bash
# Install globally (all projects)
supcline install

# Install into the current project (when the IDE doesn't detect global skills)
cd /path/to/project
supcline install-project

# Update / check / uninstall
supcline update
supcline status
supcline uninstall
supcline uninstall-project
supcline help
```

## When to use global vs project

- **Global** (`install`): installs into `~/.cline/skills/`, used for all projects. Works well with Cline CLI.
- **Project** (`install-project`): installs into `<project>/.cline/skills/`, used when the IDE extension (Antigravity/VS Code) can't detect global skills. Needs to be re-run for each project.

## Structure

```
superpowers-cline/
├── bin/cli.js                # entry point
├── src/
│   ├── commands/             # install / install-project / update / status / uninstall / uninstall-project
│   ├── lib/                  # config, repo (git), sync (copy + manifest)
│   └── wrapper/
│       └── using-superpowers/  # Cline-specific skill wrapper
└── package.json
```

## CLI data

- Repo cache: `~/.superpowers-cline/repo`
- Global manifest: `~/.superpowers-cline/manifest.json`
- Config (source, paths): `~/.superpowers-cline/config.json`
- Global skills: `~/.cline/skills/`
- Project skills: `<project>/.cline/skills/` + manifest at `<project>/.cline/superpowers-manifest.json`

## Switching to a fork as the source (optional)

By default it uses the upstream `obra/superpowers` directly. To use your own fork, edit `sourceUrl` in `~/.superpowers-cline/config.json` and run `install` again.

## License

MIT