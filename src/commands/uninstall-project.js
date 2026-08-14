const path = require("path");
const fs = require("fs");
const { removeDir, readManifest } = require("../lib/sync");

/**
 * Remove skills installed into the current project's .cline/skills directory.
 */
function uninstallProject() {
    const projectDir = process.cwd();
    const targetSkillsDir = path.join(projectDir, ".cline", "skills");
    const manifestPath = path.join(projectDir, ".cline", "superpowers-manifest.json");

    console.log(`Uninstalling Superpowers skills from project...`);
    console.log(`  Project: ${projectDir}`);

    const manifest = readManifest(manifestPath);
    if (!manifest || !Array.isArray(manifest.skills)) {
        console.log(`\n⚠️  No project manifest found at ${manifestPath}. Nothing to uninstall.`);
        return;
    }

    for (const skillName of manifest.skills) {
        removeDir(path.join(targetSkillsDir, skillName));
    }

    // Remove manifest
    if (fs.existsSync(manifestPath)) {
        fs.rmSync(manifestPath, { force: true });
    }

    console.log(`\n✅ Removed ${manifest.skills.length} skills from project:`);
    for (const skill of manifest.skills) {
        console.log(`   - ${skill}`);
    }
    console.log(`\nRestart Cline (or open the Skills tab) to refresh.`);
}

module.exports = { uninstallProject };