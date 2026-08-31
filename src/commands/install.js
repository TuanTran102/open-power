const { syncTargetSkills, syncOpenSpec, getUpstreamCommit, ensureGitignore, syncTargetRules } = require("../lib/sync");
const { resolveTargets } = require("../lib/targets");

function install(targetArg) {
    const targets = resolveTargets(targetArg);
    const projectDir = process.cwd();
    const upstreamCommit = getUpstreamCommit();

    console.log(`Installing bundled Superpowers + OpenSpec skills...`);
    console.log(`  Source Commit: ${upstreamCommit}`);

    console.log(`\nInitializing .opow workspace...`);
    const opowInfo = syncOpenSpec(projectDir);
    console.log(`  Living Specs: ${opowInfo.specsDir}`);
    console.log(`  Changes:      ${opowInfo.changesDir}`);
    console.log(`  Archive:      ${opowInfo.archiveDir}`);
    console.log(`  Plans:        ${opowInfo.plansDir}`);
    console.log(`  Templates:    ${opowInfo.hasTemplates ? "✅ Installed" : "⚠️ Missing"}`);

    const gitignoreInfo = ensureGitignore(projectDir);
    if (gitignoreInfo.created || gitignoreInfo.updated) {
        console.log(`  Gitignore:    ✅ Configured (${gitignoreInfo.addedPatterns.length} entries added)`);
    } else {
        console.log(`  Gitignore:    ✅ Already up to date`);
    }

    for (const target of targets) {
        const targetSkillsDir = target.getSkillsDir(projectDir);
        const targetWorkflowsDir = target.getWorkflowsDir(projectDir);
        console.log(`\nInstalling Superpowers + OpenSpec for ${target.name}...`);
        console.log(`  Project:   ${projectDir}`);
        console.log(`  Skills:    ${targetSkillsDir}`);
        console.log(`  Workflows: ${targetWorkflowsDir}`);

        const manifest = syncTargetSkills(target, projectDir);
        const ruleInfo = syncTargetRules(target, projectDir);

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

        if (ruleInfo && ruleInfo.rulePath) {
            if (ruleInfo.created || ruleInfo.updated) {
                console.log(`\n📝 Rules:     ✅ Configured "be brief" rule for ${target.name}`);
            } else {
                console.log(`\n📝 Rules:     ✅ "be brief" rule already active for ${target.name}`);
            }
        }

        console.log(`\nCommit: ${manifest.sourceCommit}`);
    }

    console.log(`\n🎉 Done! Slash commands (/explore, /spec, /plan, /implement, /verify, /archive, /sync-spec) & skills are ready.`);
}

module.exports = { install };