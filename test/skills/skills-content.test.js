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

    it("validates openspec-explore outputs concrete file paths and test paths for manifests", () => {
        const skillPath = path.join(__dirname, "../../src/skills/openspec/openspec-explore/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes("Affected Files") || content.includes("Context Manifest"), "openspec-explore should document mapping to context manifest");
        assert.ok(content.includes("concrete file paths") || content.includes("Target Files"), "openspec-explore should mandate concrete file paths");
        assert.ok(content.includes("test") && (content.includes("Test Files") || content.includes("test paths")), "openspec-explore should output test files");
    });

    it("validates spec-driven-development documents context manifests and bounded subagents", () => {
        const skillPath = path.join(__dirname, "../../src/skills/openspec/spec-driven-development/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes("Affected Files & Context Manifest") || content.includes("Context Manifest"), "spec-driven-development should document Affected Files & Context Manifest");
        assert.ok(content.includes("Bounded") || content.includes("bounded"), "spec-driven-development should document bounded subagents");
        assert.ok(content.includes("forbidden") || content.includes("prohibit") || content.includes("unconstrained"), "spec-driven-development should prohibit unconstrained repo grepping");
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

    it("validates spec-driven-development skill includes 4-step development loop", () => {
        const skillPath = path.join(__dirname, "../../src/skills/openspec/spec-driven-development/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes("4-Step Development Loop") || content.includes("4-Step"));
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

    it("validates subagent-driven-development runs verification before /archive for OpenSpec plans", () => {
        const skillPath = path.join(__dirname, "../../src/skills/upstream/subagent-driven-development/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes("verification-before-completion") && content.includes("/archive"), "subagent-driven-development should reference verification-before-completion and /archive");
        assert.ok(content.includes("OpenSpec") || content.includes(".opow"), "subagent-driven-development should reference OpenSpec/.opow");
    });

    it("validates executing-plans runs verification before /archive for OpenSpec plans", () => {
        const skillPath = path.join(__dirname, "../../src/skills/upstream/executing-plans/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes("verification-before-completion") && content.includes("/archive"), "executing-plans should reference verification-before-completion and /archive");
        assert.ok(content.includes("OpenSpec") || content.includes(".opow"), "executing-plans should reference OpenSpec/.opow");
    });

    it("validates finishing-a-development-branch references OpenSpec /archive deferral", () => {
        const skillPath = path.join(__dirname, "../../src/skills/upstream/finishing-a-development-branch/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes("/archive"), "finishing-a-development-branch should reference /archive");
        assert.ok(content.includes("OpenSpec") || content.includes(".opow"), "finishing-a-development-branch should reference OpenSpec/.opow");
    });

    it("validates openspec-explore selectively loads .opow/specs/ and Key Files before grepping code", () => {
        const skillPath = path.join(__dirname, "../../src/skills/openspec/openspec-explore/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes(".opow/specs/"), "openspec-explore should instruct loading .opow/specs/");
        assert.ok(content.includes("Key Files"), "openspec-explore should reference Key Files before grepping code");
    });

    it("validates spec-driven-development documents selective Living Spec reading in /spec and Key Files sync in /archive", () => {
        const skillPath = path.join(__dirname, "../../src/skills/openspec/spec-driven-development/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes(".opow/specs/"), "spec-driven-development should reference .opow/specs/");
        assert.ok(content.includes("Key Files"), "spec-driven-development should document Key Files / Code Map sync");
        assert.ok(content.includes("Selective Living Spec"), "spec-driven-development should document selective Living Spec grounding");
    });

    it("validates openspec-explore and spec-driven-development instruct progressive reading for large specs", () => {
        const explorePath = path.join(__dirname, "../../src/skills/openspec/openspec-explore/SKILL.md");
        const exploreContent = fs.readFileSync(explorePath, "utf8");
        assert.ok(exploreContent.includes("200 lines") && exploreContent.includes("grep"), "openspec-explore should instruct progressive reading for large specs");

        const sddPath = path.join(__dirname, "../../src/skills/openspec/spec-driven-development/SKILL.md");
        const sddContent = fs.readFileSync(sddPath, "utf8");
        assert.ok(sddContent.includes("200 lines") && sddContent.includes("progressively"), "spec-driven-development should instruct progressive reading for large specs");
    });

    it("validates distilled upstream skills retain core gates and stay compact", () => {
        const tddPath = path.join(__dirname, "../../src/skills/upstream/test-driven-development/SKILL.md");
        const tddContent = fs.readFileSync(tddPath, "utf8");
        assert.ok(tddContent.includes("NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST"), "TDD should retain Iron Law");
        assert.ok(tddContent.includes("Red-Green-Refactor"), "TDD should retain Red-Green-Refactor");
        assert.ok(tddContent.includes("writing-good-tests.md"), "TDD should retain writing-good-tests.md link");
        assert.ok(tddContent.includes("Red Flags"), "TDD should retain Red Flags");
        assert.ok(tddContent.split(/\r?\n/).length <= 130, "distilled TDD skill should stay <= 130 lines");

        const sddPath = path.join(__dirname, "../../src/skills/upstream/subagent-driven-development/SKILL.md");
        const sddContent = fs.readFileSync(sddPath, "utf8");
        assert.ok(sddContent.includes("Ruling:"), "subagent-driven-development should retain Ruling format");
        assert.ok(sddContent.includes("progress.md"), "subagent-driven-development should retain progress.md ledger");
        assert.ok(sddContent.includes("Round 5") || sddContent.includes("Max 5 Rounds"), "subagent-driven-development should retain 5-round fix loop/breaker");
        assert.ok(sddContent.split(/\r?\n/).length <= 180, "distilled subagent-driven-development skill should stay <= 180 lines");

        const brainPath = path.join(__dirname, "../../src/skills/upstream/brainstorming/SKILL.md");
        const brainContent = fs.readFileSync(brainPath, "utf8");
        assert.ok(brainContent.includes("<HARD-GATE>"), "brainstorming should retain HARD-GATE");
        assert.ok(brainContent.includes("Spike") && brainContent.includes("Bounded") && brainContent.includes("Architectural"), "brainstorming should retain Three Paths");
        assert.ok(brainContent.includes("Spec Self-Review"), "brainstorming should retain Spec Self-Review");
        assert.ok(brainContent.split(/\r?\n/).length <= 130, "distilled brainstorming skill should stay <= 130 lines");
    });
});

