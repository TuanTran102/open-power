const fs = require("fs");
const path = require("path");
const { loadConfig } = require("./config");
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
 * - Overrides `using-superpowers` with the target-specific wrapper.
 * - Writes a manifest so uninstall is safe.
 *
 * @param {object} target - Target definition from targets.js
 * @param {string} [projectDir] - Project root directory (default: process.cwd())
 * @returns {object} manifest
 */
function syncTargetSkills(target, projectDir = process.cwd()) {
    const config = loadConfig();
    const sourceDir = getSkillsSourceDir();
    const targetSkillsDir = target.getSkillsDir(projectDir);
    const manifestPath = target.getManifestPath(projectDir);
    const wrapperDir = target.getWrapperDir();

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

    // Override using-superpowers with target wrapper if exists
    if (fs.existsSync(wrapperDir)) {
        copyDir(wrapperDir, path.join(targetSkillsDir, config.wrapperSkillName));
    }

    // Record manifest (dedupe: wrapper replaces upstream's using-superpowers)
    const installedSkills = [
        ...upstreamSkills.filter((s) => s !== config.wrapperSkillName),
        config.wrapperSkillName,
    ];

    const manifest = {
        target: target.id,
        installedAt: new Date().toISOString(),
        sourceCommit: getCurrentCommit(),
        skills: installedSkills,
        wrapperSkill: config.wrapperSkillName,
    };
    writeManifest(manifestPath, manifest);

    return manifest;
}

/**
 * Remove only the skills that this CLI installed for a target in the project.
 * Leaves any other user skills untouched.
 *
 * @param {object} target - Target definition from targets.js
 * @param {string} [projectDir] - Project root directory (default: process.cwd())
 * @returns {Array<string>} Array of removed skill names
 */
function uninstallTargetSkills(target, projectDir = process.cwd()) {
    const targetSkillsDir = target.getSkillsDir(projectDir);
    const manifestPath = target.getManifestPath(projectDir);
    const manifest = readManifest(manifestPath);

    if (!manifest || !Array.isArray(manifest.skills)) {
        throw new Error(`No manifest found for ${target.name} at ${manifestPath}. Nothing to uninstall.`);
    }

    for (const skillName of manifest.skills) {
        removeDir(path.join(targetSkillsDir, skillName));
    }

    // Remove manifest
    if (fs.existsSync(manifestPath)) {
        fs.rmSync(manifestPath, { force: true });
    }

    // If targetSkillsDir is now empty, remove it
    if (fs.existsSync(targetSkillsDir)) {
        try {
            const remaining = fs.readdirSync(targetSkillsDir);
            if (remaining.length === 0) {
                fs.rmdirSync(targetSkillsDir);
            }
        } catch (e) {
            // ignore
        }
    }

    return manifest.skills;
}

module.exports = {
    copyDir,
    removeDir,
    readManifest,
    writeManifest,
    syncTargetSkills,
    uninstallTargetSkills,
};
