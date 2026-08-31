const { syncTargetSkills, syncOpenSpec, readManifest, getUpstreamCommit, ensureGitignore, syncTargetRules } = require("../lib/sync");
const { resolveTargets } = require("../lib/targets");

function update(targetArg) {
    const projectDir = process.cwd();
    const targets = resolveTargets(targetArg);
    const bundledCommit = getUpstreamCommit();

    console.log(`Updating skills and OpenSpec from bundled package...`);
    console.log(`Bundled upstream commit: ${bundledCommit}`);

    console.log(`\nRe-syncing OpenSpec templates...`);
    syncOpenSpec(projectDir);
    ensureGitignore(projectDir);

    let updatedCount = 0;
    for (const target of targets) {
        const manifest = readManifest(target.getManifestPath(projectDir));
        if (targetArg || manifest) {
            console.log(`\nRe-syncing skills for ${target.name}...`);
            const newManifest = syncTargetSkills(target, projectDir);
            syncTargetRules(target, projectDir);
            console.log(`✅ Synced ${newManifest.skills.length} skills for ${target.name}.`);
            updatedCount++;
        }
    }

    if (updatedCount === 0) {
        console.log("\n⚠️  No installed skills found in current project to update. Run `install` first.");
    } else {
        console.log(`\n✅ Update complete (synced with bundled package commit: ${bundledCommit}).`);
    }
}

module.exports = { update };