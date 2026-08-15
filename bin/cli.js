#!/usr/bin/env node

const { install } = require("../src/commands/install");
const { update } = require("../src/commands/update");
const { status } = require("../src/commands/status");
const { uninstall } = require("../src/commands/uninstall");

const HELP = `
open-power (opow) — Install & auto-update Superpowers skills for Cline & Antigravity

Usage:
  opow <command> [target] [options]

Commands:
  install [target]      Install skills into current project (default target: all)
  update [target]       Pull latest upstream and re-sync project skills
  status [target]       Show project installed status, skills, and upstream commit
  uninstall [target]    Remove skills from current project
  help                  Show this help

Targets:
  cline                 Install into .cline/skills/ (with Cline-optimized wrapper)
  antigravity, agy      Install into .agents/skills/ (with Antigravity-optimized wrapper)
  all (default)         Install into both .cline/skills/ and .agents/skills/

Options:
  -t, --target <name>   Specify target (cline | antigravity | agy | all)
  -h, --help            Show this help

Examples:
  # Install for both Cline and Antigravity in current project
  opow install

  # Install only for Antigravity (.agents/skills)
  opow install antigravity
  # or: opow install agy

  # Install only for Cline (.cline/skills)
  opow install cline

  # Check project status
  opow status

  # Update skills to latest upstream
  opow update

  # Uninstall from Antigravity
  opow uninstall agy
`;

function parseArgs(argv) {
    const raw = argv.slice(2);
    let command = null;
    let target = null;

    for (let i = 0; i < raw.length; i++) {
        const arg = raw[i];

        if (arg === "-h" || arg === "--help" || arg === "help") {
            return { command: "help" };
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

    return { command, target };
}

function main() {
    const { command, target } = parseArgs(process.argv);

    if (!command || command === "help") {
        console.log(HELP);
        return;
    }

    try {
        switch (command) {
            case "install":
                install(target);
                break;
            case "update":
                update(target);
                break;
            case "status":
                status(target);
                break;
            case "uninstall":
                uninstall(target);
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

main();