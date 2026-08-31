const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { status } = require("../../src/commands/status");
const { install } = require("../../src/commands/install");

describe("commands / status", () => {
    let tempDir;
    let origCwd;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opow-status-test-"));
        origCwd = process.cwd();
        process.chdir(tempDir);
    });

    afterEach(() => {
        process.chdir(origCwd);
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("reports bundled commit, uninstalled target status, and missing .opow directories", () => {
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            status("cline");
            assert.ok(logs.some((l) => l.includes("open-power (opow) — Project Status")));
            assert.ok(logs.some((l) => l.includes("Bundled upstream commit:") || l.includes("Upstream commit:")));
            assert.ok(logs.some((l) => l.includes("Status: Not installed in this project.")));
            assert.ok(logs.some((l) => l.includes("Specs:     ✗ Missing")));
        } finally {
            console.log = origLog;
        }
    });

    it("reports installed target details with workflow/skill ticks and missing item markers", () => {
        install("claude");

        // Intentionally remove one workflow and one skill to test ✗ (missing) markers
        const missingWf = path.join(tempDir, ".claude", "commands", "spec.md");
        if (fs.existsSync(missingWf)) fs.rmSync(missingWf);

        const missingSkill = path.join(tempDir, ".claude", "skills", "test-driven-development");
        if (fs.existsSync(missingSkill)) fs.rmSync(missingSkill, { recursive: true, force: true });

        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            status("claude");
            assert.ok(logs.some((l) => l.includes("Target: Claude Code")));
            assert.ok(logs.some((l) => l.includes("Platform wrapper: using-superpowers")));
            assert.ok(logs.some((l) => l.includes("✗ (missing) /spec")));
            assert.ok(logs.some((l) => l.includes("✗ (missing) test-driven-development")));
        } finally {
            console.log = origLog;
        }
    });

    it("reports installed target when manifest has missing optional fields", () => {
        const { writeManifest } = require("../../src/lib/sync");
        const manifestPath = path.join(tempDir, ".claude", "superpowers-manifest.json");
        writeManifest(manifestPath, {
            target: "claude",
            skills: ["custom-only"],
        });

        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            status("claude");
            assert.ok(logs.some((l) => l.includes("Installed commit:    unknown")));
            assert.ok(logs.some((l) => l.includes("Installed at:        unknown")));
            assert.ok(logs.some((l) => l.includes("custom-only")));
        } finally {
            console.log = origLog;
        }
    });
});
