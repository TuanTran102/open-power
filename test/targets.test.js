const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { TARGETS, ALIASES, resolveTargets } = require("../src/lib/targets");

describe("targets", () => {
    describe("TARGETS definition", () => {
        it("defines all 4 target platforms with correct paths", () => {
            const projectDir = "/mock/project";

            assert.equal(TARGETS.cline.id, "cline");
            assert.equal(TARGETS.cline.name, "Cline");
            assert.equal(TARGETS.cline.getSkillsDir(projectDir), path.join(projectDir, ".cline", "skills"));
            assert.equal(TARGETS.cline.getWorkflowsDir(projectDir), path.join(projectDir, ".clinerules", "workflows"));
            assert.equal(TARGETS.cline.getManifestPath(projectDir), path.join(projectDir, ".cline", "superpowers-manifest.json"));

            assert.equal(TARGETS.antigravity.id, "antigravity");
            assert.equal(TARGETS.antigravity.name, "Antigravity");
            assert.equal(TARGETS.antigravity.getSkillsDir(projectDir), path.join(projectDir, ".agent", "skills"));
            assert.equal(TARGETS.antigravity.getWorkflowsDir(projectDir), path.join(projectDir, ".agent", "workflows"));
            assert.equal(TARGETS.antigravity.getManifestPath(projectDir), path.join(projectDir, ".agent", "superpowers-manifest.json"));

            assert.equal(TARGETS.claude.id, "claude");
            assert.equal(TARGETS.claude.name, "Claude Code");
            assert.equal(TARGETS.claude.getSkillsDir(projectDir), path.join(projectDir, ".claude", "skills"));
            assert.equal(TARGETS.claude.getWorkflowsDir(projectDir), path.join(projectDir, ".claude", "commands"));
            assert.equal(TARGETS.claude.getManifestPath(projectDir), path.join(projectDir, ".claude", "superpowers-manifest.json"));
            assert.ok(TARGETS.claude.getWrapperDir().endsWith(path.join("wrapper", "claude", "using-superpowers")));

            assert.equal(TARGETS.codex.id, "codex");
            assert.equal(TARGETS.codex.name, "Codex");
            assert.equal(TARGETS.codex.getSkillsDir(projectDir), path.join(projectDir, ".codex", "skills"));
            assert.equal(TARGETS.codex.getWorkflowsDir(projectDir), path.join(projectDir, ".codex", "workflows"));
            assert.equal(TARGETS.codex.getManifestPath(projectDir), path.join(projectDir, ".codex", "superpowers-manifest.json"));
            assert.ok(TARGETS.codex.getWrapperDir().endsWith(path.join("wrapper", "codex", "using-superpowers")));
        });
    });

    describe("resolveTargets", () => {
        it("returns [cline, antigravity] by default when no target provided", () => {
            assert.deepEqual(resolveTargets(), [TARGETS.cline, TARGETS.antigravity]);
            assert.deepEqual(resolveTargets(""), [TARGETS.cline, TARGETS.antigravity]);
            assert.deepEqual(resolveTargets(null), [TARGETS.cline, TARGETS.antigravity]);
            assert.deepEqual(resolveTargets(undefined), [TARGETS.cline, TARGETS.antigravity]);
        });

        it("resolves claude and its aliases", () => {
            assert.deepEqual(resolveTargets("claude"), [TARGETS.claude]);
            assert.deepEqual(resolveTargets("cc"), [TARGETS.claude]);
            assert.deepEqual(resolveTargets("claudecode"), [TARGETS.claude]);
            assert.deepEqual(resolveTargets("CLAUDE"), [TARGETS.claude]);
        });

        it("resolves codex and its aliases", () => {
            assert.deepEqual(resolveTargets("codex"), [TARGETS.codex]);
            assert.deepEqual(resolveTargets("cdx"), [TARGETS.codex]);
            assert.deepEqual(resolveTargets("openai"), [TARGETS.codex]);
            assert.deepEqual(resolveTargets("CODEX"), [TARGETS.codex]);
        });

        it("resolves cline and antigravity with aliases", () => {
            assert.deepEqual(resolveTargets("cline"), [TARGETS.cline]);
            assert.deepEqual(resolveTargets("c"), [TARGETS.cline]);
            assert.deepEqual(resolveTargets("antigravity"), [TARGETS.antigravity]);
            assert.deepEqual(resolveTargets("agy"), [TARGETS.antigravity]);
            assert.deepEqual(resolveTargets("gemini"), [TARGETS.antigravity]);
            assert.deepEqual(resolveTargets("a"), [TARGETS.antigravity]);
        });

        it("resolves all 4 targets for 'all' and 'both'", () => {
            const allTargets = [TARGETS.cline, TARGETS.antigravity, TARGETS.claude, TARGETS.codex];
            assert.deepEqual(resolveTargets("all"), allTargets);
            assert.deepEqual(resolveTargets("both"), allTargets);
        });

        it("throws helpful error for unknown targets", () => {
            assert.throws(() => resolveTargets("unknown"), {
                message: /Unknown target: "unknown"\. Valid targets: cline, antigravity \(agy\), claude \(cc\), codex \(cdx\), all/,
            });
        });
    });
});
