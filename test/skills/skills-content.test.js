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
    });

    it("validates spec-driven-development skill includes UI visual design with Pencil MCP", () => {
        const skillPath = path.join(__dirname, "../../src/skills/openspec/spec-driven-development/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.toLowerCase().includes("pencil"));
        assert.ok(content.includes(".pen"));
    });
});
