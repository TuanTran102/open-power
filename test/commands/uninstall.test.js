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

    it("auto-removes pristine .opow workspace when no user content exists", () => {
        install("claude");
        assert.ok(fs.existsSync(path.join(tempDir, ".opow")));

        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            uninstall("claude");
            assert.equal(fs.existsSync(path.join(tempDir, ".opow")), false);
            assert.ok(logs.some((l) => l.includes("Cleaned up pristine .opow/ workspace")));
        } finally {
            console.log = origLog;
        }
    });

    it("preserves .opow and outputs guidance when user specs exist", () => {
        install("claude");
        fs.writeFileSync(path.join(tempDir, ".opow", "specs", "auth.spec.md"), "# Auth Spec");

        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            uninstall("claude");
            assert.equal(fs.existsSync(path.join(tempDir, ".opow")), true);
            assert.equal(fs.existsSync(path.join(tempDir, ".opow", "specs", "auth.spec.md")), true);
            assert.ok(logs.some((l) => l.includes("Preserved .opow/ workspace")));
            assert.ok(logs.some((l) => l.includes("opow uninstall --all (or -a)")));
        } finally {
            console.log = origLog;
        }
    });

    it("purges .opow when options.all is true even if user specs exist", () => {
        install("claude");
        fs.writeFileSync(path.join(tempDir, ".opow", "specs", "auth.spec.md"), "# Auth Spec");

        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            uninstall("claude", { all: true });
            assert.equal(fs.existsSync(path.join(tempDir, ".opow")), false);
            assert.ok(logs.some((l) => l.includes("Purged .opow/ workspace (--all)")));
        } finally {
            console.log = origLog;
        }
    });
});
