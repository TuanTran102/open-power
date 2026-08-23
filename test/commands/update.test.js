const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { update } = require("../../src/commands/update");
const { install } = require("../../src/commands/install");
const repo = require("../../src/lib/repo");

describe("commands / update", () => {
    let tempDir;
    let origCwd;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opow-update-test-"));
        origCwd = process.cwd();
        process.chdir(tempDir);
        repo.ensureRepo();
    });

    afterEach(() => {
        process.chdir(origCwd);
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("handles no cached repo found", () => {
        const origRepoExists = repo.repoExists;
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            repo.repoExists = () => false;
            update();
            assert.ok(logs.some((l) => l.includes("No cached repo found. Run `install` first.")));
        } finally {
            repo.repoExists = origRepoExists;
            console.log = origLog;
        }
    });

    it("handles pullRepo failure gracefully", () => {
        const origPullRepo = repo.pullRepo;
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            repo.pullRepo = () => {
                throw new Error("Git merge conflict or offline");
            };
            update();
            assert.ok(logs.some((l) => l.includes("No updates available (already up to date) or pull failed.")));

            logs.length = 0;
            repo.pullRepo = () => {
                throw "Custom error string";
            };
            update();
            assert.ok(logs.some((l) => l.includes("Custom error string")));
        } finally {
            repo.pullRepo = origPullRepo;
            console.log = origLog;
        }
    });

    it("updates installed targets and reports 'already on latest commit'", () => {
        install();

        const origPullRepo = repo.pullRepo;
        const origGetCurrentCommit = repo.getCurrentCommit;
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            repo.pullRepo = () => {};
            repo.getCurrentCommit = () => "commit_same";

            update();
            assert.ok(logs.some((l) => l.includes("Re-syncing skills for Cline...")));
            assert.ok(logs.some((l) => l.includes("Re-syncing skills for Antigravity...")));
            assert.ok(logs.some((l) => l.includes("Update complete (already on latest commit).")));
        } finally {
            repo.pullRepo = origPullRepo;
            repo.getCurrentCommit = origGetCurrentCommit;
            console.log = origLog;
        }
    });

    it("updates installed targets with new commit diff", () => {
        install("claude");

        const origPullRepo = repo.pullRepo;
        const origGetCurrentCommit = repo.getCurrentCommit;
        let commitCalls = 0;
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            repo.pullRepo = () => {};
            repo.getCurrentCommit = () => (++commitCalls === 1 ? "commit_old" : "commit_new");

            update("claude");
            assert.ok(logs.some((l) => l.includes("Re-syncing skills for Claude Code...")));
            assert.ok(logs.some((l) => l.includes("commit_old → commit_new")));
        } finally {
            repo.pullRepo = origPullRepo;
            repo.getCurrentCommit = origGetCurrentCommit;
            console.log = origLog;
        }
    });

    it("reports warning when no installed skills are found in current project to update", () => {
        const origPullRepo = repo.pullRepo;
        const logs = [];
        const origLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));

        try {
            repo.pullRepo = () => {};
            update(); // default targets (cline, antigravity) are not installed in tempDir
            assert.ok(logs.some((l) => l.includes("No installed skills found in current project to update")));
        } finally {
            repo.pullRepo = origPullRepo;
            console.log = origLog;
        }
    });
});
