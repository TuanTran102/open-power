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

    it("spec workflow guides using Pencil MCP for UI-related changes", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "spec.md"), "utf8");
        assert.ok(content.toLowerCase().includes("pencil"));
        assert.ok(content.includes(".pen"));
    });

    it("spec workflow guides codebase exploration and openspec-explore", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "spec.md"), "utf8");
        assert.ok(content.includes("openspec-explore"));
        assert.ok(content.toLowerCase().includes("codebase"));
    });

    it("implement workflow guides isolated Git Worktree setup", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "implement.md"), "utf8");
        assert.ok(content.includes("using-git-worktrees"));
        assert.ok(content.includes(".worktrees/"));
    });

    it("archive workflow guides merging branch and cleaning up worktree", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "archive.md"), "utf8");
        assert.ok(content.includes("worktree remove"));
        assert.ok(content.includes(".worktrees/"));
    });

    it("spec workflow guides halting and notifying user when Pencil MCP is unavailable", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "spec.md"), "utf8");
        assert.ok(content.toLowerCase().includes("pencil"));
        assert.ok(content.toLowerCase().includes("unavailable") || content.toLowerCase().includes("fails"));
        assert.ok(content.toLowerCase().includes("halt") || content.toLowerCase().includes("wait"));
    });

    it("workflows enforce timestamp-prefixed naming convention YYYYMMDDHHmmss-<slug> and audit trail", () => {
        const specContent = fs.readFileSync(path.join(workflowsDir, "spec.md"), "utf8");
        assert.ok(specContent.includes("YYYYMMDDHHmmss"), "spec.md should guide YYYYMMDDHHmmss timestamp-prefixed change IDs");

        const planContent = fs.readFileSync(path.join(workflowsDir, "plan.md"), "utf8");
        assert.ok(planContent.includes("YYYYMMDDHHmmss"), "plan.md should reference YYYYMMDDHHmmss plan naming");

        const archiveContent = fs.readFileSync(path.join(workflowsDir, "archive.md"), "utf8");
        assert.ok(
            archiveContent.includes("Changelog") || archiveContent.includes("changelog"),
            "archive.md should guide updating living spec changelog"
        );
    });
});



