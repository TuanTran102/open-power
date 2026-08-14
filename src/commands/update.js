const { repoExists, pullRepo, getCurrentCommit, getRemoteCommit, fetchRepo } = require("../lib/repo");
const { syncSkills, readManifest } = require("../lib/sync");

function update() {
    if (!repoExists()) {
        console.log("No cached repo found. Run `superpowers-cline install` first.");
        return;
    }

    const before = getCurrentCommit();
    console.log(`Current commit: ${before}`);

    try {
        pullRepo();
    } catch (err) {
        console.log("No updates available (already up to date) or pull failed.");
        console.log(String(err.message || err));
        return;
    }

    const after = getCurrentCommit();
    if (before === after) {
        console.log("Already up to date.");
        return;
    }

    const manifest = syncSkills();
    console.log(`\n✅ Updated from ${before} → ${after}`);
    console.log(`   Synced ${manifest.skills.length} skills.`);
}

module.exports = { update };