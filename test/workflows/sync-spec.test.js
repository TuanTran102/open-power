const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("workflows / opow-sync-spec", () => {
    const wfPath = path.join(__dirname, "../../src/templates/workflows/opow-sync-spec.md");

    it("validates opow-sync-spec workflow exists and has description frontmatter", () => {
        assert.ok(fs.existsSync(wfPath), "Missing src/templates/workflows/opow-sync-spec.md");
        const content = fs.readFileSync(wfPath, "utf8");
        assert.ok(content.startsWith("---"));
        assert.ok(content.includes("description:"));
    });

    it("validates opow-sync-spec workflow invokes opow-openspec-sync and references opow directories", () => {
        assert.ok(fs.existsSync(wfPath), "Missing src/templates/workflows/opow-sync-spec.md");
        const content = fs.readFileSync(wfPath, "utf8");
        assert.ok(content.includes("opow-openspec-sync"));
        assert.ok(content.includes(".opow/specs/"));
        assert.ok(content.includes(".opow/changes/"));
    });
});
