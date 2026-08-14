# superpowers-cline

CLI to install and auto-update **Superpowers skills** for **Cline**.

[Superpowers](https://github.com/obra/superpowers) is a collection of skills (methodologies) for coding agents: brainstorming, TDD, systematic-debugging, subagent-driven-development, etc. This CLI clones the upstream repo, copies the skills into `~/.cline/skills/` (global), and helps you stay up to date when upstream releases new versions — no manual copying, no stale skills.

## Features

- **install** — clone upstream `obra/superpowers` and install skills into `~/.cline/skills/`.
- **update** — `git pull` upstream, then re-sync the skills.
- **status** — show the current commit, whether a newer version is available, and the list of installed skills.
- **uninstall** — remove only the skills installed by this CLI (leaves your other skills untouched).
- **Cline-specific wrapper** — the `using-superpowers` skill is replaced with a Cline-optimized version (instructions for using `use_skill`, `use_subagents`, and slash commands).

## Installation

```bash
# From this project directory
npm link          # creates the global `superpowers-cline` command
```

Or run it directly:

```bash
node bin/cli.js install
```

## Usage

```bash
superpowers-cline install     # first-time install (global)
superpowers-cline update      # update when a new version is available
superpowers-cline status      # check version & skills
superpowers-cline uninstall   # remove installation
superpowers-cline help        # show help
```

## Structure

```
superpowers-cline/
├── bin/cli.js                # entry point
├── src/
│   ├── commands/             # install / update / status / uninstall
│   ├── lib/                  # config, repo (git), sync (copy + manifest)
│   └── wrapper/
│       └── using-superpowers/  # Cline-specific skill wrapper
└── package.json
```

## CLI Data

- Repo cache: `~/.superpowers-cline/repo`
- Manifest (list of installed skills): `~/.superpowers-cline/manifest.json`
- Config (source, paths): `~/.superpowers-cline/config.json`
- Skills installed to: `~/.cline/skills/`

## Switching to a Fork (Optional)

By default, the CLI uses the upstream `obra/superpowers` repo directly. To use your own fork, edit `sourceUrl` in `~/.superpowers-cline/config.json` and run `install` again.

## License

MIT