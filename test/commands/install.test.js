const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { install } = require("../../src/commands/install");

describe("commands / install", () => {
    let tempDir;
    let origCwd;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opow-install-test-"));
        origCwd = process.cwd();
        process.chdir(tempDir);
    });

    afterEach(() => {
        process.chdir(origCwd);
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("installs default targets with slash commands and skills completely offline", () => {
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            install();
            assert.ok(logs.some((l) => l.includes("Installing Superpowers + OpenSpec for Cline")));
            assert.ok(logs.some((l) => l.includes("Installing Superpowers + OpenSpec for Antigravity")));
            assert.ok(logs.some((l) => l.includes("⚡ Installed")));
            assert.ok(logs.some((l) => l.includes("/sync-spec")));
            assert.ok(fs.existsSync(path.join(tempDir, ".opow", "specs")));
            assert.ok(fs.existsSync(path.join(tempDir, ".opow", "changes")));
            assert.ok(fs.existsSync(path.join(tempDir, ".opow", "archive")));
            assert.ok(fs.existsSync(path.join(tempDir, ".cline", "skills")));
            assert.ok(fs.existsSync(path.join(tempDir, ".agent", "skills")));
            assert.ok(fs.existsSync(path.join(tempDir, ".gitignore")));
            const gitignoreContent = fs.readFileSync(path.join(tempDir, ".gitignore"), "utf8");
            assert.ok(gitignoreContent.includes(".opow/"));
            assert.ok(gitignoreContent.includes(".worktrees/"));
            assert.ok(fs.existsSync(path.join(tempDir, ".clinerules", "brief.md")));
            assert.match(fs.readFileSync(path.join(tempDir, ".clinerules", "brief.md"), "utf8"), /\bbe brief\b/i);
            assert.ok(fs.existsSync(path.join(tempDir, ".agent", "rules", "brief.md")));
            assert.match(fs.readFileSync(path.join(tempDir, ".agent", "rules", "brief.md"), "utf8"), /\bbe brief\b/i);
        } finally {
            console.log = origLog;
        }
    });

    it("installs specific target (claude) and handles missing templates reporting", () => {
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            install("claude");
            assert.ok(logs.some((l) => l.includes("Installing Superpowers + OpenSpec for Claude Code")));
            assert.ok(fs.existsSync(path.join(tempDir, ".claude", "skills")));
            assert.ok(fs.existsSync(path.join(tempDir, ".claude", "commands")));
            assert.ok(fs.existsSync(path.join(tempDir, "CLAUDE.md")));
            assert.match(fs.readFileSync(path.join(tempDir, "CLAUDE.md"), "utf8"), /\bbe brief\b/i);
        } finally {
            console.log = origLog;
        }
    });

    it("handles missing templates and empty workflows list formatting", () => {
        const origExistsSync = fs.existsSync;
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            fs.existsSync = (p) => {
                if (typeof p === "string" && (p.includes("templates/openspec") || p.includes("templates/workflows"))) {
                    return false;
                }
                return origExistsSync(p);
            };

            install("claude");
            assert.ok(logs.some((l) => l.includes("Templates:") && l.includes("⚠️ Missing")));
        } finally {
            fs.existsSync = origExistsSync;
            console.log = origLog;
        }
    });
});
