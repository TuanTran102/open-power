const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
    DEFAULT_SOURCE_URL,
    WRAPPER_SKILL_NAME,
    getDefaultConfig,
    loadConfig,
    getConfigPath,
    getRepoDir,
} = require("../../src/lib/config");

describe("config", () => {
    it("provides default config values", () => {
        const defaults = getDefaultConfig();
        assert.equal(defaults.sourceUrl, DEFAULT_SOURCE_URL);
        assert.equal(defaults.wrapperSkillName, WRAPPER_SKILL_NAME);
    });

    it("loads defaults when no config file exists or returns valid object", () => {
        const config = loadConfig();
        assert.ok(config.sourceUrl);
        assert.ok(config.wrapperSkillName);
        assert.ok(typeof getConfigPath() === "string");
        assert.ok(typeof getRepoDir() === "string");
    });
});
