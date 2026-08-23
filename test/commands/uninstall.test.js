const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { uninstall } = require("../../src/commands/uninstall");
const { install } = require("../../src/commands/install");
const { ensureRepo } = require("../../src/lib/repo");

describe("commands / uninstall", () => {
    let tempDir;
    let origCwd;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opow-uninstall-test-"));
        origCwd = process.cwd();
        process.chdir(tempDir);
        ensureRepo();
    });

    afterEach(() => {
        process.chdir(origCwd);
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("uninstalls installed targets successfully and prompts restart", () => {
        install("claude");

        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            uninstall("claude");
            assert.ok(logs.some((l) => l.includes("Removed") && l.includes("skills for Claude Code")));
            assert.ok(logs.some((l) => l.includes("Removed") && l.includes("workflows for Claude Code")));
            assert.ok(logs.some((l) => l.includes("Restart your IDE / agent session to refresh.")));
        } finally {
            console.log = origLog;
        }
    });

    it("handles errors gracefully when target is not installed", () => {
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            uninstall("cline");
            assert.ok(logs.some((l) => l.includes("⚠️  No manifest found for Cline")));
            assert.ok(!logs.some((l) => l.includes("Restart your IDE / agent session to refresh.")));
        } finally {
            console.log = origLog;
        }
    });
});
