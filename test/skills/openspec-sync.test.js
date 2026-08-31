const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("skills / openspec-sync", () => {
    const skillPath = path.join(__dirname, "../../src/skills/openspec/openspec-sync/SKILL.md");

    it("validates openspec-sync skill exists and has correct metadata", () => {
        assert.ok(fs.existsSync(skillPath), "Missing openspec-sync/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes("name: openspec-sync"));
        assert.ok(content.includes("description:"));
    });

    it("validates openspec-sync instructions contain drift detection, Mode A, and Mode B", () => {
        assert.ok(fs.existsSync(skillPath), "Missing openspec-sync/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes("Git diff") || content.includes("git diff"));
        assert.ok(content.includes("drift") || content.includes("Drift"));
        assert.ok(content.includes(".opow/changes/"));
        assert.ok(content.includes(".opow/specs/"));
        assert.ok(content.includes("Mode A") || content.includes("Proposal"));
        assert.ok(content.includes("Mode B") || content.includes("Direct Sync"));
    });
});
