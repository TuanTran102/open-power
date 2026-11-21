const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const EXCLUDED_TOP_DIRS = new Set([".git", "node_modules", ".agent", ".claude", ".cline", ".codex"]);

function isGitRepo(dir) {
    try {
        childProcess.execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
            cwd: dir,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
        });
        return true;
    } catch {
        return false;
    }
}

function walkNonGitFiles(dir, rootDir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const rel = path.relative(rootDir, full).split(path.sep).join("/");
        const top = rel.split("/")[0];
        if (EXCLUDED_TOP_DIRS.has(top)) continue;
        if (entry.isDirectory()) {
            walkNonGitFiles(full, rootDir, out);
        } else if (entry.isFile()) {
            out.push(rel);
        }
    }
    return out;
}

function copyProjectFiles(projectPath, wsDir) {
    const warnings = [];
    let files;

    if (isGitRepo(projectPath)) {
        const raw = childProcess.execFileSync(
            "git",
            ["ls-files", "-z", "-c", "-o", "--exclude-standard"],
            { cwd: projectPath, encoding: "utf8", maxBuffer: 50 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }
        );
        files = raw.split("\0").filter((rel) => {
            if (!rel) return false;
            const top = rel.split("/")[0];
            return !EXCLUDED_TOP_DIRS.has(top);
        });
    } else {
        files = walkNonGitFiles(projectPath, projectPath);
    }

    if (files.length > 20000) {
        warnings.push(`Project ${projectPath} has ${files.length} files (>20,000); workspace copy may be slow.`);
    }

    for (const rel of files) {
        const src = path.join(projectPath, rel);
        if (!fs.existsSync(src)) continue;
        const stat = fs.statSync(src);
        if (!stat.isFile()) continue;
        const dst = path.join(wsDir, rel);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
    }

    const opowSrc = path.join(projectPath, ".opow");
    if (fs.existsSync(opowSrc)) {
        fs.cpSync(opowSrc, path.join(wsDir, ".opow"), { recursive: true });
    }

    const nodeModulesSrc = path.join(projectPath, "node_modules");
    if (fs.existsSync(nodeModulesSrc)) {
        const nodeModulesDst = path.join(wsDir, "node_modules");
        if (!fs.existsSync(nodeModulesDst)) {
            fs.symlinkSync(nodeModulesSrc, nodeModulesDst, "dir");
        }
    }

    childProcess.execFileSync("git", ["init", "-b", "main"], { cwd: wsDir, stdio: ["ignore", "pipe", "pipe"] });
    childProcess.execFileSync("git", ["config", "user.email", "bench@example.com"], { cwd: wsDir, stdio: ["ignore", "pipe", "pipe"] });
    childProcess.execFileSync("git", ["config", "user.name", "Benchmark"], { cwd: wsDir, stdio: ["ignore", "pipe", "pipe"] });
    childProcess.execFileSync("git", ["add", "."], { cwd: wsDir, stdio: ["ignore", "pipe", "pipe"] });
    childProcess.execFileSync("git", ["commit", "-m", "chore: bench baseline"], { cwd: wsDir, stdio: ["ignore", "pipe", "pipe"] });

    return warnings;
}

/**
 * Prepare an isolated workspace and install the opow variant into it.
 * @param {object} opts
 * @param {string} opts.variantSrc
 * @param {string} opts.wsDir
 * @param {object} [opts.task]
 * @param {string} [opts.projectPath]
 * @param {string} [opts.target="antigravity"]
 * @returns {{ warnings: string[] }}
 */
function prepareWorkspace({ variantSrc, wsDir, task = null, projectPath = null, target = "antigravity" }) {
    fs.rmSync(wsDir, { recursive: true, force: true });
    fs.mkdirSync(wsDir, { recursive: true });

    let warnings = [];
    if (projectPath) {
        if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) {
            throw new Error(`Project path does not exist or is not a directory: ${projectPath}`);
        }
        warnings = copyProjectFiles(projectPath, wsDir);
    } else if (task) {
        task.setup(wsDir);
    } else {
        throw new Error("prepareWorkspace requires either task or projectPath");
    }

    const cliPath = path.join(variantSrc, "bin", "cli.js");
    childProcess.execFileSync(process.execPath, [cliPath, "install", target], {
        cwd: wsDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30000,
    });

    return { warnings };
}

module.exports = {
    prepareWorkspace,
};
