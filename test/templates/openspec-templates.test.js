const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("templates / openspec", () => {
    const templatesDir = path.join(__dirname, "../../src/templates/openspec/templates");

    it("contains all required OpenSpec template files", () => {
        const requiredFiles = [
            "proposal.md",
            "design.md",
            "tasks.md",
            "delta.spec.md",
            "living.spec.md",
        ];
        for (const file of requiredFiles) {
            const filePath = path.join(templatesDir, file);
            assert.ok(fs.existsSync(filePath), `Missing template: ${file}`);
            const content = fs.readFileSync(filePath, "utf8");
            assert.ok(content.length > 50, `Template ${file} is too short`);
        }
    });

    it("delta.spec.md contains ADDED, MODIFIED, and REMOVED sections", () => {
        const content = fs.readFileSync(path.join(templatesDir, "delta.spec.md"), "utf8");
        assert.ok(content.includes("### ADDED Requirements"));
        assert.ok(content.includes("### MODIFIED Requirements"));
        assert.ok(content.includes("### REMOVED Requirements"));
    });

    it("design.md template contains UI Wireframes and .pen design section", () => {
        const content = fs.readFileSync(path.join(templatesDir, "design.md"), "utf8");
        assert.ok(content.includes("UI"));
        assert.ok(content.includes(".pen"));
    });

    it("templates contain standardized YAML frontmatter metadata", () => {
        const changeTemplates = ["proposal.md", "design.md", "tasks.md", "delta.spec.md"];
        for (const file of changeTemplates) {
            const content = fs.readFileSync(path.join(templatesDir, file), "utf8");
            assert.match(content, /^---\n[\s\S]*?change_id:/, `${file} missing change_id in YAML frontmatter`);
            assert.match(content, /created_at:/, `${file} missing created_at in YAML frontmatter`);
            assert.match(content, /status:/, `${file} missing status in YAML frontmatter`);
        }

        const livingSpecContent = fs.readFileSync(path.join(templatesDir, "living.spec.md"), "utf8");
        assert.match(livingSpecContent, /^---\n[\s\S]*?domain:/, "living.spec.md missing domain in YAML frontmatter");
        assert.match(livingSpecContent, /Changelog|History/, "living.spec.md missing Changelog section for auditability");
    });
});
