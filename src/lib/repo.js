const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { getRepoDir, loadConfig } = require("./config");

function runGit(args, cwd) {
    return execSync(`git ${args}`, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    }).trim();
}

function repoExists() {
    return fs.existsSync(path.join(getRepoDir(), ".git"));
}

function cloneRepo(sourceUrl) {
    fs.mkdirSync(getRepoDir(), { recursive: true });
    runGit(`clone --depth 1 ${sourceUrl} ${getRepoDir()}`, process.cwd());
}

function pullRepo() {
    runGit(`pull --ff-only`, getRepoDir());
}

function fetchRepo() {
    runGit(`fetch --depth 1 origin`, getRepoDir());
}

function getCurrentCommit() {
    return runGit(`rev-parse HEAD`, getRepoDir());
}

function getRemoteCommit() {
    return runGit(`rev-parse origin/HEAD`, getRepoDir());
}

function getSkillsSourceDir() {
    return path.join(getRepoDir(), "skills");
}

function ensureRepo() {
    const config = loadConfig();
    if (!repoExists()) {
        cloneRepo(config.sourceUrl);
    }
    return getRepoDir();
}

module.exports = {
    repoExists,
    cloneRepo,
    pullRepo,
    fetchRepo,
    getCurrentCommit,
    getRemoteCommit,
    getSkillsSourceDir,
    ensureRepo,
};