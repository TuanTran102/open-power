const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const childProcess = require("child_process");
const { syncUpstream } = require("../../scripts/sync-upstream");

describe("scripts / sync-upstream", () => {
    let tempDir;
    let mockRemoteRepoDir;
    let targetUpstreamDir;
    let targetMetaPath;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opow-sync-upstream-test-"));
        mockRemoteRepoDir = path.join(tempDir, "mock-remote");
        targetUpstreamDir = path.join(tempDir, "target-upstream");
        targetMetaPath = path.join(tempDir, "vendor-meta.json");

        // Initialize mock git repo
        fs.mkdirSync(path.join(mockRemoteRepoDir, "skills", "mock-skill-1"), { recursive: true });
        fs.mkdirSync(path.join(mockRemoteRepoDir, "skills", "mock-skill-2"), { recursive: true });
        fs.writeFileSync(path.join(mockRemoteRepoDir, "skills", "mock-skill-1", "SKILL.md"), "# Mock Skill 1");
        fs.writeFileSync(path.join(mockRemoteRepoDir, "skills", "mock-skill-2", "SKILL.md"), "# Mock Skill 2");

        childProcess.execSync("git init -b main", { cwd: mockRemoteRepoDir, stdio: "ignore" });
        childProcess.execSync('git config user.email "test@example.com"', { cwd: mockRemoteRepoDir, stdio: "ignore" });
        childProcess.execSync('git config user.name "Test"', { cwd: mockRemoteRepoDir, stdio: "ignore" });
        childProcess.execSync("git add .", { cwd: mockRemoteRepoDir, stdio: "ignore" });
        childProcess.execSync('git commit -m "initial commit"', { cwd: mockRemoteRepoDir, stdio: "ignore" });

        // Initialize initial vendor-meta
        fs.mkdirSync(targetUpstreamDir, { recursive: true });
        fs.writeFileSync(
            targetMetaPath,
            JSON.stringify(
                {
                    upstream: {
                        repo: "mock",
                        commit: "old_commit",
                        syncedAt: new Date().toISOString(),
                        skills: [],
                    },
                    openspec: {
                        skills: ["openspec-explore"],
                    },
                },
                null,
                2
            )
        );
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("fetches upstream repo, copies skills, and updates vendor-meta.json", () => {
        const result = syncUpstream({
            repoUrl: mockRemoteRepoDir,
            upstreamSkillsDir: targetUpstreamDir,
            vendorMetaPath: targetMetaPath,
        });

        assert.equal(result.updated, true);
        assert.ok(result.commit);
        assert.deepEqual(result.skills.sort(), ["mock-skill-1", "mock-skill-2"]);

        // Verify targetUpstreamDir contents
        assert.ok(fs.existsSync(path.join(targetUpstreamDir, "mock-skill-1", "SKILL.md")));
        assert.ok(fs.existsSync(path.join(targetUpstreamDir, "mock-skill-2", "SKILL.md")));

        // Verify vendor-meta.json
        const updatedMeta = JSON.parse(fs.readFileSync(targetMetaPath, "utf8"));
        assert.equal(updatedMeta.upstream.commit, result.commit);
        assert.deepEqual(updatedMeta.upstream.skills.sort(), ["mock-skill-1", "mock-skill-2"]);
        assert.deepEqual(updatedMeta.openspec.skills, ["openspec-explore"]);
    });

    it("returns updated: false when already on the same commit without force flag", () => {
        // First sync
        const firstResult = syncUpstream({
            repoUrl: mockRemoteRepoDir,
            upstreamSkillsDir: targetUpstreamDir,
            vendorMetaPath: targetMetaPath,
        });
        assert.equal(firstResult.updated, true);

        // Second sync without changes
        const secondResult = syncUpstream({
            repoUrl: mockRemoteRepoDir,
            upstreamSkillsDir: targetUpstreamDir,
            vendorMetaPath: targetMetaPath,
        });
        assert.equal(secondResult.updated, false);
    });
});
