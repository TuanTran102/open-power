const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const VARIANT_PATHS = ["bin", "src", "package.json"];

function runGit(args, cwd) {
    return childProcess.execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        maxBuffer: 50 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
    });
}

function resolveSha(ref, repoRoot) {
    if (!ref || ref === "WORKTREE") return "WORKTREE";
    return runGit(["rev-parse", "--short", ref], repoRoot).trim();
}

/**
 * Export bin/, src/, and package.json for a git ref or WORKTREE into destDir.
 * @param {string} ref - Git ref (e.g. "HEAD") or "WORKTREE"
 * @param {string} destDir
 * @param {string} repoRoot
 */
function exportVariant(ref, destDir, repoRoot) {
    fs.rmSync(destDir, { recursive: true, force: true });
    fs.mkdirSync(destDir, { recursive: true });

    if (ref !== "WORKTREE") {
        const archive = childProcess.execFileSync(
            "git",
            ["archive", ref, "--", ...VARIANT_PATHS],
            {
                cwd: repoRoot,
                maxBuffer: 50 * 1024 * 1024,
                stdio: ["ignore", "pipe", "pipe"],
            }
        );
        childProcess.execFileSync("tar", ["-x", "-C", destDir], {
            input: archive,
            stdio: ["pipe", "pipe", "pipe"],
        });
        return;
    }

    const raw = runGit(
        ["ls-files", "-z", "-c", "-o", "--exclude-standard", "--", ...VARIANT_PATHS],
        repoRoot
    );
    const files = raw.split("\0").filter(Boolean);
    for (const rel of files) {
        const srcPath = path.join(repoRoot, rel);
        if (!fs.existsSync(srcPath)) continue;
        const stat = fs.statSync(srcPath);
        if (!stat.isFile()) continue;
        const outPath = path.join(destDir, rel);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.copyFileSync(srcPath, outPath);
    }
}

/**
 * List changed files between base and head (or WORKTREE) under bin/, src/, package.json.
 * @param {string} base
 * @param {string} head
 * @param {string} repoRoot
 * @returns {Array<{file: string, status: string}>}
 */
function changedFiles(base, head, repoRoot) {
    const byFile = new Map();
    const diffArgs = head === "WORKTREE"
        ? ["diff", "--name-status", base, "--", ...VARIANT_PATHS]
        : ["diff", "--name-status", base, head, "--", ...VARIANT_PATHS];

    const diffOut = runGit(diffArgs, repoRoot);
    for (const line of diffOut.split(/\r?\n/)) {
        if (!line.trim()) continue;
        const parts = line.split("\t");
        const status = parts[0];
        const file = parts[parts.length - 1];
        if (file) byFile.set(file, status);
    }

    if (head === "WORKTREE") {
        const untrackedOut = runGit(
            ["ls-files", "-z", "--others", "--exclude-standard", "--", ...VARIANT_PATHS],
            repoRoot
        );
        for (const file of untrackedOut.split("\0").filter(Boolean)) {
            if (!byFile.has(file)) {
                byFile.set(file, "A");
            }
        }
    }

    return Array.from(byFile.entries())
        .map(([file, status]) => ({ file, status }))
        .sort((a, b) => a.file.localeCompare(b.file));
}

module.exports = {
    VARIANT_PATHS,
    resolveSha,
    exportVariant,
    changedFiles,
};
