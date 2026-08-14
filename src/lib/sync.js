const fs = require("fs");
const path = require("path");
const {
    CLI_ROOT,
    getManifestPath,
    loadConfig,
} = require("./config");
const { getSkillsSourceDir, getCurrentCommit } = require("./repo");

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function removeDir(dir) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

function getWrapperSkillDir() {
    return path.join(__dirname, "..", "wrapper", "using-superpowers");
}

function readManifest(manifestPath) {
    if (fs.existsSync(manifestPath)) {
        try {
            return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        } catch (err) {
            return null;
        }
    }
    return null;
}

function writeManifest(manifestPath, manifest) {
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + "\n");
}

/**
 * Core sync: copy skills from the cached repo into a target skills directory.
 * - Copies all upstream skills.
 * - Overrides `using-superpowers` with our Cline-specific wrapper.
 * - Writes a manifest next to the target so uninstall is safe.
 *
 * @param {string} targetSkillsDir - Directory to install skills into (e.g. ~/.cline/skills or <project>/.cline/skills)
 * @param {string} manifestPath - Path to write the manifest
 * @returns {object} manifest
 */
function syncSkillsTo(targetSkillsDir, manifestPath) {
    const config = loadConfig();
    const sourceDir = getSkillsSourceDir();
    const wrapperDir = getWrapperSkillDir();

    if (!fs.existsSync(sourceDir)) {
        throw new Error(`Skills source not found: ${sourceDir}`);
    }

    fs.mkdirSync(targetSkillsDir, { recursive: true });

    // Copy all upstream skills
    const upstreamSkills = fs
        .readdirSync(sourceDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);

    for (const skillName of upstreamSkills) {
        copyDir(path.join(sourceDir, skillName), path.join(targetSkillsDir, skillName));
    }

    // Override using-superpowers with our wrapper
    copyDir(wrapperDir, path.join(targetSkillsDir, config.wrapperSkillName));

    // Record manifest (dedupe: wrapper replaces upstream's using-superpowers)
    const installedSkills = [
        ...upstreamSkills.filter((s) => s !== config.wrapperSkillName),
        config.wrapperSkillName,
    ];

    const manifest = {
        installedAt: new Date().toISOString(),
        sourceCommit: getCurrentCommit(),
        skills: installedSkills,
        wrapperSkill: config.wrapperSkillName,
    };
    writeManifest(manifestPath, manifest);

    return manifest;
}

/**
 * Sync skills into the global Cline skills directory (~/.cline/skills).
 */
function syncSkills() {
    const config = loadConfig();
    return syncSkillsTo(config.clineSkillsDir, getManifestPath());
}

/**
 * Remove only the skills that this CLI installed (per manifest).
 * Leaves any other user skills untouched.
 */
function uninstallSkills() {
    const config = loadConfig();
    const clineSkillsDir = config.clineSkillsDir;
    const manifest = readManifest(getManifestPath());

    if (!manifest || !Array.isArray(manifest.skills)) {
        throw new Error("No manifest found. Nothing to uninstall.");
    }

    for (const skillName of manifest.skills) {
        removeDir(path.join(clineSkillsDir, skillName));
    }

    // Remove manifest
    if (fs.existsSync(getManifestPath())) {
        fs.rmSync(getManifestPath(), { force: true });
    }

    return manifest.skills;
}

module.exports = {
    copyDir,
    removeDir,
    readManifest,
    writeManifest,
    syncSkills,
    syncSkillsTo,
    uninstallSkills,
    getWrapperSkillDir,
};