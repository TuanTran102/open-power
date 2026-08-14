const fs = require("fs");
const path = require("path");
const {
    CLI_ROOT,
    getManifestPath,
    getRepoDir,
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

function readManifest() {
    const manifestPath = getManifestPath();
    if (fs.existsSync(manifestPath)) {
        try {
            return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        } catch (err) {
            return null;
        }
    }
    return null;
}

function writeManifest(manifest) {
    fs.mkdirSync(CLI_ROOT, { recursive: true });
    fs.writeFileSync(getManifestPath(), JSON.stringify(manifest, null, 4) + "\n");
}

/**
 * Sync skills from the cached repo into Cline's skills directory.
 * - Copies all upstream skills.
 * - Overrides `using-superpowers` with our Cline-specific wrapper.
 * - Records installed skill names in the manifest so uninstall is safe.
 */
function syncSkills() {
    const config = loadConfig();
    const clineSkillsDir = config.clineSkillsDir;
    const sourceDir = getSkillsSourceDir();
    const wrapperDir = getWrapperSkillDir();

    if (!fs.existsSync(sourceDir)) {
        throw new Error(`Skills source not found: ${sourceDir}`);
    }

    fs.mkdirSync(clineSkillsDir, { recursive: true });

    // Copy all upstream skills
    const upstreamSkills = fs
        .readdirSync(sourceDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);

    for (const skillName of upstreamSkills) {
        copyDir(path.join(sourceDir, skillName), path.join(clineSkillsDir, skillName));
    }

    // Override using-superpowers with our wrapper
    copyDir(wrapperDir, path.join(clineSkillsDir, config.wrapperSkillName));

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
    writeManifest(manifest);

    return manifest;
}

/**
 * Remove only the skills that this CLI installed (per manifest).
 * Leaves any other user skills untouched.
 */
function uninstallSkills() {
    const config = loadConfig();
    const clineSkillsDir = config.clineSkillsDir;
    const manifest = readManifest();

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
    uninstallSkills,
    getWrapperSkillDir,
};