const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("workflows / slash commands", () => {
    const workflowsDir = path.join(__dirname, "../../src/templates/workflows");

    it("contains all 7 standard workflows", () => {
        const requiredWorkflows = [
            "explore.md",
            "spec.md",
            "plan.md",
            "implement.md",
            "verify.md",
            "archive.md",
            "sync-spec.md",
        ];
        for (const wf of requiredWorkflows) {
            const wfPath = path.join(workflowsDir, wf);
            assert.ok(fs.existsSync(wfPath), `Missing workflow: ${wf}`);
        }
    });

    it("archive workflow describes merging delta specs to living specs", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "archive.md"), "utf8");
        assert.ok(content.includes(".opow/archive/"));
        assert.ok(content.includes(".opow/specs/"));
    });

    it("spec workflow instructs creating changes folder and delta specs", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "spec.md"), "utf8");
        assert.ok(content.includes(".opow/changes/"));
        assert.ok(content.includes("proposal.md"));
        assert.ok(content.includes("tasks.md"));
    });
});
