const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("workflows / slash commands", () => {
    const workflowsDir = path.join(__dirname, "../../src/templates/workflows");

    it("contains all 7 standard opow-prefixed workflows", () => {
        const requiredWorkflows = [
            "opow-explore.md",
            "opow-spec.md",
            "opow-plan.md",
            "opow-implement.md",
            "opow-archive.md",
            "opow-fast.md",
            "opow-sync-spec.md",
        ];
        for (const wf of requiredWorkflows) {
            const wfPath = path.join(workflowsDir, wf);
            assert.ok(fs.existsSync(wfPath), `Missing workflow: ${wf}`);
        }
        assert.ok(!fs.existsSync(path.join(workflowsDir, "verify.md")), "verify.md should be merged into opow-implement.md");
        assert.ok(!fs.existsSync(path.join(workflowsDir, "fix.md")), "fix.md should be renamed to opow-fast.md");
        assert.ok(!fs.existsSync(path.join(workflowsDir, "spec.md")), "unprefixed spec.md should not exist");
    });

    it("archive workflow describes merging delta specs to living specs", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "opow-archive.md"), "utf8");
        assert.ok(content.includes(".opow/archive/"));
        assert.ok(content.includes(".opow/specs/"));
    });

    it("archive workflow moves change folder including enriched tasks.md without .opow/plans/", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "opow-archive.md"), "utf8");
        assert.ok(
            content.includes(".opow/changes/") && content.includes("tasks.md") && content.includes(".opow/archive/"),
            "opow-archive.md should instruct moving .opow/changes/ (including tasks.md) into .opow/archive/"
        );
        assert.ok(!content.includes(".opow/plans/"), "opow-archive.md should not reference .opow/plans/");
    });

    it("spec workflow instructs creating changes folder and delta specs", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "opow-spec.md"), "utf8");
        assert.ok(content.includes(".opow/changes/"));
        assert.ok(content.includes("proposal.md"));
        assert.ok(content.includes("tasks.md"));
    });

    it("spec workflow guides codebase exploration and opow-openspec-explore", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "opow-spec.md"), "utf8");
        assert.ok(content.includes("opow-openspec-explore"));
        assert.ok(content.toLowerCase().includes("codebase"));
    });

    it("implement workflow guides isolated Git Worktree setup and final verification gate", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "opow-implement.md"), "utf8");
        assert.ok(content.includes("opow-using-git-worktrees"));
        assert.ok(content.includes(".worktrees/"));
        assert.ok(content.includes("opow-verification-before-completion"));
        assert.ok(content.includes("/opow-archive"));
    });

    it("spec workflow guides capturing concrete file paths into design.md and tasks.md", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "opow-spec.md"), "utf8");
        assert.ok(
            content.includes("Affected Files & Context Manifest") || content.includes("concrete file paths"),
            "opow-spec.md should guide capturing concrete file paths into design.md"
        );
        assert.ok(
            content.includes("tasks.md") && (content.includes("concrete file") || content.includes("target file") || content.includes("file link")),
            "opow-spec.md should guide binding tasks.md to concrete files"
        );
    });

    it("plan workflow mandates enriching tasks.md in-place with explicit file links and no .opow/plans/", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "opow-plan.md"), "utf8");
        assert.ok(
            content.includes("file link") || content.includes("concrete file") || content.includes("file path"),
            "opow-plan.md should mandate inheriting explicit file links from tasks.md"
        );
        assert.ok(content.includes("tasks.md") && content.toLowerCase().includes("in-place"), "opow-plan.md should enrich tasks.md in-place");
        assert.ok(!content.includes(".opow/plans/YYYYMMDDHHmmss"), "opow-plan.md should not create separate .opow/plans/ files");
    });

    it("implement workflow reads tasks.md without .opow/plans/", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "opow-implement.md"), "utf8");
        assert.ok(content.includes("tasks.md"), "opow-implement.md should read tasks.md");
        assert.ok(!content.includes(".opow/plans/"), "opow-implement.md should not reference .opow/plans/");
    });

    it("fast workflow enforces <3 files fast-track debugging, TDD, and escalation without proposal/design", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "opow-fast.md"), "utf8");
        assert.ok(content.includes("opow-systematic-debugging"), "opow-fast.md should invoke opow-systematic-debugging");
        assert.ok(content.includes("opow-test-driven-development"), "opow-fast.md should invoke opow-test-driven-development");
        assert.ok(content.includes("opow-verification-before-completion"), "opow-fast.md should invoke opow-verification-before-completion");
        assert.ok(content.includes("< 3") || content.includes("<3"), "opow-fast.md should enforce < 3 source files scope");
        assert.ok(content.includes("/opow-spec"), "opow-fast.md should escalate to /opow-spec when scope grows");
        assert.ok(content.includes("proposal.md") && content.includes("design.md"), "opow-fast.md should explicitly skip proposal.md/design.md");
    });

    it("implement workflow enforces bounded context handoff for subagents", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "opow-implement.md"), "utf8");
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
        const content = fs.readFileSync(path.join(workflowsDir, "opow-archive.md"), "utf8");
        assert.ok(content.includes("worktree remove"));
        assert.ok(content.includes(".worktrees/"));
    });

    it("archive workflow guides updating user documentation and README", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "opow-archive.md"), "utf8");
        assert.ok(content.includes("README.md"));
        assert.ok(content.includes("user guides") || content.includes("User Documentation"));
    });

    it("workflows enforce timestamp-prefixed naming convention YYYYMMDDHHmmss-<slug> and audit trail", () => {
        const specContent = fs.readFileSync(path.join(workflowsDir, "opow-spec.md"), "utf8");
        assert.ok(specContent.includes("YYYYMMDDHHmmss"), "opow-spec.md should guide YYYYMMDDHHmmss timestamp-prefixed change IDs");

        const planContent = fs.readFileSync(path.join(workflowsDir, "opow-plan.md"), "utf8");
        assert.ok(planContent.includes("YYYYMMDDHHmmss"), "opow-plan.md should reference YYYYMMDDHHmmss plan naming");

        const archiveContent = fs.readFileSync(path.join(workflowsDir, "opow-archive.md"), "utf8");
        assert.ok(
            archiveContent.includes("Changelog") || archiveContent.includes("changelog"),
            "opow-archive.md should guide updating living spec changelog"
        );
    });

    it("spec workflow selectively reads .opow/specs/ and Key Files before auditing codebase", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "opow-spec.md"), "utf8");
        assert.ok(content.includes(".opow/specs/"), "opow-spec.md should instruct listing/reading .opow/specs/");
        assert.ok(content.includes("NOT") && content.toLowerCase().includes("all specs"), "opow-spec.md should warn against reading all specs blindly");
        assert.ok(content.includes("Key Files"), "opow-spec.md should use Key Files as baseline before auditing codebase");
    });

    it("explore workflow checks .opow/specs/ first before grepping codebase", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "opow-explore.md"), "utf8");
        assert.ok(content.includes(".opow/specs/"), "opow-explore.md should instruct checking .opow/specs/ first");
        assert.ok(content.includes("Key Files"), "opow-explore.md should reference Key Files / Code Map");
    });

    it("archive workflow reads design.md Context Manifest and syncs Key Files into .opow/specs/", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "opow-archive.md"), "utf8");
        assert.ok(content.includes("design.md") && content.includes("Context Manifest"), "opow-archive.md should read design.md Context Manifest");
        assert.ok(content.includes("Key Files"), "opow-archive.md should sync Key Files into .opow/specs/");
    });

    it("explore and spec workflows instruct progressive reading for large specs (>200 lines)", () => {
        const exploreContent = fs.readFileSync(path.join(workflowsDir, "opow-explore.md"), "utf8");
        assert.ok(exploreContent.includes("200 lines") && exploreContent.includes("grep"), "opow-explore.md should instruct progressive reading for large specs");
        const specContent = fs.readFileSync(path.join(workflowsDir, "opow-spec.md"), "utf8");
        assert.ok(specContent.includes("200 lines") && specContent.includes("grep"), "opow-spec.md should instruct progressive reading for large specs");
    });

    it("implement workflow specifies lazy-loading opow-subagent-driven-development only when delegating independent tasks", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "opow-implement.md"), "utf8");
        assert.ok(
            content.toLowerCase().includes("lazy-load") && content.includes("opow-subagent-driven-development"),
            "implement.md should specify lazy-loading opow-subagent-driven-development"
        );
        assert.ok(
            content.includes("independent tasks"),
            "implement.md should limit subagent-driven-development loading to independent tasks"
        );
    });
});



