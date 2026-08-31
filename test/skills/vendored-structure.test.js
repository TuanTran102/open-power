const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("skills / vendored structure", () => {
    const skillsRoot = path.join(__dirname, "../../src/skills");
    const upstreamDir = path.join(skillsRoot, "upstream");
    const openspecDir = path.join(skillsRoot, "openspec");
    const metaPath = path.join(skillsRoot, "vendor-meta.json");

    it("verifies vendor-meta.json exists and has valid structure", () => {
        assert.ok(fs.existsSync(metaPath), "vendor-meta.json must exist");
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        assert.ok(meta.upstream, "meta.upstream must exist");
        assert.ok(meta.upstream.commit, "meta.upstream.commit must exist");
        assert.ok(Array.isArray(meta.upstream.skills), "meta.upstream.skills must be an array");
        assert.ok(meta.openspec, "meta.openspec must exist");
        assert.ok(Array.isArray(meta.openspec.skills), "meta.openspec.skills must be an array");
    });

    it("verifies all upstream skills exist in src/skills/upstream", () => {
        assert.ok(fs.existsSync(upstreamDir), "src/skills/upstream directory must exist");
        const expectedUpstream = [
            "brainstorming",
            "dispatching-parallel-agents",
            "executing-plans",
            "finishing-a-development-branch",
            "receiving-code-review",
            "requesting-code-review",
            "subagent-driven-development",
            "systematic-debugging",
            "test-driven-development",
            "using-git-worktrees",
            "using-superpowers",
            "verification-before-completion",
            "writing-plans",
            "writing-skills"
        ];
        for (const skill of expectedUpstream) {
            const skillFile = path.join(upstreamDir, skill, "SKILL.md");
            assert.ok(fs.existsSync(skillFile), `Missing upstream skill file: ${skillFile}`);
        }
    });

    it("verifies all openspec skills exist in src/skills/openspec", () => {
        assert.ok(fs.existsSync(openspecDir), "src/skills/openspec directory must exist");
        const expectedOpenSpec = [
            "openspec-explore",
            "openspec-sync",
            "spec-driven-development"
        ];
        for (const skill of expectedOpenSpec) {
            const skillFile = path.join(openspecDir, skill, "SKILL.md");
            assert.ok(fs.existsSync(skillFile), `Missing openspec skill file: ${skillFile}`);
        }
    });
});
