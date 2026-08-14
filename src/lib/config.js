const os = require("os");
const path = require("path");
const fs = require("fs");

const HOME = os.homedir();

// Root directory for the CLI's own data (cache repo + manifest)
const CLI_ROOT = path.join(HOME, ".superpowers-cline");

// Where skills get installed for Cline (global)
const CLINE_SKILLS_DIR = path.join(HOME, ".cline", "skills");

// Upstream source of the Superpowers skills
const DEFAULT_SOURCE_URL = "https://github.com/obra/superpowers.git";

// The wrapper skill we manage ourselves (overrides upstream's using-superpowers)
const WRAPPER_SKILL_NAME = "using-superpowers";

function getConfigPath() {
    return path.join(CLI_ROOT, "config.json");
}

function getRepoDir() {
    return path.join(CLI_ROOT, "repo");
}

function getManifestPath() {
    return path.join(CLI_ROOT, "manifest.json");
}

function getDefaultConfig() {
    return {
        sourceUrl: DEFAULT_SOURCE_URL,
        clineSkillsDir: CLINE_SKILLS_DIR,
        wrapperSkillName: WRAPPER_SKILL_NAME,
    };
}

function loadConfig() {
    const configPath = getConfigPath();
    const defaults = getDefaultConfig();
    if (fs.existsSync(configPath)) {
        try {
            const user = JSON.parse(fs.readFileSync(configPath, "utf8"));
            return { ...defaults, ...user };
        } catch (err) {
            // Corrupt config: fall back to defaults
            return defaults;
        }
    }
    return defaults;
}

function saveConfig(config) {
    fs.mkdirSync(CLI_ROOT, { recursive: true });
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 4) + "\n");
}

module.exports = {
    HOME,
    CLI_ROOT,
    CLINE_SKILLS_DIR,
    DEFAULT_SOURCE_URL,
    WRAPPER_SKILL_NAME,
    getConfigPath,
    getRepoDir,
    getManifestPath,
    getDefaultConfig,
    loadConfig,
    saveConfig,
};