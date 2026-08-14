const { uninstallSkills } = require("../lib/sync");

function uninstall() {
    console.log("Uninstalling Superpowers skills from Cline...");
    try {
        const removed = uninstallSkills();
        console.log(`\n✅ Removed ${removed.length} skills:`);
        for (const skill of removed) {
            console.log(`   - ${skill}`);
        }
        console.log("\nRestart Cline (or open the Skills tab) to refresh.");
    } catch (err) {
        console.log(`\n⚠️  ${err.message}`);
    }
}

module.exports = { uninstall };