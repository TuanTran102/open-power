const repo = require("../lib/repo");
const { syncTargetSkills, syncOpenSpec, readManifest } = require("../lib/sync");
const { resolveTargets } = require("../lib/targets");

function update(targetArg) {
    if (!repo.repoExists()) {
        console.log("⚠️  No cached repo found. Run `install` first.");
        return;
    }

    const before = repo.getCurrentCommit();
    console.log(`Current upstream cache commit: ${before}`);

    try {
        repo.pullRepo();
    } catch (err) {
        console.log("No updates available (already up to date) or pull failed.");
        console.log(String(err.message || err));
        return;
    }

    const after = repo.getCurrentCommit();
    console.log(`Latest upstream commit: ${after}`);

    const projectDir = process.cwd();
    const targets = resolveTargets(targetArg);

    console.log(`\nRe-syncing OpenSpec templates...`);
    syncOpenSpec(projectDir);

    let updatedCount = 0;
    for (const target of targets) {
        const manifest = readManifest(target.getManifestPath(projectDir));
        if (targetArg || manifest) {
            console.log(`\nRe-syncing skills for ${target.name}...`);
            const newManifest = syncTargetSkills(target, projectDir);
            console.log(`✅ Synced ${newManifest.skills.length} skills for ${target.name}.`);
            updatedCount++;
        }
    }

    if (updatedCount === 0) {
        console.log("\n⚠️  No installed skills found in current project to update. Run `install` first.");
    } else {
        console.log(`\n✅ Update complete (${before === after ? "already on latest commit" : `${before} → ${after}`}).`);
    }
}

module.exports = { update };