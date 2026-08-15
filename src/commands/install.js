const path = require("path");
const { ensureRepo } = require("../lib/repo");
const { syncTargetSkills } = require("../lib/sync");
const { resolveTargets } = require("../lib/targets");
const { loadConfig } = require("../lib/config");

function install(targetArg) {
    const config = loadConfig();
    const targets = resolveTargets(targetArg);
    const projectDir = process.cwd();

    console.log(`Ensuring upstream Superpowers repository cache...`);
    console.log(`  Source: ${config.sourceUrl}`);
    ensureRepo();

    for (const target of targets) {
        const targetSkillsDir = target.getSkillsDir(projectDir);
        console.log(`\nInstalling Superpowers skills for ${target.name}...`);
        console.log(`  Project: ${projectDir}`);
        console.log(`  Target:  ${targetSkillsDir}`);

        const manifest = syncTargetSkills(target, projectDir);

        console.log(`\n✅ Installed ${manifest.skills.length} skills for ${target.name}:`);
        for (const skill of manifest.skills) {
            console.log(`   - ${skill}`);
        }
        console.log(`\nCommit: ${manifest.sourceCommit}`);
    }

    console.log(`\n🎉 Done! Restart your IDE / agent session to load the new skills.`);
}

module.exports = { install };