const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const config = require("../../src/lib/config");
const repo = require("../../src/lib/repo");

describe("repo", () => {
    it("runs git command and trims output with runGit", () => {
        const out = repo.runGit("version", process.cwd());
        assert.ok(out.startsWith("git version"));
    });

    it("checks getSkillsSourceDir", () => {
        const skillsDir = repo.getSkillsSourceDir();
        assert.equal(skillsDir, path.join(config.getRepoDir(), "skills"));
    });

    it("checks repoExists when .git does or does not exist", () => {
        const origExistsSync = fs.existsSync;
        try {
            fs.existsSync = (p) => p.endsWith(".git");
            assert.equal(repo.repoExists(), true);

            fs.existsSync = () => false;
            assert.equal(repo.repoExists(), false);
        } finally {
            fs.existsSync = origExistsSync;
        }
    });

    it("clones, pulls, fetches, and gets commits via git commands", () => {
        const origExecSync = childProcess.execSync;
        const origMkdirSync = fs.mkdirSync;
        const executedCommands = [];

        try {
            fs.mkdirSync = () => {};
            childProcess.execSync = (cmd, opts) => {
                executedCommands.push({ cmd, cwd: opts?.cwd });
                if (cmd.includes("rev-parse HEAD")) return "sha_head_123\n";
                if (cmd.includes("rev-parse origin/HEAD")) return "sha_origin_456\n";
                return "ok\n";
            };

            repo.cloneRepo("https://example.com/repo.git");
            assert.ok(executedCommands.some((c) => c.cmd.includes("clone --depth 1 https://example.com/repo.git")));

            repo.pullRepo();
            assert.ok(executedCommands.some((c) => c.cmd === "git pull --ff-only"));

            repo.fetchRepo();
            assert.ok(executedCommands.some((c) => c.cmd === "git fetch --depth 1 origin"));

            const headCommit = repo.getCurrentCommit();
            assert.equal(headCommit, "sha_head_123");

            const remoteCommit = repo.getRemoteCommit();
            assert.equal(remoteCommit, "sha_origin_456");
        } finally {
            childProcess.execSync = origExecSync;
            fs.mkdirSync = origMkdirSync;
        }
    });

    it("ensures repo when repo already exists", () => {
        const origExistsSync = fs.existsSync;
        try {
            fs.existsSync = (p) => p.endsWith(".git");
            const repoDir = repo.ensureRepo();
            assert.equal(repoDir, config.getRepoDir());
        } finally {
            fs.existsSync = origExistsSync;
        }
    });

    it("ensures repo and clones when repo does not exist", () => {
        const origExistsSync = fs.existsSync;
        const origExecSync = childProcess.execSync;
        const origMkdirSync = fs.mkdirSync;
        let clonedUrl = null;

        try {
            fs.existsSync = () => false;
            fs.mkdirSync = () => {};
            childProcess.execSync = (cmd) => {
                if (cmd.includes("clone")) {
                    clonedUrl = cmd;
                }
                return "";
            };

            const repoDir = repo.ensureRepo();
            assert.equal(repoDir, config.getRepoDir());
            assert.ok(clonedUrl && clonedUrl.includes("clone --depth 1"));
        } finally {
            fs.existsSync = origExistsSync;
            childProcess.execSync = origExecSync;
            fs.mkdirSync = origMkdirSync;
        }
    });
});
