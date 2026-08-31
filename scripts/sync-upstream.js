#!/usr/bin/env node

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { copyDir, removeDir } = require("../src/lib/sync");
const { loadConfig } = require("../src/lib/config");

function runGit(cmd, cwd) {
    return childProcess.execSync(`git ${cmd}`, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    }).trim();
}

function syncUpstream(options = {}) {
    const config = loadConfig();
    const repoUrl = options.repoUrl || config.sourceUrl;
    const upstreamSkillsDir = options.upstreamSkillsDir || path.join(__dirname, "..", "src", "skills", "upstream");
    const vendorMetaPath = options.vendorMetaPath || path.join(__dirname, "..", "src", "skills", "vendor-meta.json");
    const force = Boolean(options.force);

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opow-upstream-sync-"));

    try {
        runGit(`clone --depth 1 ${repoUrl} ${tempDir}`, process.cwd());
        const remoteCommit = runGit(`rev-parse HEAD`, tempDir);

        let currentMeta = {
            upstream: {
                repo: repoUrl,
                commit: null,
                syncedAt: null,
                skills: [],
            },
            openspec: {
                skills: ["openspec-explore", "openspec-sync", "spec-driven-development"],
            },
        };

        if (fs.existsSync(vendorMetaPath)) {
            try {
                currentMeta = JSON.parse(fs.readFileSync(vendorMetaPath, "utf8"));
            } catch (e) {
                // use fallback
            }
        }

        const previousCommit = currentMeta?.upstream?.commit;

        if (previousCommit === remoteCommit && !force) {
            return {
                updated: false,
                commit: remoteCommit,
                previousCommit,
                skills: currentMeta?.upstream?.skills || [],
            };
        }

        const remoteSkillsDir = path.join(tempDir, "skills");
        if (!fs.existsSync(remoteSkillsDir)) {
            throw new Error(`Upstream repository does not contain a 'skills' directory.`);
        }

        const skillEntries = fs
            .readdirSync(remoteSkillsDir, { withFileTypes: true })
            .filter((e) => e.isDirectory() && !e.name.startsWith("."))
            .map((e) => e.name);

        removeDir(upstreamSkillsDir);
        fs.mkdirSync(upstreamSkillsDir, { recursive: true });

        for (const skill of skillEntries) {
            const src = path.join(remoteSkillsDir, skill);
            const dest = path.join(upstreamSkillsDir, skill);
            copyDir(src, dest, true);
        }

        const newMeta = {
            ...currentMeta,
            upstream: {
                repo: repoUrl,
                commit: remoteCommit,
                syncedAt: new Date().toISOString(),
                skills: skillEntries,
            },
        };

        fs.mkdirSync(path.dirname(vendorMetaPath), { recursive: true });
        fs.writeFileSync(vendorMetaPath, JSON.stringify(newMeta, null, 4) + "\n");

        return {
            updated: true,
            commit: remoteCommit,
            previousCommit,
            skills: skillEntries,
        };
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

if (require.main === module) {
    console.log("Synchronizing upstream skills for maintainer...");
    const result = syncUpstream();
    if (!result.updated) {
        console.log(`✅ Already up to date with upstream commit: ${result.commit}`);
    } else {
        console.log(`✅ Updated ${result.skills.length} upstream skills!`);
        console.log(`   Commit: ${result.previousCommit || "initial"} → ${result.commit}`);
        console.log(`   Skills: ${result.skills.join(", ")}`);
    }
}

module.exports = { syncUpstream };
