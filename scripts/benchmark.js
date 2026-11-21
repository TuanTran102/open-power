#!/usr/bin/env node

const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { resolveSha, exportVariant, changedFiles } = require("./bench/git-src");
const { computeStaticSnapshot, diffStatic } = require("./bench/static");
const { listTasks, getTask } = require("./bench/tasks");
const { prepareWorkspace } = require("./bench/workspace");
const { parseSession, defaultBrainDir } = require("./bench/transcript");
const { aggregate, renderMarkdown } = require("./bench/report");

const HELP_TEXT = `Usage: npm run bench -- <command> [options]

Commands:
  prepare [options]   Export A/B variants, build isolated workspaces, output JSON plan
      --base <ref>        Base git ref for A (default: HEAD)
      --head <ref>        Head git ref or WORKTREE for B (default: WORKTREE)
      --project <path>    Copy an existing opow project instead of golden fixtures
      --task <ids|all>    Comma-separated golden task IDs or "all" (default: all)
      --prompt "<text>"   Custom task prompt (required with --project)
      --check "<cmd>"     Optional shell command to grade custom --prompt (exit 0 = pass)
      --runs <N>          Runs per variant (default: 1)
      --target <name>     opow install target (default: antigravity)
      --brain <dir>       Override Antigravity brain directory

  record --run <dir> --job <id> --conv <conversationId>
      Record a subagent conversationId for a prepared job

  report --run <dir>
      Parse transcripts, grade workspaces, and write report.md + report.json

  clean --run <dir>
      Remove temporary workspaces for a run while keeping reports

  link
      Install bench-ab skill and /bench workflow into .agent/
`;

function formatTimestamp(d = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
        d.getFullYear() +
        pad(d.getMonth() + 1) +
        pad(d.getDate()) +
        pad(d.getHours()) +
        pad(d.getMinutes()) +
        pad(d.getSeconds())
    );
}

function parseArgs(argv) {
    const positional = [];
    const options = {
        base: "HEAD",
        head: "WORKTREE",
        task: "all",
        runs: 1,
        target: "antigravity",
    };

    let i = 0;
    while (i < argv.length) {
        const tok = argv[i];
        if (tok === "--") {
            i += 1;
            continue;
        }
        if (tok === "-h" || tok === "--help") {
            options.help = true;
            i += 1;
            continue;
        }
        if (tok.startsWith("--")) {
            const eq = tok.indexOf("=");
            const key = eq !== -1 ? tok.slice(2, eq) : tok.slice(2);
            let val;
            if (eq !== -1) {
                val = tok.slice(eq + 1);
            } else {
                if (i + 1 >= argv.length) {
                    throw new Error(`Missing value for option --${key}`);
                }
                val = argv[++i];
            }
            if (key === "runs") {
                const n = Number(val);
                if (!Number.isInteger(n) || n < 1) {
                    throw new Error(`Invalid --runs value: ${val}`);
                }
                options.runs = n;
            } else {
                options[key] = val;
            }
            i += 1;
            continue;
        }
        positional.push(tok);
        i += 1;
    }

    return { command: positional[0] || null, options };
}

function ensureBenchGitignore(repoRoot) {
    const gitignorePath = path.join(repoRoot, ".gitignore");
    if (!fs.existsSync(gitignorePath)) {
        fs.writeFileSync(gitignorePath, ".bench/\n", "utf8");
        return;
    }
    const content = fs.readFileSync(gitignorePath, "utf8");
    const lines = content.split(/\r?\n/).map((l) => l.trim());
    if (!lines.includes(".bench/") && !lines.includes(".bench")) {
        const prefix = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
        fs.writeFileSync(gitignorePath, `${content}${prefix}.bench/\n`, "utf8");
    }
}

function buildSubagentPrompt(wsDir, taskPrompt) {
    return [
        `Benchmark job. Work ONLY inside ${wsDir} (absolute paths; \`cd ${wsDir}\` for every command).`,
        `Your ONLY rules/skills/workflows are in ${wsDir}/.agent/ — read the relevant ones there before acting and IGNORE any skills/rules/workflows listed in your system prompt.`,
        `Never read/modify outside ${wsDir}. Do not ask questions; assume reasonably.`,
        `Task: ${taskPrompt}`,
        `Finish with \`DONE: <one line>\`.`,
    ].join(" ");
}

function cmdPrepare(options, repoRoot = path.resolve(__dirname, "..")) {
    const baseRef = options.base || "HEAD";
    const headRef = options.head || "WORKTREE";

    const changes = changedFiles(baseRef, headRef, repoRoot);
    if (changes.length === 0) {
        throw new Error(`No changes detected in bin/, src/, or package.json between ${baseRef} and ${headRef}.`);
    }

    const projectPath = options.project ? path.resolve(options.project) : null;
    if (projectPath) {
        if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) {
            throw new Error(`Project path does not exist or is not a directory: ${projectPath}`);
        }
        if (!options.prompt || !options.prompt.trim()) {
            throw new Error(`Project mode (--project) requires --prompt "<text>".`);
        }
    }

    let taskDefs;
    if (options.prompt) {
        taskDefs = [{ id: "custom", prompt: options.prompt.trim(), isCustom: true }];
    } else {
        const requested = options.task === "all"
            ? listTasks().map((t) => t.id)
            : String(options.task).split(",").map((s) => s.trim()).filter(Boolean);
        if (requested.length === 0) {
            throw new Error("No tasks selected.");
        }
        taskDefs = requested.map((id) => {
            const t = getTask(id);
            if (!t) throw new Error(`Unknown golden task: ${id}`);
            return { id: t.id, prompt: t.prompt, taskObj: t, isCustom: false };
        });
    }

    const ts = formatTimestamp();
    const runDir = path.join(repoRoot, ".bench", ts);
    const tmpRunDir = path.join(os.tmpdir(), "opow-bench", ts);
    fs.mkdirSync(runDir, { recursive: true });
    fs.mkdirSync(tmpRunDir, { recursive: true });
    ensureBenchGitignore(repoRoot);

    const srcA = path.join(tmpRunDir, "src-A");
    const srcB = path.join(tmpRunDir, "src-B");
    exportVariant(baseRef, srcA, repoRoot);
    exportVariant(headRef, srcB, repoRoot);

    const baseSha = resolveSha(baseRef, repoRoot);
    const warnings = [];
    const jobs = [];

    for (let run = 1; run <= options.runs; run += 1) {
        for (const t of taskDefs) {
            for (const variant of ["A", "B"]) {
                const id = `${variant}-${t.id}-${run}`;
                const wsDir = path.join(tmpRunDir, id);
                const variantSrc = variant === "A" ? srcA : srcB;
                const res = prepareWorkspace({
                    variantSrc,
                    wsDir,
                    task: t.isCustom ? null : t.taskObj,
                    projectPath,
                    target: options.target || "antigravity",
                });
                for (const w of res.warnings || []) {
                    if (!warnings.includes(w)) warnings.push(w);
                }
                jobs.push({
                    id,
                    variant,
                    task: t.id,
                    run,
                    workspace: wsDir,
                    prompt: buildSubagentPrompt(wsDir, t.prompt),
                });
            }
        }
    }

    const plan = {
        ts,
        repoRoot,
        runDir,
        tmpRunDir,
        srcA,
        srcB,
        baseRef,
        baseSha,
        headRef,
        projectPath,
        tasks: taskDefs.map((t) => t.id),
        customPrompt: options.prompt || null,
        check: options.check || null,
        runs: options.runs,
        target: options.target || "antigravity",
        brainDir: options.brain || defaultBrainDir(),
        changes,
        warnings,
        jobs,
    };

    fs.writeFileSync(path.join(runDir, "plan.json"), JSON.stringify(plan, null, 2) + "\n", "utf8");

    const output = {
        runDir,
        jobs: jobs.map(({ id, variant, task, run, workspace, prompt }) => ({
            id,
            variant,
            task,
            run,
            workspace,
            prompt,
        })),
    };
    return { plan, output };
}

function cmdRecord(options) {
    if (!options.run || !options.job || !options.conv) {
        throw new Error("record requires --run <dir> --job <id> --conv <conversationId>");
    }
    const runDir = path.resolve(options.run);
    const jobsPath = path.join(runDir, "jobs.json");
    let map = {};
    if (fs.existsSync(jobsPath)) {
        map = JSON.parse(fs.readFileSync(jobsPath, "utf8"));
    }
    map[options.job] = options.conv;
    fs.writeFileSync(jobsPath, JSON.stringify(map, null, 2) + "\n", "utf8");
    return { recorded: options.job, conv: options.conv };
}

function gradeCustomCheck(checkCmd, wsDir) {
    try {
        childProcess.execSync(checkCmd, {
            cwd: wsDir,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 60000,
        });
        return { pass: true, checks: [{ name: "custom_check", pass: true, detail: "exit 0" }] };
    } catch (err) {
        return {
            pass: false,
            checks: [{ name: "custom_check", pass: false, detail: (err.stderr || err.message || "").slice(0, 180) }],
        };
    }
}

function cmdReport(options) {
    if (!options.run) {
        throw new Error("report requires --run <dir>");
    }
    const runDir = path.resolve(options.run);
    const planPath = path.join(runDir, "plan.json");
    if (!fs.existsSync(planPath)) {
        throw new Error(`plan.json not found in ${runDir}`);
    }
    const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
    const jobsPath = path.join(runDir, "jobs.json");
    const convMap = fs.existsSync(jobsPath) ? JSON.parse(fs.readFileSync(jobsPath, "utf8")) : {};

    const gradedJobs = plan.jobs.map((job) => {
        const convId = convMap[job.id];
        if (!convId) {
            return { ...job, convId: null, status: "FAILED", error: "no convId recorded", pass: false, checks: [], session: null };
        }
        const session = parseSession(convId, { brainDir: plan.brainDir });
        if (!session) {
            return { ...job, convId, status: "FAILED", error: `transcript not found for ${convId}`, pass: false, checks: [], session: null };
        }

        let gradeRes = { pass: null, checks: [] };
        if (!plan.customPrompt) {
            const taskObj = getTask(job.task);
            if (taskObj) {
                gradeRes = taskObj.grade(job.workspace, session);
            }
        } else if (plan.check) {
            gradeRes = gradeCustomCheck(plan.check, job.workspace);
        }

        return {
            ...job,
            convId,
            status: "OK",
            pass: gradeRes.pass,
            checks: gradeRes.checks,
            session,
        };
    });

    let staticDiff = null;
    if (fs.existsSync(plan.srcA) && fs.existsSync(plan.srcB)) {
        staticDiff = diffStatic(computeStaticSnapshot(plan.srcA), computeStaticSnapshot(plan.srcB));
    }

    const agg = aggregate(gradedJobs, plan.warnings || []);
    const reportJsonPath = path.join(runDir, "report.json");
    const reportMdPath = path.join(runDir, "report.md");

    const reportData = {
        meta: {
            ts: plan.ts,
            baseRef: plan.baseRef,
            baseSha: plan.baseSha,
            headRef: plan.headRef,
            projectPath: plan.projectPath,
            tasks: plan.tasks,
            customPrompt: Boolean(plan.customPrompt),
            runs: plan.runs,
            runDir,
            reportJsonPath,
            tmpRunDir: plan.tmpRunDir,
        },
        changes: plan.changes,
        staticDiff,
        agg,
        jobs: gradedJobs,
    };

    const markdown = renderMarkdown(reportData);
    fs.writeFileSync(reportJsonPath, JSON.stringify(reportData, null, 2) + "\n", "utf8");
    fs.writeFileSync(reportMdPath, markdown, "utf8");

    return { markdown, reportData, reportMdPath, reportJsonPath };
}

function cmdClean(options) {
    if (!options.run) {
        throw new Error("clean requires --run <dir>");
    }
    const runDir = path.resolve(options.run);
    const planPath = path.join(runDir, "plan.json");
    if (!fs.existsSync(planPath)) {
        throw new Error(`plan.json not found in ${runDir}`);
    }
    const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
    if (plan.tmpRunDir && fs.existsSync(plan.tmpRunDir)) {
        fs.rmSync(plan.tmpRunDir, { recursive: true, force: true });
    }
    return { cleaned: plan.tmpRunDir };
}

function cmdLink(repoRoot = path.resolve(__dirname, "..")) {
    const srcSkill = path.join(repoRoot, "scripts", "bench", "agent", "skills", "bench-ab");
    const dstSkill = path.join(repoRoot, ".agent", "skills", "bench-ab");
    const srcWf = path.join(repoRoot, "scripts", "bench", "agent", "workflows", "bench.md");
    const dstWf = path.join(repoRoot, ".agent", "workflows", "bench.md");

    fs.mkdirSync(path.dirname(dstSkill), { recursive: true });
    fs.rmSync(dstSkill, { recursive: true, force: true });
    fs.cpSync(srcSkill, dstSkill, { recursive: true });

    fs.mkdirSync(path.dirname(dstWf), { recursive: true });
    fs.copyFileSync(srcWf, dstWf);

    return { skill: dstSkill, workflow: dstWf };
}

function main() {
    const { command, options } = parseArgs(process.argv.slice(2));
    if (options.help || !command) {
        process.stdout.write(HELP_TEXT);
        return;
    }

    if (command === "prepare") {
        const { output } = cmdPrepare(options);
        process.stdout.write(JSON.stringify(output, null, 2) + "\n");
    } else if (command === "record") {
        const res = cmdRecord(options);
        process.stdout.write(JSON.stringify(res) + "\n");
    } else if (command === "report") {
        const { markdown } = cmdReport(options);
        process.stdout.write(markdown);
    } else if (command === "clean") {
        const res = cmdClean(options);
        process.stdout.write(JSON.stringify(res) + "\n");
    } else if (command === "link") {
        const res = cmdLink();
        process.stdout.write(`Linked bench-ab skill -> ${res.skill}\nLinked /bench workflow -> ${res.workflow}\n`);
    } else {
        throw new Error(`Unknown command: ${command}\n\n${HELP_TEXT}`);
    }
}

if (require.main === module) {
    try {
        main();
    } catch (err) {
        process.stderr.write(`Error: ${err.message}\n`);
        process.exit(1);
    }
}

module.exports = {
    parseArgs,
    cmdPrepare,
    cmdRecord,
    cmdReport,
    cmdClean,
    cmdLink,
};
