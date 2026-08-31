const fs = require("fs");
const path = require("path");
const { loadConfig } = require("./config");
const { getSkillsSourceDir, getCurrentCommit } = require("./repo");

function copyDir(src, dest, overwrite = true) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name.startsWith(".") || entry.name.startsWith("._")) continue;
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath, overwrite);
        } else {
            if (overwrite || !fs.existsSync(destPath)) {
                fs.copyFileSync(srcPath, destPath);
            }
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

function getCustomSkillsDir() {
    return path.join(__dirname, "..", "skills");
}

function getOpenSpecSourceDir() {
    return path.join(__dirname, "..", "templates", "openspec");
}

function getWorkflowsSourceDir() {
    return path.join(__dirname, "..", "templates", "workflows");
}

/**
 * Initialize / update the .opow/ directory in the target project.
 * - Installs .opow/specs/templates/
 * - Ensures .opow/plans/ directory exists
 *
 * @param {string} [projectDir] - Target project root
 * @returns {object} opowInfo
 */
function syncOpenSpec(projectDir = process.cwd()) {
    const openSpecSrc = getOpenSpecSourceDir();
    const opowDir = path.join(projectDir, ".opow");
    const targetSpecsDir = path.join(opowDir, "specs");
    const targetChangesDir = path.join(opowDir, "changes");
    const targetArchiveDir = path.join(opowDir, "archive");
    const targetPlansDir = path.join(opowDir, "plans");
    const targetTemplatesDir = path.join(opowDir, "templates");

    fs.mkdirSync(targetSpecsDir, { recursive: true });
    fs.mkdirSync(targetChangesDir, { recursive: true });
    fs.mkdirSync(targetArchiveDir, { recursive: true });
    fs.mkdirSync(targetPlansDir, { recursive: true });
    fs.mkdirSync(targetTemplatesDir, { recursive: true });

    if (fs.existsSync(openSpecSrc)) {
        const srcTemplates = path.join(openSpecSrc, "templates");
        copyDir(srcTemplates, targetTemplatesDir);
        copyDir(srcTemplates, path.join(targetSpecsDir, "templates"));
    }

    return {
        opowDir,
        specsDir: targetSpecsDir,
        changesDir: targetChangesDir,
        archiveDir: targetArchiveDir,
        plansDir: targetPlansDir,
        templatesDir: targetTemplatesDir,
        hasTemplates: fs.existsSync(targetTemplatesDir) && fs.readdirSync(targetTemplatesDir).length > 0,
    };
}

/**
 * Core sync: copy skills and workflows from cached repo + local bundles into target directories.
 *
 * @param {object} target - Target definition from targets.js
 * @param {string} [projectDir] - Project root directory (default: process.cwd())
 * @returns {object} manifest
 */
function syncTargetSkills(target, projectDir = process.cwd()) {
    const config = loadConfig();
    const sourceDir = getSkillsSourceDir();
    const customSkillsDir = getCustomSkillsDir();
    const workflowsSourceDir = getWorkflowsSourceDir();
    const targetSkillsDir = target.getSkillsDir(projectDir);
    const targetWorkflowsDir = target.getWorkflowsDir(projectDir);
    const manifestPath = target.getManifestPath(projectDir);
    const wrapperDir = target.getWrapperDir();

    if (!fs.existsSync(sourceDir)) {
        throw new Error(`Skills source not found: ${sourceDir}`);
    }

    fs.mkdirSync(targetSkillsDir, { recursive: true });

    // 1. Copy all upstream skills
    const upstreamSkills = fs
        .readdirSync(sourceDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith("."))
        .map((e) => e.name);

    for (const skillName of upstreamSkills) {
        copyDir(path.join(sourceDir, skillName), path.join(targetSkillsDir, skillName));
    }

    // 2. Copy bundled custom skills (e.g. spec-driven-development)
    const customSkills = [];
    if (fs.existsSync(customSkillsDir)) {
        const entries = fs
            .readdirSync(customSkillsDir, { withFileTypes: true })
            .filter((e) => e.isDirectory() && !e.name.startsWith("."))
            .map((e) => e.name);

        for (const skillName of entries) {
            copyDir(path.join(customSkillsDir, skillName), path.join(targetSkillsDir, skillName));
            customSkills.push(skillName);
        }
    }

    // 3. Override using-superpowers with target wrapper if exists
    if (fs.existsSync(wrapperDir)) {
        copyDir(wrapperDir, path.join(targetSkillsDir, config.wrapperSkillName));
    }

    // 4. Sync slash command workflows into target platform's workflows directory
    const installedWorkflows = [];
    if (fs.existsSync(workflowsSourceDir)) {
        fs.mkdirSync(targetWorkflowsDir, { recursive: true });
        const wfEntries = fs
            .readdirSync(workflowsSourceDir, { withFileTypes: true })
            .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("."))
            .map((e) => e.name);

        for (const wfFile of wfEntries) {
            fs.copyFileSync(
                path.join(workflowsSourceDir, wfFile),
                path.join(targetWorkflowsDir, wfFile)
            );
            installedWorkflows.push(wfFile.replace(/\.md$/, ""));
        }
    }

    // Record manifest
    const allInstalledSkills = [
        ...upstreamSkills.filter((s) => s !== config.wrapperSkillName),
        ...customSkills.filter((s) => s !== config.wrapperSkillName),
        config.wrapperSkillName,
    ];
    const uniqueSkills = Array.from(new Set(allInstalledSkills));

    const manifest = {
        target: target.id,
        installedAt: new Date().toISOString(),
        sourceCommit: getCurrentCommit(),
        skills: uniqueSkills,
        workflows: installedWorkflows,
        wrapperSkill: config.wrapperSkillName,
        openspec: true,
    };
    writeManifest(manifestPath, manifest);

    return manifest;
}

/**
 * Remove only the skills and workflows that this CLI installed for a target in the project.
 * Leaves custom skills and workflows untouched.
 *
 * @param {object} target - Target definition from targets.js
 * @param {string} [projectDir] - Project root directory (default: process.cwd())
 * @returns {object} { skills: string[], workflows: string[] }
 */
function uninstallTargetSkills(target, projectDir = process.cwd()) {
    const targetSkillsDir = target.getSkillsDir(projectDir);
    const targetWorkflowsDir = target.getWorkflowsDir(projectDir);
    const manifestPath = target.getManifestPath(projectDir);
    const manifest = readManifest(manifestPath);

    if (!manifest || !Array.isArray(manifest.skills)) {
        throw new Error(`No manifest found for ${target.name} at ${manifestPath}. Nothing to uninstall.`);
    }

    // Remove skills
    for (const skillName of manifest.skills) {
        removeDir(path.join(targetSkillsDir, skillName));
    }

    // Remove workflows
    if (Array.isArray(manifest.workflows)) {
        for (const wf of manifest.workflows) {
            const wfPath = path.join(targetWorkflowsDir, `${wf}.md`);
            if (fs.existsSync(wfPath)) {
                fs.rmSync(wfPath, { force: true });
            }
        }
    }

    // Remove manifest
    if (fs.existsSync(manifestPath)) {
        fs.rmSync(manifestPath, { force: true });
    }

    // Cleanup empty dirs
    for (const dir of [targetSkillsDir, targetWorkflowsDir]) {
        if (fs.existsSync(dir)) {
            try {
                if (fs.readdirSync(dir).length === 0) {
                    fs.rmdirSync(dir);
                }
            } catch (e) {
                // ignore
            }
        }
    }

    return {
        skills: manifest.skills,
        workflows: manifest.workflows || [],
    };
}

module.exports = {
    copyDir,
    removeDir,
    readManifest,
    writeManifest,
    syncOpenSpec,
    syncTargetSkills,
    uninstallTargetSkills,
};
