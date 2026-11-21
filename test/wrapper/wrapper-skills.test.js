const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("wrapper / platform skills", () => {
    const platforms = ["antigravity", "cline", "claude", "codex"];

    for (const p of platforms) {
        it(`wrapper for ${p} mentions openspec-explore and .opow/changes`, () => {
            const skillFile = path.join(__dirname, `../../src/wrapper/${p}/using-superpowers/SKILL.md`);
            assert.ok(fs.existsSync(skillFile), `Missing wrapper SKILL.md for ${p}`);
            const content = fs.readFileSync(skillFile, "utf8");
            assert.ok(content.includes("opow-openspec-explore"), `${p} wrapper missing opow-openspec-explore`);
            assert.ok(content.includes(".opow/changes/"), `${p} wrapper missing .opow/changes/`);
            assert.ok(!content.includes(".opow/plans/"), `${p} wrapper should not reference .opow/plans/`);
            assert.ok(content.includes("/opow-fast"), `${p} wrapper should reference /opow-fast`);
            assert.ok(!content.includes("/fix"), `${p} wrapper should not reference /fix`);
        });
    }
});
