#!/usr/bin/env node

const { install } = require("../src/commands/install");
const { update } = require("../src/commands/update");
const { status } = require("../src/commands/status");
const { uninstall } = require("../src/commands/uninstall");
const { installProject } = require("../src/commands/install-project");
const { uninstallProject } = require("../src/commands/uninstall-project");

const HELP = `
superpowers-cline — Install & auto-update Superpowers skills for Cline

Usage:
  superpowers-cline <command>

Commands:
  install             Clone upstream and install skills into ~/.cline/skills/ (global)
  install-project     Install skills into .cline/skills/ in the current project
  update              Pull latest upstream and re-sync global skills
  status              Show installed version, update availability, and skill list
  uninstall           Remove global skills installed by this CLI
  uninstall-project   Remove project skills installed by this CLI
  help                Show this help

Options:
  -h, --help  Show this help
`;

function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === "help" || command === "-h" || command === "--help") {
        console.log(HELP);
        return;
    }

    try {
        switch (command) {
            case "install":
                install();
                break;
            case "install-project":
                installProject();
                break;
            case "update":
                update();
                break;
            case "status":
                status();
                break;
            case "uninstall":
                uninstall();
                break;
            case "uninstall-project":
                uninstallProject();
                break;
            default:
                console.log(`Unknown command: ${command}`);
                console.log(HELP);
                process.exitCode = 1;
        }
    } catch (err) {
        console.error(`\n❌ Error: ${err.message}`);
        process.exitCode = 1;
    }
}

main();