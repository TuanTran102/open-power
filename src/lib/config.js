const os = require("os");
const path = require("path");
const fs = require("fs");

const HOME = os.homedir();

// Root directory for the CLI's own data (cache repo + global config)
const CLI_ROOT = path.join(HOME, ".open-power");
const LEGACY_CLI_ROOT = path.join(HOME, ".superpowers-cline");

// Upstream source of the Superpowers skills
const DEFAULT_SOURCE_URL = "https://github.com/obra/superpowers.git";

// The wrapper skill we manage ourselves (overrides upstream's using-superpowers)
const WRAPPER_SKILL_NAME = "using-superpowers";

function getActiveCliRoot() {
    if (!fs.existsSync(CLI_ROOT) && fs.existsSync(LEGACY_CLI_ROOT)) {
        return LEGACY_CLI_ROOT;
    }
    return CLI_ROOT;
}

function getConfigPath() {
    return path.join(getActiveCliRoot(), "config.json");
}

function getRepoDir() {
    return path.join(getActiveCliRoot(), "repo");
}

function getDefaultConfig() {
    return {
        sourceUrl: DEFAULT_SOURCE_URL,
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
    const root = getActiveCliRoot();
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 4) + "\n");
}

module.exports = {
    HOME,
    CLI_ROOT,
    DEFAULT_SOURCE_URL,
    WRAPPER_SKILL_NAME,
    getActiveCliRoot,
    getConfigPath,
    getRepoDir,
    getDefaultConfig,
    loadConfig,
    saveConfig,
};
