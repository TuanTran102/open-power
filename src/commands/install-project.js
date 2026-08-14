const path = require("path");
const { ensureRepo } = require("../lib/repo");
const { syncSkillsTo } = require("../lib/sync");

/**
 * Install skills into the current project's .cline/skills directory.
 * This is a workaround for IDE extensions (Antigravity/VS Code) that
 * fail to detect global skills in ~/.cline/skills.
 */
function installProject() {
    const projectDir = process.cwd();
    const targetSkillsDir = path.join(projectDir, ".cline", "skills");
    const manifestPath = path.join(projectDir, ".cline", "superpowers-manifest.json");

    console.log(`Installing Superpowers skills into project...`);
    console.log(`  Project: ${projectDir}`);
    console.log(`  Target:  ${targetSkillsDir}`);

    ensureRepo();
    const manifest = syncSkillsTo(targetSkillsDir, manifestPath);

    console.log(`\n✅ Installed ${manifest.skills.length} skills into project:`);
    for (const skill of manifest.skills) {
        console.log(`   - ${skill}`);
    }
    console.log(`\nCommit: ${manifest.sourceCommit}`);
    console.log(`\nRestart Cline (or open the Skills tab) to see the new skills.`);
}

module.exports = { installProject };