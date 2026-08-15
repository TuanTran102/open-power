const { uninstallTargetSkills } = require("../lib/sync");
const { resolveTargets } = require("../lib/targets");

function uninstall(targetArg) {
    const targets = resolveTargets(targetArg);
    const projectDir = process.cwd();

    console.log(`Uninstalling Superpowers skills from project...`);
    console.log(`  Project: ${projectDir}`);

    let uninstalledAny = false;

    for (const target of targets) {
        try {
            console.log(`\nUninstalling skills for ${target.name}...`);
            const removed = uninstallTargetSkills(target, projectDir);
            uninstalledAny = true;
            console.log(`✅ Removed ${removed.length} skills for ${target.name}:`);
            for (const skill of removed) {
                console.log(`   - ${skill}`);
            }
        } catch (err) {
            console.log(`⚠️  ${err.message}`);
        }
    }

    if (uninstalledAny) {
        console.log(`\nRestart your IDE / agent session to refresh.`);
    }
}

module.exports = { uninstall };