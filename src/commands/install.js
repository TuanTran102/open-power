const { ensureRepo } = require("../lib/repo");
const { syncSkills } = require("../lib/sync");
const { loadConfig } = require("../lib/config");

function install() {
    const config = loadConfig();
    console.log(`Installing Superpowers skills for Cline...`);
    console.log(`  Source: ${config.sourceUrl}`);
    console.log(`  Target: ${config.clineSkillsDir}`);

    ensureRepo();
    const manifest = syncSkills();

    console.log(`\n✅ Installed ${manifest.skills.length} skills:`);
    for (const skill of manifest.skills) {
        console.log(`   - ${skill}`);
    }
    console.log(`\nCommit: ${manifest.sourceCommit}`);
    console.log(`\nRestart Cline (or open the Skills tab) to see the new skills.`);
}

module.exports = { install };