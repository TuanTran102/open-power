const fs = require("fs");
const path = require("path");
const { repoExists, getCurrentCommit, getRemoteCommit, fetchRepo } = require("../lib/repo");
const { readManifest } = require("../lib/sync");
const { loadConfig } = require("../lib/config");
const { resolveTargets } = require("../lib/targets");

function status(targetArg) {
    const config = loadConfig();
    const projectDir = process.cwd();
    const targets = resolveTargets(targetArg);

    console.log("Superpowers Skills — Project Status");
    console.log("====================================");
    console.log(`Source:  ${config.sourceUrl}`);
    console.log(`Project: ${projectDir}`);

    if (!repoExists()) {
        console.log("\n⚠️  No cached upstream repository found. Run `install` first.");
        return;
    }

    const current = getCurrentCommit();
    console.log(`Cached upstream commit: ${current}`);

    // Check for remote updates
    try {
        fetchRepo();
        const remote = getRemoteCommit();
        if (remote === current) {
            console.log("Upstream status: ✅ Up to date");
        } else {
            console.log(`Upstream status: ⚠️  Update available (${remote})`);
            console.log("Run `update` to sync latest skills.");
        }
    } catch (err) {
        console.log("Upstream status: ⚠️  Could not check for remote updates (offline?).");
    }

    for (const target of targets) {
        const manifestPath = target.getManifestPath(projectDir);
        const targetSkillsDir = target.getSkillsDir(projectDir);
        const manifest = readManifest(manifestPath);

        console.log(`\n------------------------------------`);
        console.log(`Target: ${target.name}`);
        console.log(`Skills Directory: ${targetSkillsDir}`);
        console.log(`Manifest Path:    ${manifestPath}`);

        if (manifest && Array.isArray(manifest.skills)) {
            console.log(`Installed commit: ${manifest.sourceCommit || "unknown"}`);
            console.log(`Installed at:     ${manifest.installedAt || "unknown"}`);
            console.log(`\nSkills (${manifest.skills.length}):`);
            for (const skill of manifest.skills) {
                const skillDir = path.join(targetSkillsDir, skill);
                const marker = fs.existsSync(skillDir) ? "✓" : "✗ (missing)";
                console.log(`   ${marker} ${skill}`);
            }
            if (manifest.wrapperSkill) {
                console.log(`\nPlatform wrapper: ${manifest.wrapperSkill} (${target.name} optimized)`);
            }
        } else {
            console.log(`Status: Not installed in this project.`);
        }
    }
}

module.exports = { status };