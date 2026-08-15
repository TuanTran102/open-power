const path = require("path");

const TARGETS = {
    cline: {
        id: "cline",
        name: "Cline",
        getSkillsDir: (projectDir) => path.join(projectDir, ".cline", "skills"),
        getManifestPath: (projectDir) => path.join(projectDir, ".cline", "superpowers-manifest.json"),
        getWrapperDir: () => path.join(__dirname, "..", "wrapper", "cline", "using-superpowers"),
    },
    antigravity: {
        id: "antigravity",
        name: "Antigravity",
        getSkillsDir: (projectDir) => path.join(projectDir, ".agents", "skills"),
        getManifestPath: (projectDir) => path.join(projectDir, ".agents", "superpowers-manifest.json"),
        getWrapperDir: () => path.join(__dirname, "..", "wrapper", "antigravity", "using-superpowers"),
    },
};

const ALIASES = {
    cline: "cline",
    c: "cline",
    antigravity: "antigravity",
    agy: "antigravity",
    gemini: "antigravity",
    a: "antigravity",
    all: "all",
    both: "all",
};

/**
 * Resolve target names/aliases into target objects.
 * @param {string} [targetArg] - Target name ('cline', 'antigravity', 'agy', 'all', etc.)
 * @returns {Array<object>} Array of target objects
 */
function resolveTargets(targetArg) {
    if (!targetArg || targetArg === "all") {
        return [TARGETS.cline, TARGETS.antigravity];
    }

    const normalized = String(targetArg).toLowerCase().trim();
    const canonical = ALIASES[normalized];

    if (!canonical) {
        throw new Error(`Unknown target: "${targetArg}". Valid targets: cline, antigravity (agy), all`);
    }

    if (canonical === "all") {
        return [TARGETS.cline, TARGETS.antigravity];
    }

    return [TARGETS[canonical]];
}

module.exports = {
    TARGETS,
    ALIASES,
    resolveTargets,
};
