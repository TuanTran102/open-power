const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
    CLI_ROOT,
    LEGACY_CLI_ROOT,
    DEFAULT_SOURCE_URL,
    WRAPPER_SKILL_NAME,
    getActiveCliRoot,
    getDefaultConfig,
    loadConfig,
    saveConfig,
    getConfigPath,
    getRepoDir,
} = require("../../src/lib/config");

describe("config", () => {
    it("provides default config values", () => {
        const defaults = getDefaultConfig();
        assert.equal(defaults.sourceUrl, DEFAULT_SOURCE_URL);
        assert.equal(defaults.wrapperSkillName, WRAPPER_SKILL_NAME);
    });

    it("resolves getActiveCliRoot across existence combinations", () => {
        const origExistsSync = fs.existsSync;
        try {
            // Case 1: CLI_ROOT exists
            fs.existsSync = (p) => p === CLI_ROOT;
            assert.equal(getActiveCliRoot(), CLI_ROOT);

            // Case 2: Only LEGACY_CLI_ROOT exists
            fs.existsSync = (p) => p === LEGACY_CLI_ROOT;
            assert.equal(getActiveCliRoot(), LEGACY_CLI_ROOT);

            // Case 3: Neither exists
            fs.existsSync = () => false;
            assert.equal(getActiveCliRoot(), CLI_ROOT);
        } finally {
            fs.existsSync = origExistsSync;
        }
    });

    it("loads defaults when no config file exists or returns valid object", () => {
        const origExistsSync = fs.existsSync;
        try {
            fs.existsSync = () => false;
            const config = loadConfig();
            assert.equal(config.sourceUrl, DEFAULT_SOURCE_URL);
            assert.equal(config.wrapperSkillName, WRAPPER_SKILL_NAME);
            assert.ok(typeof getConfigPath() === "string");
            assert.ok(typeof getRepoDir() === "string");
        } finally {
            fs.existsSync = origExistsSync;
        }
    });

    it("loads and merges user config when config file exists", () => {
        const origExistsSync = fs.existsSync;
        const origReadFileSync = fs.readFileSync;
        try {
            fs.existsSync = () => true;
            fs.readFileSync = () => JSON.stringify({ customKey: "customValue", sourceUrl: "https://custom.repo.git" });
            const config = loadConfig();
            assert.equal(config.sourceUrl, "https://custom.repo.git");
            assert.equal(config.customKey, "customValue");
            assert.equal(config.wrapperSkillName, WRAPPER_SKILL_NAME);
        } finally {
            fs.existsSync = origExistsSync;
            fs.readFileSync = origReadFileSync;
        }
    });

    it("falls back to defaults when config JSON is corrupt", () => {
        const origExistsSync = fs.existsSync;
        const origReadFileSync = fs.readFileSync;
        try {
            fs.existsSync = () => true;
            fs.readFileSync = () => "{ invalid json";
            const config = loadConfig();
            assert.equal(config.sourceUrl, DEFAULT_SOURCE_URL);
            assert.equal(config.wrapperSkillName, WRAPPER_SKILL_NAME);
        } finally {
            fs.existsSync = origExistsSync;
            fs.readFileSync = origReadFileSync;
        }
    });

    it("saves config by creating directory and writing formatted JSON", () => {
        const origMkdirSync = fs.mkdirSync;
        const origWriteFileSync = fs.writeFileSync;
        let mkdirPath = null;
        let writtenPath = null;
        let writtenContent = null;

        try {
            fs.mkdirSync = (p, options) => {
                mkdirPath = p;
            };
            fs.writeFileSync = (p, content) => {
                writtenPath = p;
                writtenContent = content;
            };

            const sampleConfig = { sourceUrl: "https://test.git", wrapperSkillName: "using-superpowers" };
            saveConfig(sampleConfig);

            assert.equal(mkdirPath, getActiveCliRoot());
            assert.equal(writtenPath, getConfigPath());
            assert.equal(writtenContent, JSON.stringify(sampleConfig, null, 4) + "\n");
        } finally {
            fs.mkdirSync = origMkdirSync;
            fs.writeFileSync = origWriteFileSync;
        }
    });
});
