const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseArgs, main, HELP } = require("../../bin/cli");
const installMod = require("../../src/commands/install");
const updateMod = require("../../src/commands/update");
const statusMod = require("../../src/commands/status");
const uninstallMod = require("../../src/commands/uninstall");

describe("bin / cli", () => {
    describe("parseArgs", () => {
        it("parses empty or help flags", () => {
            assert.deepEqual(parseArgs(["node", "cli.js"]), { command: null, target: null });
            assert.deepEqual(parseArgs(["node", "cli.js", "-h"]), { command: "help" });
            assert.deepEqual(parseArgs(["node", "cli.js", "--help"]), { command: "help" });
            assert.deepEqual(parseArgs(["node", "cli.js", "help"]), { command: "help" });
        });

        it("parses options and flags with -t, --target, and --target= syntax", () => {
            assert.deepEqual(parseArgs(["node", "cli.js", "install", "-t", "claude"]), { command: "install", target: "claude" });
            assert.deepEqual(parseArgs(["node", "cli.js", "install", "--target", "codex"]), { command: "install", target: "codex" });
            assert.deepEqual(parseArgs(["node", "cli.js", "install", "--target=antigravity"]), { command: "install", target: "antigravity" });
            assert.deepEqual(parseArgs(["node", "cli.js", "install", "-t"]), { command: "install", target: null });
        });

        it("parses positional command and target arguments", () => {
            assert.deepEqual(parseArgs(["node", "cli.js", "install", "cc"]), { command: "install", target: "cc" });
            assert.deepEqual(parseArgs(["node", "cli.js", "update", "all"]), { command: "update", target: "all" });
            assert.deepEqual(parseArgs(["node", "cli.js", "status"]), { command: "status", target: null });
            assert.deepEqual(parseArgs(["node", "cli.js", "uninstall", "cline"]), { command: "uninstall", target: "cline" });
        });
    });

    describe("main dispatcher", () => {
        it("displays help when command is omitted or 'help'", () => {
            const origArgv = process.argv;
            const origLog = console.log;
            const logs = [];

            try {
                console.log = (...args) => logs.push(args.join(" "));

                process.argv = ["node", "cli.js"];
                main();
                assert.ok(logs.some((l) => l.includes("Usage:")));

                logs.length = 0;
                process.argv = ["node", "cli.js", "help"];
                main();
                assert.ok(logs.some((l) => l.includes("Usage:")));
            } finally {
                process.argv = origArgv;
                console.log = origLog;
            }
        });

        it("dispatches install, update, status, uninstall commands", () => {
            const origArgv = process.argv;
            const origInstall = installMod.install;
            const origUpdate = updateMod.update;
            const origStatus = statusMod.status;
            const origUninstall = uninstallMod.uninstall;

            const calls = [];

            try {
                installMod.install = (t) => calls.push({ cmd: "install", target: t });
                updateMod.update = (t) => calls.push({ cmd: "update", target: t });
                statusMod.status = (t) => calls.push({ cmd: "status", target: t });
                uninstallMod.uninstall = (t) => calls.push({ cmd: "uninstall", target: t });

                process.argv = ["node", "cli.js", "install", "claude"];
                main();

                process.argv = ["node", "cli.js", "update", "all"];
                main();

                process.argv = ["node", "cli.js", "status", "cdx"];
                main();

                process.argv = ["node", "cli.js", "uninstall", "agy"];
                main();

                assert.deepEqual(calls, [
                    { cmd: "install", target: "claude" },
                    { cmd: "update", target: "all" },
                    { cmd: "status", target: "cdx" },
                    { cmd: "uninstall", target: "agy" },
                ]);
            } finally {
                process.argv = origArgv;
                installMod.install = origInstall;
                updateMod.update = origUpdate;
                statusMod.status = origStatus;
                uninstallMod.uninstall = origUninstall;
            }
        });

        it("handles unknown commands and sets exit code 1", () => {
            const origArgv = process.argv;
            const origLog = console.log;
            const origExitCode = process.exitCode;
            const logs = [];

            try {
                console.log = (...args) => logs.push(args.join(" "));
                process.argv = ["node", "cli.js", "invalid-cmd"];
                main();

                assert.ok(logs.some((l) => l.includes('Unknown command: "invalid-cmd"')));
                assert.equal(process.exitCode, 1);
            } finally {
                process.argv = origArgv;
                console.log = origLog;
                process.exitCode = origExitCode;
            }
        });

        it("catches command exceptions and sets exit code 1", () => {
            const origArgv = process.argv;
            const origInstall = installMod.install;
            const origError = console.error;
            const origExitCode = process.exitCode;
            const errors = [];

            try {
                console.error = (...args) => errors.push(args.join(" "));
                installMod.install = () => {
                    throw new Error("Target filesystem locked");
                };

                process.argv = ["node", "cli.js", "install"];
                main();

                assert.ok(errors.some((e) => e.includes("❌ Error: Target filesystem locked")));
                assert.equal(process.exitCode, 1);
            } finally {
                process.argv = origArgv;
                installMod.install = origInstall;
                console.error = origError;
                process.exitCode = origExitCode;
            }
        });

        it("executes CLI entry point directly when invoked as main process", () => {
            const childProcess = require("child_process");
            const path = require("path");
            const cliPath = path.join(__dirname, "../../bin/cli.js");
            const out = childProcess.execSync(`node "${cliPath}" -h`, { encoding: "utf8" });
            assert.ok(out.includes("open-power (opow)"));
        });
    });
});
