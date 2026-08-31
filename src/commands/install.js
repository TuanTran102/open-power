const path = require("path");
const { ensureRepo } = require("../lib/repo");
const { syncTargetSkills, syncOpenSpec } = require("../lib/sync");
const { resolveTargets } = require("../lib/targets");
const { loadConfig } = require("../lib/config");

function install(targetArg) {
    const config = loadConfig();
    const targets = resolveTargets(targetArg);
    const projectDir = process.cwd();

    console.log(`Ensuring upstream Superpowers repository cache...`);
    console.log(`  Source: ${config.sourceUrl}`);
    ensureRepo();

    console.log(`\nInitializing .opow workspace...`);
    const opowInfo = syncOpenSpec(projectDir);
    console.log(`  Living Specs: ${opowInfo.specsDir}`);
    console.log(`  Changes:      ${opowInfo.changesDir}`);
    console.log(`  Archive:      ${opowInfo.archiveDir}`);
    console.log(`  Plans:        ${opowInfo.plansDir}`);
    console.log(`  Templates:    ${opowInfo.hasTemplates ? "✅ Installed" : "⚠️ Missing"}`);

    for (const target of targets) {
        const targetSkillsDir = target.getSkillsDir(projectDir);
        const targetWorkflowsDir = target.getWorkflowsDir(projectDir);
        console.log(`\nInstalling Superpowers + OpenSpec for ${target.name}...`);
        console.log(`  Project:   ${projectDir}`);
        console.log(`  Skills:    ${targetSkillsDir}`);
        console.log(`  Workflows: ${targetWorkflowsDir}`);

        const manifest = syncTargetSkills(target, projectDir);

        console.log(`\n✅ Installed ${manifest.skills.length} skills for ${target.name}:`);
        for (const skill of manifest.skills) {
            console.log(`   - ${skill}`);
        }

        if (manifest.workflows && manifest.workflows.length > 0) {
            console.log(`\n⚡ Installed ${manifest.workflows.length} Slash Commands / Workflows:`);
            for (const wf of manifest.workflows) {
                console.log(`   - /${wf}`);
            }
        }

        console.log(`\nCommit: ${manifest.sourceCommit}`);
    }

    console.log(`\n🎉 Done! Slash commands (/spec, /plan, /implement, /verify) & skills are ready.`);
}

module.exports = { install };