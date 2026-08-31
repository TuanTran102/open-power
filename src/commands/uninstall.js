const fs = require("fs");
const path = require("path");
const { uninstallTargetSkills, hasUserOpowContent, removeOpowWorkspace } = require("../lib/sync");
const { resolveTargets } = require("../lib/targets");

function uninstall(targetArg, options = {}) {
    const isAllFlag = Boolean(options && options.all);
    const targets = resolveTargets(targetArg);
    const projectDir = process.cwd();

    console.log(`Uninstalling Superpowers & OpenSpec from project...`);
    console.log(`  Project: ${projectDir}`);

    let uninstalledAny = false;

    for (const target of targets) {
        try {
            console.log(`\nUninstalling for ${target.name}...`);
            const removed = uninstallTargetSkills(target, projectDir);
            uninstalledAny = true;

            console.log(`✅ Removed ${removed.skills.length} skills for ${target.name}:`);
            for (const skill of removed.skills) {
                console.log(`   - ${skill}`);
            }

            if (removed.workflows && removed.workflows.length > 0) {
                console.log(`✅ Removed ${removed.workflows.length} workflows for ${target.name}:`);
                for (const wf of removed.workflows) {
                    console.log(`   - /${wf}`);
                }
            }
        } catch (err) {
            console.log(`⚠️  ${err.message}`);
        }
    }

    const opowDir = path.join(projectDir, ".opow");
    if (fs.existsSync(opowDir)) {
        if (isAllFlag) {
            removeOpowWorkspace(projectDir);
            console.log(`\n✅ Purged .opow/ workspace (--all).`);
        } else {
            const hasUserContent = hasUserOpowContent(projectDir);
            if (!hasUserContent) {
                removeOpowWorkspace(projectDir);
                console.log(`\n🧹 Cleaned up pristine .opow/ workspace (no user specs or changes found).`);
            } else {
                console.log(`\nℹ️  Preserved .opow/ workspace (contains living specs & change history).`);
                console.log(`   To completely purge .opow/, run: opow uninstall --all (or -a)`);
            }
        }
    }

    if (uninstalledAny) {
        console.log(`\nRestart your IDE / agent session to refresh.`);
    }
}

module.exports = { uninstall };