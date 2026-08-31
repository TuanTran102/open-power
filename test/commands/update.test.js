const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { update } = require("../../src/commands/update");
const { install } = require("../../src/commands/install");

describe("commands / update", () => {
    let tempDir;
    let origCwd;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opow-update-test-"));
        origCwd = process.cwd();
        process.chdir(tempDir);
    });

    afterEach(() => {
        process.chdir(origCwd);
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("updates installed targets from bundled package", () => {
        install();

        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            update();
            assert.ok(logs.some((l) => l.includes("Re-syncing skills for Cline...")));
            assert.ok(logs.some((l) => l.includes("Re-syncing skills for Antigravity...")));
            assert.ok(logs.some((l) => l.includes("Update complete") || l.includes("Synced with bundled package")));
            assert.ok(fs.existsSync(path.join(tempDir, ".gitignore")));
            assert.ok(fs.existsSync(path.join(tempDir, ".clinerules", "brief.md")));
            assert.ok(fs.existsSync(path.join(tempDir, ".agent", "rules", "brief.md")));
        } finally {
            console.log = origLog;
        }
    });

    it("updates specified target with explicit target argument", () => {
        install("claude");

        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            update("claude");
            assert.ok(logs.some((l) => l.includes("Re-syncing skills for Claude Code...")));
            assert.ok(logs.some((l) => l.includes("Update complete") || l.includes("Synced with bundled package")));
        } finally {
            console.log = origLog;
        }
    });

    it("reports warning when no installed skills are found in current project to update", () => {
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            update();
            assert.ok(logs.some((l) => l.includes("No installed skills found in current project to update")));
        } finally {
            console.log = origLog;
        }
    });
});
