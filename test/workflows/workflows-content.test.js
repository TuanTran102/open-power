const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("workflows / slash commands", () => {
    const workflowsDir = path.join(__dirname, "../../src/templates/workflows");

    it("contains all 6 standard workflows", () => {
        const requiredWorkflows = [
            "explore.md",
            "spec.md",
            "plan.md",
            "implement.md",
            "archive.md",
            "sync-spec.md",
        ];
        for (const wf of requiredWorkflows) {
            const wfPath = path.join(workflowsDir, wf);
            assert.ok(fs.existsSync(wfPath), `Missing workflow: ${wf}`);
        }
        assert.ok(!fs.existsSync(path.join(workflowsDir, "verify.md")), "verify.md should be merged into implement.md");
    });

    it("archive workflow describes merging delta specs to living specs", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "archive.md"), "utf8");
        assert.ok(content.includes(".opow/archive/"));
        assert.ok(content.includes(".opow/specs/"));
    });

    it("archive workflow guides moving plan from .opow/plans/ to .opow/archive/", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "archive.md"), "utf8");
        assert.ok(
            content.includes(".opow/plans/") && (content.includes(".opow/archive/") || content.includes("plan.md")),
            "archive.md should instruct moving .opow/plans/ into .opow/archive/"
        );
    });

    it("spec workflow instructs creating changes folder and delta specs", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "spec.md"), "utf8");
        assert.ok(content.includes(".opow/changes/"));
        assert.ok(content.includes("proposal.md"));
        assert.ok(content.includes("tasks.md"));
    });

    it("spec workflow guides codebase exploration and openspec-explore", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "spec.md"), "utf8");
        assert.ok(content.includes("openspec-explore"));
        assert.ok(content.toLowerCase().includes("codebase"));
    });

    it("implement workflow guides isolated Git Worktree setup and final verification gate", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "implement.md"), "utf8");
        assert.ok(content.includes("using-git-worktrees"));
        assert.ok(content.includes(".worktrees/"));
        assert.ok(content.includes("verification-before-completion"));
        assert.ok(content.includes("/archive"));
    });

    it("spec workflow guides capturing concrete file paths into design.md and tasks.md", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "spec.md"), "utf8");
        assert.ok(
            content.includes("Affected Files & Context Manifest") || content.includes("concrete file paths"),
            "spec.md should guide capturing concrete file paths into design.md"
        );
        assert.ok(
            content.includes("tasks.md") && (content.includes("concrete file") || content.includes("target file") || content.includes("file link")),
            "spec.md should guide binding tasks.md to concrete files"
        );
    });

    it("plan workflow mandates inheriting explicit file links from tasks.md", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "plan.md"), "utf8");
        assert.ok(
            content.includes("file link") || content.includes("concrete file") || content.includes("file path"),
            "plan.md should mandate inheriting explicit file links from tasks.md"
        );
    });

    it("implement workflow enforces bounded context handoff for subagents", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "implement.md"), "utf8");
        assert.ok(
            content.includes("target file") || content.includes("Target File"),
            "implement.md should specify providing target file to subagents"
        );
        assert.ok(
            content.includes("test file") || content.includes("Test File"),
            "implement.md should specify providing test file to subagents"
        );
        assert.ok(
            content.includes("forbid") || content.includes("prohibit") || content.includes("DO NOT") || content.includes("never"),
            "implement.md should forbid unconstrained repo grepping"
        );
        assert.ok(
            content.includes("grep") || content.includes("unconstrained") || content.includes("repo search"),
            "implement.md should explicitly call out unconstrained searching/grepping"
        );
    });

    it("archive workflow guides merging branch and cleaning up worktree", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "archive.md"), "utf8");
        assert.ok(content.includes("worktree remove"));
        assert.ok(content.includes(".worktrees/"));
    });

    it("archive workflow guides updating user documentation and README", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "archive.md"), "utf8");
        assert.ok(content.includes("README.md"));
        assert.ok(content.includes("user guides") || content.includes("User Documentation"));
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

    it("spec workflow selectively reads .opow/specs/ and Key Files before auditing codebase", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "spec.md"), "utf8");
        assert.ok(content.includes(".opow/specs/"), "spec.md should instruct listing/reading .opow/specs/");
        assert.ok(content.includes("NOT") && content.toLowerCase().includes("all specs"), "spec.md should warn against reading all specs blindly");
        assert.ok(content.includes("Key Files"), "spec.md should use Key Files as baseline before auditing codebase");
    });

    it("explore workflow checks .opow/specs/ first before grepping codebase", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "explore.md"), "utf8");
        assert.ok(content.includes(".opow/specs/"), "explore.md should instruct checking .opow/specs/ first");
        assert.ok(content.includes("Key Files"), "explore.md should reference Key Files / Code Map");
    });

    it("archive workflow reads design.md Context Manifest and syncs Key Files into .opow/specs/", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "archive.md"), "utf8");
        assert.ok(content.includes("design.md") && content.includes("Context Manifest"), "archive.md should read design.md Context Manifest");
        assert.ok(content.includes("Key Files"), "archive.md should sync Key Files into .opow/specs/");
    });

    it("explore and spec workflows instruct progressive reading for large specs (>200 lines)", () => {
        const exploreContent = fs.readFileSync(path.join(workflowsDir, "explore.md"), "utf8");
        assert.ok(exploreContent.includes("200 lines") && exploreContent.includes("grep"), "explore.md should instruct progressive reading for large specs");
        const specContent = fs.readFileSync(path.join(workflowsDir, "spec.md"), "utf8");
        assert.ok(specContent.includes("200 lines") && specContent.includes("grep"), "spec.md should instruct progressive reading for large specs");
    });
});



