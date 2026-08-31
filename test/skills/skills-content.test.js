const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("skills / content validation", () => {
    it("validates openspec-explore skill exists and has correct metadata", () => {
        const skillPath = path.join(__dirname, "../../src/skills/openspec/openspec-explore/SKILL.md");
        assert.ok(fs.existsSync(skillPath), "Missing openspec-explore/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes("name: openspec-explore"));
        assert.ok(content.includes("codebase"));
        assert.ok(content.includes("Delta Spec"));
    });

    it("validates spec-driven-development skill includes lifecycle & delta specs", () => {
        const skillPath = path.join(__dirname, "../../src/skills/openspec/spec-driven-development/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes(".opow/changes/"));
        assert.ok(content.includes(".opow/archive/"));
        assert.ok(content.includes("ADDED"));
        assert.ok(content.includes("MODIFIED"));
        assert.ok(content.includes("REMOVED"));
        assert.ok(content.includes("YYYYMMDDHHmmss"), "spec-driven-development should document YYYYMMDDHHmmss-<slug> naming");
        assert.ok(content.includes("frontmatter") || content.includes("change_id:"), "spec-driven-development should document YAML frontmatter");
    });

    it("validates spec-driven-development skill includes UI visual design with Pencil MCP", () => {
        const skillPath = path.join(__dirname, "../../src/skills/openspec/spec-driven-development/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.toLowerCase().includes("pencil"));
        assert.ok(content.includes(".pen"));
    });

    it("validates spec-driven-development skill includes 5-step development loop", () => {
        const skillPath = path.join(__dirname, "../../src/skills/openspec/spec-driven-development/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes("5-Step Development Loop") || content.includes("5-Step"));
        assert.ok(content.includes("openspec-explore"));
    });

    it("validates designing-with-pencil skill exists and has correct metadata", () => {
        const skillPath = path.join(__dirname, "../../src/skills/openspec/designing-with-pencil/SKILL.md");
        assert.ok(fs.existsSync(skillPath), "Missing designing-with-pencil/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes("name: designing-with-pencil"));
        assert.ok(content.includes(".pen"));
        assert.ok(content.includes("Pencil MCP"));
        assert.ok(content.includes("antigravity-ide"));
        assert.ok(content.includes("execute"));
    });

    it("validates subagent-driven-development hands off to /verify for OpenSpec plans", () => {
        const skillPath = path.join(__dirname, "../../src/skills/upstream/subagent-driven-development/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes("/verify"), "subagent-driven-development should reference /verify");
        assert.ok(content.includes("OpenSpec") || content.includes(".opow"), "subagent-driven-development should reference OpenSpec/.opow");
    });

    it("validates executing-plans hands off to /verify for OpenSpec plans", () => {
        const skillPath = path.join(__dirname, "../../src/skills/upstream/executing-plans/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes("/verify"), "executing-plans should reference /verify");
        assert.ok(content.includes("OpenSpec") || content.includes(".opow"), "executing-plans should reference OpenSpec/.opow");
    });

    it("validates finishing-a-development-branch references OpenSpec /archive deferral", () => {
        const skillPath = path.join(__dirname, "../../src/skills/upstream/finishing-a-development-branch/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes("/archive"), "finishing-a-development-branch should reference /archive");
        assert.ok(content.includes("OpenSpec") || content.includes(".opow"), "finishing-a-development-branch should reference OpenSpec/.opow");
    });
});

