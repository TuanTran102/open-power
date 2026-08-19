const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { TARGETS } = require("../../src/lib/targets");
const { syncTargetSkills, syncOpenSpec, uninstallTargetSkills, readManifest } = require("../../src/lib/sync");
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

    it("initializes .opow directory with specs templates and plans", () => {
        const opowInfo = syncOpenSpec(tempDir);

        assert.ok(fs.existsSync(opowInfo.specsDir));
        assert.ok(fs.existsSync(opowInfo.plansDir));
        assert.ok(fs.existsSync(path.join(opowInfo.specsDir, "templates", "feature.spec.md")));
    });

    it("installs and uninstalls Claude Code target (.claude/skills, .claude/commands, manifest)", () => {
        const manifest = syncTargetSkills(TARGETS.claude, tempDir);

        assert.equal(manifest.target, "claude");
        assert.ok(manifest.skills.includes("using-superpowers"));
        assert.ok(manifest.skills.includes("test-driven-development"));
        assert.ok(manifest.skills.includes("spec-driven-development"));
        assert.ok(manifest.workflows.includes("spec"));
        assert.ok(manifest.workflows.includes("plan"));
        assert.ok(manifest.workflows.includes("implement"));
        assert.ok(manifest.workflows.includes("verify"));

        // Verify filesystem
        const skillsDir = TARGETS.claude.getSkillsDir(tempDir);
        const commandsDir = TARGETS.claude.getWorkflowsDir(tempDir);
        const manifestPath = TARGETS.claude.getManifestPath(tempDir);

        assert.ok(fs.existsSync(skillsDir));
        assert.ok(fs.existsSync(commandsDir));
        assert.ok(fs.existsSync(manifestPath));
        assert.ok(fs.existsSync(path.join(commandsDir, "spec.md")));
        assert.ok(fs.existsSync(path.join(commandsDir, "plan.md")));

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
        assert.ok(manifest.workflows.includes("spec"));

        // Verify filesystem
        const skillsDir = TARGETS.codex.getSkillsDir(tempDir);
        const workflowsDir = TARGETS.codex.getWorkflowsDir(tempDir);
        const manifestPath = TARGETS.codex.getManifestPath(tempDir);

        assert.ok(fs.existsSync(skillsDir));
        assert.ok(fs.existsSync(workflowsDir));
        assert.ok(fs.existsSync(manifestPath));
        assert.ok(fs.existsSync(path.join(workflowsDir, "spec.md")));

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
});
