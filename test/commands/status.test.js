const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { status } = require("../../src/commands/status");
const { install } = require("../../src/commands/install");
const repo = require("../../src/lib/repo");

describe("commands / status", () => {
    let tempDir;
    let origCwd;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opow-status-test-"));
        origCwd = process.cwd();
        process.chdir(tempDir);
        repo.ensureRepo();
    });

    afterEach(() => {
        process.chdir(origCwd);
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("handles no cached upstream repository", () => {
        const origRepoExists = repo.repoExists;
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            repo.repoExists = () => false;
            status();
            assert.ok(logs.some((l) => l.includes("No cached upstream repository found")));
        } finally {
            repo.repoExists = origRepoExists;
            console.log = origLog;
        }
    });

    it("reports upstream up to date, uninstalled target status, and missing .opow directories", () => {
        const origFetchRepo = repo.fetchRepo;
        const origGetCurrentCommit = repo.getCurrentCommit;
        const origGetRemoteCommit = repo.getRemoteCommit;
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            repo.fetchRepo = () => {};
            repo.getCurrentCommit = () => "commit_abc";
            repo.getRemoteCommit = () => "commit_abc";

            status("cline");
            assert.ok(logs.some((l) => l.includes("Upstream status: ✅ Up to date")));
            assert.ok(logs.some((l) => l.includes("Status: Not installed in this project.")));
            assert.ok(logs.some((l) => l.includes("Specs:     ✗ Missing")));
        } finally {
            repo.fetchRepo = origFetchRepo;
            repo.getCurrentCommit = origGetCurrentCommit;
            repo.getRemoteCommit = origGetRemoteCommit;
            console.log = origLog;
        }
    });

    it("reports upstream update available", () => {
        const origFetchRepo = repo.fetchRepo;
        const origGetCurrentCommit = repo.getCurrentCommit;
        const origGetRemoteCommit = repo.getRemoteCommit;
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            repo.fetchRepo = () => {};
            repo.getCurrentCommit = () => "commit_old";
            repo.getRemoteCommit = () => "commit_new";

            status("cline");
            assert.ok(logs.some((l) => l.includes("Upstream status: ⚠️  Update available (commit_new)")));
        } finally {
            repo.fetchRepo = origFetchRepo;
            repo.getCurrentCommit = origGetCurrentCommit;
            repo.getRemoteCommit = origGetRemoteCommit;
            console.log = origLog;
        }
    });

    it("reports offline / error during remote fetch", () => {
        const origFetchRepo = repo.fetchRepo;
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            repo.fetchRepo = () => {
                throw new Error("Network unreachable");
            };

            status("cline");
            assert.ok(logs.some((l) => l.includes("Could not check for remote updates (offline?).")));
        } finally {
            repo.fetchRepo = origFetchRepo;
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
