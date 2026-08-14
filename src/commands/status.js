const fs = require("fs");
const path = require("path");
const { repoExists, getCurrentCommit, getRemoteCommit, fetchRepo } = require("../lib/repo");
const { readManifest } = require("../lib/sync");
const { getRepoDir, loadConfig } = require("../lib/config");

function status() {
    const config = loadConfig();
    const manifest = readManifest();

    console.log("Superpowers for Cline — Status");
    console.log("================================");
    console.log(`Source: ${config.sourceUrl}`);
    console.log(`Target: ${config.clineSkillsDir}`);

    if (!repoExists()) {
        console.log("\n⚠️  No cached repo found. Run `superpowers-cline install` first.");
        return;
    }

    const current = getCurrentCommit();
    console.log(`\nInstalled commit: ${current}`);

    // Check for updates
    try {
        fetchRepo();
        const remote = getRemoteCommit();
        if (remote === current) {
            console.log("Status: ✅ Up to date");
        } else {
            console.log(`Status: ⚠️  Update available (${remote})`);
            console.log("Run `superpowers-cline update` to sync.");
        }
    } catch (err) {
        console.log("Status: ⚠️  Could not check for updates (offline?).");
    }

    if (manifest && Array.isArray(manifest.skills)) {
        console.log(`\nInstalled skills (${manifest.skills.length}):`);
        for (const skill of manifest.skills) {
            const skillDir = path.join(config.clineSkillsDir, skill);
            const marker = fs.existsSync(skillDir) ? "✓" : "✗ (missing)";
            console.log(`   ${marker} ${skill}`);
        }
        if (manifest.wrapperSkill) {
            console.log(`\nWrapper skill (Cline-specific): ${manifest.wrapperSkill}`);
        }
    } else {
        console.log("\nNo manifest found. Skills may not be installed.");
    }
}

module.exports = { status };