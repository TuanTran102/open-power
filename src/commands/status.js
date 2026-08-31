const fs = require("fs");
const path = require("path");
const { readManifest, getUpstreamCommit, getVendorMeta } = require("../lib/sync");
const { resolveTargets } = require("../lib/targets");

function status(targetArg) {
    const projectDir = process.cwd();
    const targets = resolveTargets(targetArg);
    const bundledCommit = getUpstreamCommit();
    const vendorMeta = getVendorMeta();

    console.log("open-power (opow) — Project Status");
    console.log("==================================");
    console.log(`Project:                 ${projectDir}`);
    console.log(`Bundled upstream commit: ${bundledCommit}`);
    if (vendorMeta?.upstream?.syncedAt) {
        console.log(`Vendored at:             ${vendorMeta.upstream.syncedAt}`);
    }

    // Check .opow Status
    const opowDir = path.join(projectDir, ".opow");
    const specsDir = path.join(opowDir, "specs");
    const plansDir = path.join(opowDir, "plans");
    const templatesDir = path.join(opowDir, "templates");
    console.log(`\n------------------------------------`);
    console.log(`Open-Power Workspace (.opow):`);
    console.log(`  Directory: ${opowDir}`);
    console.log(`  Specs:     ${fs.existsSync(specsDir) ? "✅ Ready" : "✗ Missing"}`);
    console.log(`  Plans:     ${fs.existsSync(plansDir) ? "✅ Ready" : "✗ Missing"}`);
    console.log(`  Templates: ${fs.existsSync(templatesDir) ? "✅ Ready" : "✗ Missing"}`);

    for (const target of targets) {
        const manifestPath = target.getManifestPath(projectDir);
        const targetSkillsDir = target.getSkillsDir(projectDir);
        const targetWorkflowsDir = target.getWorkflowsDir(projectDir);
        const manifest = readManifest(manifestPath);

        console.log(`\n------------------------------------`);
        console.log(`Target: ${target.name}`);
        console.log(`Skills Directory:    ${targetSkillsDir}`);
        console.log(`Workflows Directory: ${targetWorkflowsDir}`);
        console.log(`Manifest Path:       ${manifestPath}`);

        if (manifest && Array.isArray(manifest.skills)) {
            console.log(`Installed commit:    ${manifest.sourceCommit || "unknown"}`);
            console.log(`Installed at:        ${manifest.installedAt || "unknown"}`);

            if (manifest.workflows && manifest.workflows.length > 0) {
                console.log(`\nSlash Commands / Workflows (${manifest.workflows.length}):`);
                for (const wf of manifest.workflows) {
                    const wfFile = path.join(targetWorkflowsDir, `${wf}.md`);
                    const marker = fs.existsSync(wfFile) ? "✓" : "✗ (missing)";
                    console.log(`   ${marker} /${wf}`);
                }
            }

            console.log(`\nSkills (${manifest.skills.length}):`);
            for (const skill of manifest.skills) {
                const skillDir = path.join(targetSkillsDir, skill);
                const marker = fs.existsSync(skillDir) ? "✓" : "✗ (missing)";
                console.log(`   ${marker} ${skill}`);
            }
            if (manifest.wrapperSkill) {
                console.log(`\nPlatform wrapper: ${manifest.wrapperSkill} (${target.name} + OpenSpec integrated)`);
            }
        } else {
            console.log(`Status: Not installed in this project.`);
        }
    }
}

module.exports = { status };