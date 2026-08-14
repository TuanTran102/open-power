#!/usr/bin/env node

const { install } = require("../src/commands/install");
const { update } = require("../src/commands/update");
const { status } = require("../src/commands/status");
const { uninstall } = require("../src/commands/uninstall");

const HELP = `
superpowers-cline — Install & auto-update Superpowers skills for Cline

Usage:
  superpowers-cline <command>

Commands:
  install     Clone upstream and install skills into ~/.cline/skills/
  update      Pull latest upstream and re-sync skills
  status      Show installed version, update availability, and skill list
  uninstall   Remove skills installed by this CLI
  help        Show this help

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
            case "update":
                update();
                break;
            case "status":
                status();
                break;
            case "uninstall":
                uninstall();
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