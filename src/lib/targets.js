const path = require("path");

const TARGETS = {
    cline: {
        id: "cline",
        name: "Cline",
        getSkillsDir: (projectDir) => path.join(projectDir, ".cline", "skills"),
        getWorkflowsDir: (projectDir) => path.join(projectDir, ".clinerules", "workflows"),
        getManifestPath: (projectDir) => path.join(projectDir, ".cline", "superpowers-manifest.json"),
        getWrapperDir: () => path.join(__dirname, "..", "wrapper", "cline", "using-superpowers"),
    },
    antigravity: {
        id: "antigravity",
        name: "Antigravity",
        getSkillsDir: (projectDir) => path.join(projectDir, ".agent", "skills"),
        getWorkflowsDir: (projectDir) => path.join(projectDir, ".agent", "workflows"),
        getManifestPath: (projectDir) => path.join(projectDir, ".agent", "superpowers-manifest.json"),
        getWrapperDir: () => path.join(__dirname, "..", "wrapper", "antigravity", "using-superpowers"),
    },
    claude: {
        id: "claude",
        name: "Claude Code",
        getSkillsDir: (projectDir) => path.join(projectDir, ".claude", "skills"),
        getWorkflowsDir: (projectDir) => path.join(projectDir, ".claude", "commands"),
        getManifestPath: (projectDir) => path.join(projectDir, ".claude", "superpowers-manifest.json"),
        getWrapperDir: () => path.join(__dirname, "..", "wrapper", "claude", "using-superpowers"),
    },
    codex: {
        id: "codex",
        name: "Codex",
        getSkillsDir: (projectDir) => path.join(projectDir, ".codex", "skills"),
        getWorkflowsDir: (projectDir) => path.join(projectDir, ".codex", "workflows"),
        getManifestPath: (projectDir) => path.join(projectDir, ".codex", "superpowers-manifest.json"),
        getWrapperDir: () => path.join(__dirname, "..", "wrapper", "codex", "using-superpowers"),
    },
};

const ALIASES = {
    cline: "cline",
    c: "cline",
    antigravity: "antigravity",
    agy: "antigravity",
    gemini: "antigravity",
    a: "antigravity",
    claude: "claude",
    claudecode: "claude",
    cc: "claude",
    codex: "codex",
    cdx: "codex",
    openai: "codex",
    all: "all",
    both: "all",
};

/**
 * Resolve target names/aliases into target objects.
 * @param {string} [targetArg] - Target name ('cline', 'antigravity', 'claude', 'codex', 'all', etc.)
 * @returns {Array<object>} Array of target objects
 */
function resolveTargets(targetArg) {
    if (!targetArg || targetArg === "") {
        return [TARGETS.cline, TARGETS.antigravity];
    }

    const normalized = String(targetArg).toLowerCase().trim();
    const canonical = ALIASES[normalized];

    if (!canonical) {
        throw new Error(`Unknown target: "${targetArg}". Valid targets: cline, antigravity (agy), claude (cc), codex (cdx), all`);
    }

    if (canonical === "all") {
        return [TARGETS.cline, TARGETS.antigravity, TARGETS.claude, TARGETS.codex];
    }

    return [TARGETS[canonical]];
}

module.exports = {
    TARGETS,
    ALIASES,
    resolveTargets,
};

