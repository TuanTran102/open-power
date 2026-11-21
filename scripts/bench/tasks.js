const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

function runGit(args, cwd) {
    return childProcess.execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    });
}

function writeFiles(baseDir, fileMap) {
    for (const [rel, content] of Object.entries(fileMap)) {
        const full = path.join(baseDir, rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content, "utf8");
    }
}

function initGitRepo(workDir, commitMsg = "chore: initial fixture") {
    runGit(["init", "-b", "main"], workDir);
    runGit(["config", "user.email", "bench@example.com"], workDir);
    runGit(["config", "user.name", "Benchmark"], workDir);
    runGit(["add", "."], workDir);
    runGit(["commit", "-m", commitMsg], workDir);
}

function getGitChangedFiles(workDir) {
    try {
        const tracked = runGit(["diff", "--name-only", "HEAD"], workDir)
            .split(/\r?\n/)
            .filter(Boolean);
        const untracked = runGit(["ls-files", "--others", "--exclude-standard"], workDir)
            .split(/\r?\n/)
            .filter(Boolean);
        return Array.from(new Set([...tracked, ...untracked])).sort();
    } catch {
        return [];
    }
}

function findFilesRecursive(dir, predicate, results = []) {
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            findFilesRecursive(full, predicate, results);
        } else if (entry.isFile() && predicate(full, entry.name)) {
            results.push(full);
        }
    }
    return results;
}

const GOLDEN_TASKS = {
    "bugfix-tdd": {
        id: "bugfix-tdd",
        title: "Fix applyDiscount bugs with TDD",
        prompt: [
            "Fix `applyDiscount(price, pct)` in `src/pricing.js`:",
            "1. Throw a `RangeError` if `pct` is `< 0`, `> 100`, or not a finite number.",
            "2. Round the returned price cleanly to 2 decimal places (avoid floating-point artifacts like `16.9915`).",
            "3. Add unit tests covering valid edge cases (0%, 100%, decimals) and invalid percentages in `test/pricing.test.js`, then verify with `npm test`.",
        ].join("\n"),
        setup(workDir) {
            writeFiles(workDir, {
                "package.json": JSON.stringify(
                    {
                        name: "fixture-bugfix-tdd",
                        version: "1.0.0",
                        scripts: { test: "node --test" },
                    },
                    null,
                    2
                ),
                "src/pricing.js": [
                    "function applyDiscount(price, pct) {",
                    "    return price * (1 - pct / 100);",
                    "}",
                    "",
                    "module.exports = { applyDiscount };",
                    "",
                ].join("\n"),
                "test/pricing.test.js": [
                    "const { describe, it } = require('node:test');",
                    "const assert = require('node:assert/strict');",
                    "const { applyDiscount } = require('../src/pricing');",
                    "",
                    "describe('applyDiscount', () => {",
                    "    it('applies 10% discount', () => {",
                    "        assert.equal(applyDiscount(100, 10), 90);",
                    "    });",
                    "});",
                    "",
                ].join("\n"),
            });
            initGitRepo(workDir);
        },
        grade(workDir, session) {
            const checks = [];

            let npmTestOk = false;
            let npmTestDetail = "";
            try {
                childProcess.execFileSync("npm", ["test"], {
                    cwd: workDir,
                    encoding: "utf8",
                    stdio: ["ignore", "pipe", "pipe"],
                    timeout: 30000,
                });
                npmTestOk = true;
                npmTestDetail = "npm test exited 0";
            } catch (err) {
                npmTestDetail = `npm test failed: ${(err.stderr || err.message || "").slice(0, 180)}`;
            }
            checks.push({ name: "npm_test_passes", pass: npmTestOk, detail: npmTestDetail });

            let edgeOk = false;
            let edgeDetail = "";
            try {
                const probeScript = [
                    "const assert = require('node:assert/strict');",
                    "const { applyDiscount } = require('./src/pricing');",
                    "assert.equal(applyDiscount(19.99, 15), 16.99);",
                    "assert.equal(applyDiscount(100, 0), 100);",
                    "assert.equal(applyDiscount(100, 100), 0);",
                    "assert.throws(() => applyDiscount(100, -1), RangeError);",
                    "assert.throws(() => applyDiscount(100, 101), RangeError);",
                ].join("\n");
                childProcess.execFileSync(process.execPath, ["-e", probeScript], {
                    cwd: workDir,
                    encoding: "utf8",
                    stdio: ["ignore", "pipe", "pipe"],
                    timeout: 10000,
                });
                edgeOk = true;
                edgeDetail = "All 5 hidden edge-case assertions passed";
            } catch (err) {
                edgeDetail = `Edge-case assertion failed: ${(err.stderr || err.message || "").slice(0, 180)}`;
            }
            checks.push({ name: "hidden_edge_cases", pass: edgeOk, detail: edgeDetail });

            const changed = getGitChangedFiles(workDir);
            const testEdited = changed.includes("test/pricing.test.js");
            checks.push({
                name: "tests_updated",
                pass: testEdited,
                detail: testEdited ? "test/pricing.test.js modified" : "test/pricing.test.js was not modified",
            });

            if (session && session.compliance) {
                const ran = (session.compliance.tests_run || 0) >= 1;
                checks.push({
                    name: "agent_ran_tests",
                    pass: ran,
                    detail: `tests_run=${session.compliance.tests_run}`,
                });
            }

            return { pass: checks.every((c) => c.pass), checks };
        },
    },

    "feature-spec-plan": {
        id: "feature-spec-plan",
        title: "Author OpenSpec change without editing src",
        prompt: [
            "Create an OpenSpec change under `.opow/changes/add-rate-limiter/` for adding an in-memory rate limiter.",
            "Include `proposal.md`, `design.md`, `tasks.md`, and `specs/rate-limit/spec.md` containing `Given` / `When` / `Then` scenarios.",
            "Do NOT modify `src/server.js`.",
        ].join("\n"),
        setup(workDir) {
            writeFiles(workDir, {
                "src/server.js": "function handleRequest(req) {\n    return { status: 200, ok: true };\n}\nmodule.exports = { handleRequest };\n",
            });
            initGitRepo(workDir);
        },
        grade(workDir) {
            const checks = [];
            const changesRoot = path.join(workDir, ".opow", "changes");
            let changeDir = null;
            if (fs.existsSync(changesRoot)) {
                const dirs = fs.readdirSync(changesRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
                if (dirs.length > 0) {
                    changeDir = path.join(changesRoot, dirs[0].name);
                }
            }
            checks.push({
                name: "change_dir_exists",
                pass: Boolean(changeDir),
                detail: changeDir ? `Found ${path.relative(workDir, changeDir)}` : "No directory under .opow/changes/",
            });

            const requiredDocs = ["proposal.md", "design.md", "tasks.md"];
            const docsOk = Boolean(changeDir) && requiredDocs.every((f) => {
                const p = path.join(changeDir, f);
                return fs.existsSync(p) && fs.readFileSync(p, "utf8").trim().length > 0;
            });
            checks.push({
                name: "required_docs_nonempty",
                pass: docsOk,
                detail: docsOk ? "proposal.md, design.md, tasks.md present" : "Missing or empty proposal/design/tasks",
            });

            let specFiles = [];
            if (changeDir) {
                specFiles = findFilesRecursive(path.join(changeDir, "specs"), (_f, name) => name.endsWith(".md"));
            }
            const hasGwt = specFiles.some((sf) => {
                const txt = fs.readFileSync(sf, "utf8");
                return /\bGiven\b/i.test(txt) && /\bWhen\b/i.test(txt) && /\bThen\b/i.test(txt);
            });
            checks.push({
                name: "delta_spec_has_gwt",
                pass: specFiles.length > 0 && hasGwt,
                detail: specFiles.length > 0
                    ? `Found ${specFiles.length} spec file(s), GWT=${hasGwt}`
                    : "No spec .md files under specs/",
            });

            const changed = getGitChangedFiles(workDir);
            const serverUntouched = !changed.includes("src/server.js");
            checks.push({
                name: "src_server_untouched",
                pass: serverUntouched,
                detail: serverUntouched ? "src/server.js untouched" : "src/server.js was modified",
            });

            return { pass: checks.every((c) => c.pass), checks };
        },
    },

    "explore-impact": {
        id: "explore-impact",
        title: "Analyze symbol & file impact into IMPACT_REPORT.md",
        prompt: [
            "Analyze the impact of migrating `TOKEN_TTL_SEC` from seconds to milliseconds.",
            "Write your findings to `IMPACT_REPORT.md` listing affected files, symbols, and migration risks.",
            "Do NOT modify any files under `src/`.",
        ].join("\n"),
        setup(workDir) {
            writeFiles(workDir, {
                "src/config.js": "const TOKEN_TTL_SEC = 3600;\nmodule.exports = { TOKEN_TTL_SEC };\n",
                "src/session.js": [
                    "const { TOKEN_TTL_SEC } = require('./config');",
                    "function createSession(userId, nowSec = Date.now() / 1000) {",
                    "    return { userId, expiresAt: nowSec + TOKEN_TTL_SEC };",
                    "}",
                    "function isExpired(session, nowSec = Date.now() / 1000) {",
                    "    return nowSec >= session.expiresAt;",
                    "}",
                    "module.exports = { createSession, isExpired };",
                    "",
                ].join("\n"),
                "src/auth.js": [
                    "const { createSession, isExpired } = require('./session');",
                    "function login(userId) { return createSession(userId); }",
                    "function verify(session) { return !isExpired(session); }",
                    "module.exports = { login, verify };",
                    "",
                ].join("\n"),
                "src/utils.js": "function slugify(s) { return String(s).trim().toLowerCase(); }\nmodule.exports = { slugify };\n",
            });
            initGitRepo(workDir);
        },
        grade(workDir) {
            const checks = [];
            const reportPath = path.join(workDir, "IMPACT_REPORT.md");
            const exists = fs.existsSync(reportPath) && fs.readFileSync(reportPath, "utf8").trim().length > 0;
            const content = exists ? fs.readFileSync(reportPath, "utf8") : "";

            checks.push({
                name: "report_exists",
                pass: exists,
                detail: exists ? "IMPACT_REPORT.md created" : "IMPACT_REPORT.md missing or empty",
            });

            const filesMentioned = ["config.js", "session.js", "auth.js"].every((f) => content.includes(f));
            checks.push({
                name: "affected_files_listed",
                pass: filesMentioned,
                detail: filesMentioned ? "All 3 affected files mentioned" : "Missing one of config.js, session.js, auth.js",
            });

            const symbolsMentioned = ["TOKEN_TTL_SEC", "createSession", "isExpired"].every((sym) => content.includes(sym));
            checks.push({
                name: "affected_symbols_listed",
                pass: symbolsMentioned,
                detail: symbolsMentioned ? "All key symbols mentioned" : "Missing one of TOKEN_TTL_SEC, createSession, isExpired",
            });

            const changed = getGitChangedFiles(workDir);
            const srcUntouched = !changed.some((f) => f.startsWith("src/"));
            checks.push({
                name: "src_untouched",
                pass: srcUntouched,
                detail: srcUntouched ? "No files under src/ modified" : `Modified src files: ${changed.filter((f) => f.startsWith("src/")).join(", ")}`,
            });

            return { pass: checks.every((c) => c.pass), checks };
        },
    },
};

function listTasks() {
    return Object.values(GOLDEN_TASKS).map(({ id, title, prompt }) => ({ id, title, prompt }));
}

function getTask(taskId) {
    return GOLDEN_TASKS[taskId] || null;
}

module.exports = {
    GOLDEN_TASKS,
    listTasks,
    getTask,
};
