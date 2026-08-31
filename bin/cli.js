#!/usr/bin/env node

const installMod = require("../src/commands/install");
const updateMod = require("../src/commands/update");
const statusMod = require("../src/commands/status");
const uninstallMod = require("../src/commands/uninstall");

const HELP = `
open-power (opow) — Install & auto-update Superpowers skills for Cline, Antigravity, Claude Code & Codex

Usage:
  opow <command> [target] [options]

Commands:
  install [target]      Install skills into current project (default targets: cline, antigravity)
  update [target]       Pull latest upstream and re-sync project skills
  status [target]       Show project installed status, skills, and upstream commit
  uninstall [target]    Remove skills from current project
  help                  Show this help

Targets:
  cline                 Install into .cline/skills/ (with Cline-optimized wrapper)
  antigravity, agy      Install into .agent/skills/ (with Antigravity-optimized wrapper)
  claude, cc            Install into .claude/skills/ (with Claude Code-optimized wrapper)
  codex, cdx            Install into .codex/skills/ (with Codex-optimized wrapper)
  all                   Install into all 4 platform directories

Options:
  -t, --target <name>   Specify target (cline | antigravity | agy | claude | cc | codex | cdx | all)
  -a, --all             Remove all skills and purge the entire .opow/ workspace
  -h, --help            Show this help

Examples:
  # Install for default targets (Cline & Antigravity)
  opow install

  # Install for all 4 platforms
  opow install all

  # Install only for Claude Code (.claude/skills)
  opow install claude
  # or: opow install cc

  # Install only for Codex (.codex/skills)
  opow install codex
  # or: opow install cdx

  # Install only for Antigravity (.agent/skills)
  opow install antigravity
  # or: opow install agy

  # Install only for Cline (.cline/skills)
  opow install cline

  # Check project status across all platforms
  opow status all

  # Update skills to latest upstream
  opow update

  # Uninstall from Claude Code
  opow uninstall cc

  # Uninstall all skills and purge the entire .opow/ workspace
  opow uninstall --all
`;

function parseArgs(argv) {
    const raw = argv.slice(2);
    let command = null;
    let target = null;
    const flags = {
        all: false,
    };

    for (let i = 0; i < raw.length; i++) {
        const arg = raw[i];

        if (arg === "-h" || arg === "--help" || arg === "help") {
            return { command: "help" };
        }

        if (arg === "-a" || arg === "--all") {
            flags.all = true;
            continue;
        }

        if (arg === "-t" || arg === "--target") {
            if (i + 1 < raw.length) {
                target = raw[++i];
            }
            continue;
        }

        if (arg.startsWith("--target=")) {
            target = arg.split("=")[1];
            continue;
        }

        if (!command) {
            command = arg;
        } else if (!target) {
            target = arg;
        }
    }

    return { command, target, flags };
}

function main() {
    const { command, target, flags } = parseArgs(process.argv);

    if (!command || command === "help") {
        console.log(HELP);
        return;
    }

    try {
        switch (command) {
            case "install":
                installMod.install(target);
                break;
            case "update":
                updateMod.update(target);
                break;
            case "status":
                statusMod.status(target);
                break;
            case "uninstall":
                uninstallMod.uninstall(target, flags);
                break;
            default:
                console.log(`Unknown command: "${command}"`);
                console.log(HELP);
                process.exitCode = 1;
        }
    } catch (err) {
        console.error(`\n❌ Error: ${err.message}`);
        process.exitCode = 1;
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    HELP,
    parseArgs,
    main,
};