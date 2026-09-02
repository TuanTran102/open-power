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
    hasUserOpowContent,
    removeOpowWorkspace,
    getUpstreamSkillsDir,
    getOpenSpecSkillsDir,
    getVendorMeta,
    getUpstreamCommit,
    ensureGitignore,
    syncTargetRules,
    loadRuleTemplates,
} = require("../../src/lib/sync");

describe("sync & target lifecycle", () => {
    let tempDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opow-test-"));
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("verifies bundled getters and vendor-meta resolution", () => {
        const upstreamDir = getUpstreamSkillsDir();
        assert.ok(fs.existsSync(upstreamDir), "getUpstreamSkillsDir() must exist");

        const openspecDir = getOpenSpecSkillsDir();
        assert.ok(fs.existsSync(openspecDir), "getOpenSpecSkillsDir() must exist");

        const meta = getVendorMeta();
        assert.ok(meta && meta.upstream && meta.upstream.commit);

        const commit = getUpstreamCommit();
        assert.equal(commit, meta.upstream.commit);
    });

    it("copyDir handles non-existent src, overwrite flag, and ignores dot/underscore files", () => {
        const nonExistent = path.join(tempDir, "does-not-exist");
        const dest = path.join(tempDir, "dest");
        copyDir(nonExistent, dest);
        assert.ok(!fs.existsSync(dest));

        const src = path.join(tempDir, "src");
        fs.mkdirSync(src, { recursive: true });
        fs.writeFileSync(path.join(src, "regular.txt"), "original");
        fs.writeFileSync(path.join(src, ".hidden.txt"), "hidden");
        fs.writeFileSync(path.join(src, "._apple_double"), "apple");

        fs.mkdirSync(dest, { recursive: true });
        fs.writeFileSync(path.join(dest, "regular.txt"), "keep_me");
        copyDir(src, dest, false);

        assert.equal(fs.readFileSync(path.join(dest, "regular.txt"), "utf8"), "keep_me");
        assert.ok(!fs.existsSync(path.join(dest, ".hidden.txt")));
        assert.ok(!fs.existsSync(path.join(dest, "._apple_double")));

        copyDir(src, dest, true);
        assert.equal(fs.readFileSync(path.join(dest, "regular.txt"), "utf8"), "original");
    });

    it("removeDir safely handles non-existent and existing directories", () => {
        const nonExistent = path.join(tempDir, "no-dir");
        removeDir(nonExistent);

        const existingDir = path.join(tempDir, "to-remove");
        fs.mkdirSync(existingDir, { recursive: true });
        fs.writeFileSync(path.join(existingDir, "file.txt"), "hello");
        assert.ok(fs.existsSync(existingDir));

        removeDir(existingDir);
        assert.ok(!fs.existsSync(existingDir));
    });

    it("readManifest and writeManifest handle valid, corrupt, and missing files", () => {
        const manifestPath = path.join(tempDir, "manifest.json");

        assert.equal(readManifest(manifestPath), null);

        const sample = { target: "cline", skills: ["a", "b"] };
        writeManifest(manifestPath, sample);
        assert.deepEqual(readManifest(manifestPath), sample);

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
        assert.equal(fs.existsSync(path.join(opowInfo.specsDir, "templates")), false);
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
                if (typeof p === "string" && p.includes("skills/upstream")) return false;
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
                if (typeof p === "string" && (p.includes("templates/workflows") || p.includes("skills/openspec"))) {
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
        assert.ok(manifest.skills.includes("openspec-explore"));
        assert.ok(manifest.skills.includes("brainstorming"));
        assert.ok(manifest.workflows.includes("spec"));
        assert.ok(manifest.workflows.includes("sync-spec"));
        assert.equal(manifest.sourceCommit, getUpstreamCommit());

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
        assert.equal(manifest.sourceCommit, getUpstreamCommit());

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
        assert.equal(manifest.sourceCommit, getUpstreamCommit());

        const skillsDir = TARGETS.claude.getSkillsDir(tempDir);
        const commandsDir = TARGETS.claude.getWorkflowsDir(tempDir);
        const manifestPath = TARGETS.claude.getManifestPath(tempDir);

        assert.ok(fs.existsSync(skillsDir));
        assert.ok(fs.existsSync(commandsDir));
        assert.ok(fs.existsSync(manifestPath));
        assert.ok(fs.existsSync(path.join(commandsDir, "spec.md")));
        assert.ok(fs.existsSync(path.join(commandsDir, "plan.md")));
        assert.ok(fs.existsSync(path.join(commandsDir, "sync-spec.md")));

        const wrapperContent = fs.readFileSync(path.join(skillsDir, "using-superpowers", "SKILL.md"), "utf8");
        assert.ok(wrapperContent.includes("Platform Adaptation: Claude Code"));

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
        assert.equal(manifest.sourceCommit, getUpstreamCommit());

        const skillsDir = TARGETS.codex.getSkillsDir(tempDir);
        const workflowsDir = TARGETS.codex.getWorkflowsDir(tempDir);
        const manifestPath = TARGETS.codex.getManifestPath(tempDir);

        assert.ok(fs.existsSync(skillsDir));
        assert.ok(fs.existsSync(workflowsDir));
        assert.ok(fs.existsSync(manifestPath));
        assert.ok(fs.existsSync(path.join(workflowsDir, "spec.md")));
        assert.ok(fs.existsSync(path.join(workflowsDir, "sync-spec.md")));

        const wrapperContent = fs.readFileSync(path.join(skillsDir, "using-superpowers", "SKILL.md"), "utf8");
        assert.ok(wrapperContent.includes("Platform Adaptation: Codex"));

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

        const manifestPath = TARGETS.cline.getManifestPath(tempDir);
        writeManifest(manifestPath, { invalid: "data" });
        assert.throws(() => uninstallTargetSkills(TARGETS.cline, tempDir), {
            message: /No manifest found for Cline at/,
        });
    });

    it("uninstallTargetSkills handles directory cleanup edge cases gracefully", () => {
        syncTargetSkills(TARGETS.cline, tempDir);

        const skillsDir = TARGETS.cline.getSkillsDir(tempDir);
        fs.writeFileSync(path.join(skillsDir, "custom-extra.txt"), "keep");

        uninstallTargetSkills(TARGETS.cline, tempDir);
        assert.ok(fs.existsSync(skillsDir));

        fs.rmSync(skillsDir, { recursive: true, force: true });
    });

    it("uninstallTargetSkills handles rmdirSync throwing gracefully", () => {
        syncTargetSkills(TARGETS.cline, tempDir);
        const origRmdirSync = fs.rmdirSync;
        try {
            fs.rmdirSync = () => {
                throw new Error("EPERM: permission denied");
            };
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

    it("hasUserOpowContent returns false when .opow is missing, empty, or only contains default templates", () => {
        assert.strictEqual(hasUserOpowContent(tempDir), false);
        syncOpenSpec(tempDir);
        assert.strictEqual(hasUserOpowContent(tempDir), false);

        // Even with ignored files like .DS_Store, .gitkeep, or ._*
        fs.writeFileSync(path.join(tempDir, ".opow", "specs", ".gitkeep"), "");
        fs.writeFileSync(path.join(tempDir, ".opow", ".DS_Store"), "");
        fs.writeFileSync(path.join(tempDir, ".opow", "specs", "._hidden"), "");
        assert.strictEqual(hasUserOpowContent(tempDir), false);
    });

    it("hasUserOpowContent returns true when specs, changes, plans, or archive contain files", () => {
        syncOpenSpec(tempDir);
        fs.writeFileSync(path.join(tempDir, ".opow", "specs", "auth.spec.md"), "test spec");
        assert.strictEqual(hasUserOpowContent(tempDir), true);

        // Reset and test changes folder
        fs.rmSync(path.join(tempDir, ".opow", "specs", "auth.spec.md"));
        assert.strictEqual(hasUserOpowContent(tempDir), false);

        const changeSubDir = path.join(tempDir, ".opow", "changes", "my-change");
        fs.mkdirSync(changeSubDir, { recursive: true });
        fs.writeFileSync(path.join(changeSubDir, "proposal.md"), "my proposal");
        assert.strictEqual(hasUserOpowContent(tempDir), true);
    });

    it("removeOpowWorkspace safely removes .opow directory", () => {
        assert.strictEqual(removeOpowWorkspace(tempDir), false);

        syncOpenSpec(tempDir);
        assert.strictEqual(fs.existsSync(path.join(tempDir, ".opow")), true);
        const removed = removeOpowWorkspace(tempDir);
        assert.strictEqual(removed, true);
        assert.strictEqual(fs.existsSync(path.join(tempDir, ".opow")), false);
    });

    it("ensureGitignore creates .gitignore with default patterns if missing", () => {
        const result = ensureGitignore(tempDir);
        assert.equal(result.created, true);
        assert.equal(result.updated, false);
        assert.equal(result.addedPatterns.length, 8);
        assert.ok(fs.existsSync(result.gitignorePath));
        const content = fs.readFileSync(result.gitignorePath, "utf8");
        assert.ok(content.includes("# Open-Power & AI Agents"));
        assert.ok(content.includes(".opow/"));
        assert.ok(content.includes(".agent/"));
        assert.ok(content.includes(".cline/"));
        assert.ok(content.includes(".clinerules/"));
        assert.ok(content.includes(".claude/"));
        assert.ok(content.includes(".codex/"));
        assert.ok(content.includes(".superpowers/"));
        assert.ok(content.includes(".worktrees/"));
    });

    it("ensureGitignore appends only missing patterns and preserves existing content", () => {
        const gitignorePath = path.join(tempDir, ".gitignore");
        fs.writeFileSync(gitignorePath, "node_modules/\n.env\n.opow/\n");

        const result = ensureGitignore(tempDir);
        assert.equal(result.created, false);
        assert.equal(result.updated, true);
        assert.equal(result.addedPatterns.includes(".opow/"), false);
        assert.ok(result.addedPatterns.includes(".agent/"));
        assert.ok(result.addedPatterns.includes(".worktrees/"));

        const content = fs.readFileSync(gitignorePath, "utf8");
        assert.ok(content.startsWith("node_modules/\n.env\n.opow/\n"));
        assert.ok(content.includes(".agent/"));
        assert.ok(content.includes(".worktrees/"));
    });

    it("ensureGitignore does nothing when all patterns already exist", () => {
        ensureGitignore(tempDir);
        const result = ensureGitignore(tempDir);
        assert.equal(result.created, false);
        assert.equal(result.updated, false);
        assert.deepEqual(result.addedPatterns, []);
    });

    it("syncTargetRules creates rule file with 'be brief' for each target when file does not exist", () => {
        for (const target of [TARGETS.cline, TARGETS.antigravity, TARGETS.claude, TARGETS.codex]) {
            const result = syncTargetRules(target, tempDir);
            assert.equal(result.created, true);
            assert.equal(result.updated, false);
            assert.ok(fs.existsSync(result.rulePath));
            const content = fs.readFileSync(result.rulePath, "utf8");
            assert.match(content, /\bbe brief\b/i);
            if (target.id === "antigravity") {
                assert.ok(content.includes("alwaysApply: true"));
                assert.ok(content.includes("globs:"));
            } else {
                assert.ok(!content.includes("alwaysApply: true"));
            }
        }
    });

    it("syncTargetRules appends 'be brief' to existing rule files preserving prior contents", () => {
        const claudeRulePath = TARGETS.claude.getRulePath(tempDir);
        fs.writeFileSync(claudeRulePath, "# Custom Guidelines\n- Always write tests\n");

        const result = syncTargetRules(TARGETS.claude, tempDir);
        assert.equal(result.created, false);
        assert.equal(result.updated, true);

        const content = fs.readFileSync(claudeRulePath, "utf8");
        assert.ok(content.startsWith("# Custom Guidelines\n- Always write tests\n"));
        assert.match(content, /\bbe brief\b/i);
    });

    it("syncTargetRules does nothing if 'be brief' rule is already present", () => {
        syncTargetRules(TARGETS.cline, tempDir);
        const result = syncTargetRules(TARGETS.cline, tempDir);
        assert.equal(result.created, false);
        assert.equal(result.updated, false);
    });

    it("syncTargetRules handles null/invalid target gracefully", () => {
        const result = syncTargetRules(null, tempDir);
        assert.deepEqual(result, { rulePath: null, created: false, updated: false, syncedRules: [] });
    });

    it("loadRuleTemplates loads all markdown templates from default rules directory", () => {
        const templates = loadRuleTemplates();
        assert.ok(Array.isArray(templates));
        assert.ok(templates.length >= 1);
        const brief = templates.find((t) => t.name === "brief" || t.filename === "brief.md");
        assert.ok(brief, "brief.md template must be found");
        assert.match(brief.content, /\bbe brief\b/i);
    });

    it("loadRuleTemplates returns empty array when directory does not exist", () => {
        const templates = loadRuleTemplates(path.join(tempDir, "non-existent"));
        assert.deepEqual(templates, []);
    });

    it("syncTargetRules syncs multiple templates to Antigravity directory as individual files", () => {
        const customRulesDir = path.join(tempDir, "custom-rules");
        fs.mkdirSync(customRulesDir, { recursive: true });
        fs.writeFileSync(path.join(customRulesDir, "brief.md"), "# Brief\nbe brief\n");
        fs.writeFileSync(path.join(customRulesDir, "tdd.md"), "# TDD\nalways test first\n");

        const targetDir = path.join(tempDir, "target-project");
        const result = syncTargetRules(TARGETS.antigravity, targetDir, { rulesDir: customRulesDir });
        assert.ok(result.created);
        assert.deepEqual(result.syncedRules.sort(), ["brief", "tdd"]);

        assert.ok(fs.existsSync(path.join(targetDir, ".agent", "rules", "brief.md")));
        assert.ok(fs.existsSync(path.join(targetDir, ".agent", "rules", "tdd.md")));
        assert.match(fs.readFileSync(path.join(targetDir, ".agent", "rules", "tdd.md"), "utf8"), /always test first/);
    });

    it("syncTargetRules appends multiple missing templates to single-file target", () => {
        const customRulesDir = path.join(tempDir, "custom-rules");
        fs.mkdirSync(customRulesDir, { recursive: true });
        fs.writeFileSync(path.join(customRulesDir, "brief.md"), "# Brief\nbe brief\n");
        fs.writeFileSync(path.join(customRulesDir, "tdd.md"), "# TDD\nalways test first\n");

        const targetDir = path.join(tempDir, "target-project");
        fs.mkdirSync(targetDir, { recursive: true });
        const codexPath = TARGETS.codex.getRulePath(targetDir);
        fs.writeFileSync(codexPath, "# Existing Guidelines\n");

        const result = syncTargetRules(TARGETS.codex, targetDir, { rulesDir: customRulesDir });
        assert.ok(result.updated);
        assert.deepEqual(result.syncedRules.sort(), ["brief", "tdd"]);

        const content = fs.readFileSync(codexPath, "utf8");
        assert.ok(content.startsWith("# Existing Guidelines\n"));
        assert.match(content, /be brief/);
        assert.match(content, /always test first/);
    });
});
