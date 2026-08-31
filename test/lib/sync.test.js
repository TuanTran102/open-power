const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { TARGETS } = require("../../src/lib/targets");
const {
    copyDir,
    removeDir,
    readManifest,
    writeManifest,
    syncTargetSkills,
    syncOpenSpec,
    uninstallTargetSkills,
} = require("../../src/lib/sync");
const { ensureRepo } = require("../../src/lib/repo");

describe("sync & target lifecycle", () => {
    let tempDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opow-test-"));
        ensureRepo();
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("copyDir handles non-existent src, overwrite flag, and ignores dot/underscore files", () => {
        const nonExistent = path.join(tempDir, "does-not-exist");
        const dest = path.join(tempDir, "dest");
        // Should return cleanly
        copyDir(nonExistent, dest);
        assert.ok(!fs.existsSync(dest));

        // Create src with normal file, dotfile, and underscore file
        const src = path.join(tempDir, "src");
        fs.mkdirSync(src, { recursive: true });
        fs.writeFileSync(path.join(src, "regular.txt"), "original");
        fs.writeFileSync(path.join(src, ".hidden.txt"), "hidden");
        fs.writeFileSync(path.join(src, "._apple_double"), "apple");

        // Copy without overwrite
        fs.mkdirSync(dest, { recursive: true });
        fs.writeFileSync(path.join(dest, "regular.txt"), "keep_me");
        copyDir(src, dest, false);

        assert.equal(fs.readFileSync(path.join(dest, "regular.txt"), "utf8"), "keep_me");
        assert.ok(!fs.existsSync(path.join(dest, ".hidden.txt")));
        assert.ok(!fs.existsSync(path.join(dest, "._apple_double")));

        // Copy with overwrite = true
        copyDir(src, dest, true);
        assert.equal(fs.readFileSync(path.join(dest, "regular.txt"), "utf8"), "original");
    });

    it("removeDir safely handles non-existent and existing directories", () => {
        const nonExistent = path.join(tempDir, "no-dir");
        removeDir(nonExistent); // should not throw

        const existingDir = path.join(tempDir, "to-remove");
        fs.mkdirSync(existingDir, { recursive: true });
        fs.writeFileSync(path.join(existingDir, "file.txt"), "hello");
        assert.ok(fs.existsSync(existingDir));

        removeDir(existingDir);
        assert.ok(!fs.existsSync(existingDir));
    });

    it("readManifest and writeManifest handle valid, corrupt, and missing files", () => {
        const manifestPath = path.join(tempDir, "manifest.json");

        // Missing
        assert.equal(readManifest(manifestPath), null);

        // Write and read valid
        const sample = { target: "cline", skills: ["a", "b"] };
        writeManifest(manifestPath, sample);
        assert.deepEqual(readManifest(manifestPath), sample);

        // Corrupt
        fs.writeFileSync(manifestPath, "{ corrupted json");
        assert.equal(readManifest(manifestPath), null);
    });

    it("initializes .opow directory with specs, changes, archive, plans, and templates", () => {
        const opowInfo = syncOpenSpec(tempDir);

        assert.ok(fs.existsSync(opowInfo.specsDir));
        assert.ok(fs.existsSync(opowInfo.changesDir));
        assert.ok(fs.existsSync(opowInfo.archiveDir));
        assert.ok(fs.existsSync(opowInfo.plansDir));
        assert.ok(fs.existsSync(opowInfo.templatesDir));
        assert.ok(fs.existsSync(path.join(opowInfo.templatesDir, "proposal.md")));
        assert.ok(fs.existsSync(path.join(opowInfo.templatesDir, "delta.spec.md")));
    });

    it("syncOpenSpec handles non-existent templates source gracefully", () => {
        const origExistsSync = fs.existsSync;
        try {
            fs.existsSync = (p) => {
                if (typeof p === "string" && p.includes("templates") && p.includes("openspec")) return false;
                return origExistsSync(p);
            };
            const opowInfo = syncOpenSpec(tempDir);
            assert.ok(fs.existsSync(opowInfo.specsDir));
            assert.ok(fs.existsSync(opowInfo.plansDir));
            assert.equal(opowInfo.hasTemplates, false);
        } finally {
            fs.existsSync = origExistsSync;
        }
    });

    it("syncTargetSkills throws error when skills sourceDir does not exist", () => {
        const origExistsSync = fs.existsSync;
        try {
            fs.existsSync = (p) => {
                if (typeof p === "string" && p.includes("skills")) return false;
                return origExistsSync(p);
            };
            assert.throws(() => syncTargetSkills(TARGETS.cline, tempDir), {
                message: /Skills source not found:/,
            });
        } finally {
            fs.existsSync = origExistsSync;
        }
    });

    it("syncTargetSkills functions when custom skills or workflows source directories do not exist", () => {
        const origExistsSync = fs.existsSync;
        try {
            fs.existsSync = (p) => {
                if (typeof p === "string" && (p.includes("templates/workflows") || p.includes("skills/using-superpowers"))) {
                    return false;
                }
                return origExistsSync(p);
            };
            const manifest = syncTargetSkills(TARGETS.cline, tempDir);
            assert.ok(manifest.skills.length > 0);
        } finally {
            fs.existsSync = origExistsSync;
        }
    });

    it("installs and uninstalls Cline target (.cline/skills, .clinerules/workflows, manifest)", () => {
        const manifest = syncTargetSkills(TARGETS.cline, tempDir);

        assert.equal(manifest.target, "cline");
        assert.ok(manifest.skills.includes("using-superpowers"));
        assert.ok(manifest.skills.includes("openspec-sync"));
        assert.ok(manifest.workflows.includes("spec"));
        assert.ok(manifest.workflows.includes("sync-spec"));

        const skillsDir = TARGETS.cline.getSkillsDir(tempDir);
        const workflowsDir = TARGETS.cline.getWorkflowsDir(tempDir);
        const manifestPath = TARGETS.cline.getManifestPath(tempDir);

        assert.ok(fs.existsSync(skillsDir));
        assert.ok(fs.existsSync(workflowsDir));
        assert.ok(fs.existsSync(manifestPath));
        assert.ok(fs.existsSync(path.join(workflowsDir, "sync-spec.md")));

        const wrapperContent = fs.readFileSync(path.join(skillsDir, "using-superpowers", "SKILL.md"), "utf8");
        assert.ok(wrapperContent.includes("Platform Adaptation: Cline"));

        const removed = uninstallTargetSkills(TARGETS.cline, tempDir);
        assert.ok(removed.skills.length > 0);
        assert.ok(!fs.existsSync(manifestPath));
        assert.ok(!fs.existsSync(skillsDir));
        assert.ok(!fs.existsSync(workflowsDir));
    });

    it("installs and uninstalls Antigravity target (.agent/skills, .agent/workflows, manifest)", () => {
        const manifest = syncTargetSkills(TARGETS.antigravity, tempDir);

        assert.equal(manifest.target, "antigravity");
        assert.ok(manifest.skills.includes("using-superpowers"));
        assert.ok(manifest.skills.includes("openspec-sync"));
        assert.ok(manifest.workflows.includes("spec"));
        assert.ok(manifest.workflows.includes("sync-spec"));

        const skillsDir = TARGETS.antigravity.getSkillsDir(tempDir);
        const workflowsDir = TARGETS.antigravity.getWorkflowsDir(tempDir);
        const manifestPath = TARGETS.antigravity.getManifestPath(tempDir);

        assert.ok(fs.existsSync(skillsDir));
        assert.ok(fs.existsSync(workflowsDir));
        assert.ok(fs.existsSync(manifestPath));
        assert.ok(fs.existsSync(path.join(workflowsDir, "sync-spec.md")));

        const wrapperContent = fs.readFileSync(path.join(skillsDir, "using-superpowers", "SKILL.md"), "utf8");
        assert.ok(wrapperContent.includes("Platform Adaptation: Antigravity"));

        const removed = uninstallTargetSkills(TARGETS.antigravity, tempDir);
        assert.ok(removed.skills.length > 0);
        assert.ok(!fs.existsSync(manifestPath));
        assert.ok(!fs.existsSync(skillsDir));
        assert.ok(!fs.existsSync(workflowsDir));
    });

    it("installs and uninstalls Claude Code target (.claude/skills, .claude/commands, manifest)", () => {
        const manifest = syncTargetSkills(TARGETS.claude, tempDir);

        assert.equal(manifest.target, "claude");
        assert.ok(manifest.skills.includes("using-superpowers"));
        assert.ok(manifest.skills.includes("test-driven-development"));
        assert.ok(manifest.skills.includes("spec-driven-development"));
        assert.ok(manifest.skills.includes("openspec-sync"));
        assert.ok(manifest.workflows.includes("spec"));
        assert.ok(manifest.workflows.includes("plan"));
        assert.ok(manifest.workflows.includes("implement"));
        assert.ok(manifest.workflows.includes("verify"));
        assert.ok(manifest.workflows.includes("sync-spec"));

        // Verify filesystem
        const skillsDir = TARGETS.claude.getSkillsDir(tempDir);
        const commandsDir = TARGETS.claude.getWorkflowsDir(tempDir);
        const manifestPath = TARGETS.claude.getManifestPath(tempDir);

        assert.ok(fs.existsSync(skillsDir));
        assert.ok(fs.existsSync(commandsDir));
        assert.ok(fs.existsSync(manifestPath));
        assert.ok(fs.existsSync(path.join(commandsDir, "spec.md")));
        assert.ok(fs.existsSync(path.join(commandsDir, "plan.md")));
        assert.ok(fs.existsSync(path.join(commandsDir, "sync-spec.md")));

        // Verify Claude wrapper content was copied
        const wrapperContent = fs.readFileSync(path.join(skillsDir, "using-superpowers", "SKILL.md"), "utf8");
        assert.ok(wrapperContent.includes("Platform Adaptation: Claude Code"));

        // Test uninstall
        const removed = uninstallTargetSkills(TARGETS.claude, tempDir);
        assert.ok(removed.skills.length > 0);
        assert.ok(!fs.existsSync(manifestPath));
        assert.ok(!fs.existsSync(skillsDir));
        assert.ok(!fs.existsSync(commandsDir));
    });

    it("installs and uninstalls Codex target (.codex/skills, .codex/workflows, manifest)", () => {
        const manifest = syncTargetSkills(TARGETS.codex, tempDir);

        assert.equal(manifest.target, "codex");
        assert.ok(manifest.skills.includes("using-superpowers"));
        assert.ok(manifest.skills.includes("openspec-sync"));
        assert.ok(manifest.workflows.includes("spec"));
        assert.ok(manifest.workflows.includes("sync-spec"));

        // Verify filesystem
        const skillsDir = TARGETS.codex.getSkillsDir(tempDir);
        const workflowsDir = TARGETS.codex.getWorkflowsDir(tempDir);
        const manifestPath = TARGETS.codex.getManifestPath(tempDir);

        assert.ok(fs.existsSync(skillsDir));
        assert.ok(fs.existsSync(workflowsDir));
        assert.ok(fs.existsSync(manifestPath));
        assert.ok(fs.existsSync(path.join(workflowsDir, "spec.md")));
        assert.ok(fs.existsSync(path.join(workflowsDir, "sync-spec.md")));

        // Verify Codex wrapper content was copied
        const wrapperContent = fs.readFileSync(path.join(skillsDir, "using-superpowers", "SKILL.md"), "utf8");
        assert.ok(wrapperContent.includes("Platform Adaptation: Codex"));

        // Test uninstall
        const removed = uninstallTargetSkills(TARGETS.codex, tempDir);
        assert.ok(removed.skills.length > 0);
        assert.ok(!fs.existsSync(manifestPath));
        assert.ok(!fs.existsSync(skillsDir));
        assert.ok(!fs.existsSync(workflowsDir));
    });

    it("uninstallTargetSkills throws when manifest is missing or invalid", () => {
        assert.throws(() => uninstallTargetSkills(TARGETS.cline, tempDir), {
            message: /No manifest found for Cline at/,
        });

        // Corrupt manifest
        const manifestPath = TARGETS.cline.getManifestPath(tempDir);
        writeManifest(manifestPath, { invalid: "data" });
        assert.throws(() => uninstallTargetSkills(TARGETS.cline, tempDir), {
            message: /No manifest found for Cline at/,
        });
    });

    it("uninstallTargetSkills handles directory cleanup edge cases gracefully", () => {
        syncTargetSkills(TARGETS.cline, tempDir);

        // Add a non-superpower extra file in the skills directory to make rmdirSync not remove it
        const skillsDir = TARGETS.cline.getSkillsDir(tempDir);
        fs.writeFileSync(path.join(skillsDir, "custom-extra.txt"), "keep");

        uninstallTargetSkills(TARGETS.cline, tempDir);
        assert.ok(fs.existsSync(skillsDir)); // kept because not empty

        // Clean up
        fs.rmSync(skillsDir, { recursive: true, force: true });
    });

    it("uninstallTargetSkills handles rmdirSync throwing gracefully", () => {
        syncTargetSkills(TARGETS.cline, tempDir);
        const origRmdirSync = fs.rmdirSync;
        try {
            fs.rmdirSync = () => {
                throw new Error("EPERM: permission denied");
            };
            // Should catch and not throw
            uninstallTargetSkills(TARGETS.cline, tempDir);
        } finally {
            fs.rmdirSync = origRmdirSync;
        }
    });

    it("uninstallTargetSkills handles manifest with missing workflows field", () => {
        const manifestPath = TARGETS.cline.getManifestPath(tempDir);
        writeManifest(manifestPath, {
            target: "cline",
            skills: ["dummy-skill"],
        });
        const removed = uninstallTargetSkills(TARGETS.cline, tempDir);
        assert.deepEqual(removed.workflows, []);
    });
});
