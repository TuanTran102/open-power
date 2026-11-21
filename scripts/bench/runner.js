const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { GOLDEN_TASKS, getTask, setupTaskWorkspace, gradeTask } = require("./tasks");
const { parseTranscriptFile } = require("./transcript");
const { compareRuns, formatCompareReport, aggregateSessions } = require("./compare");

function runShellCommand(cmd, cwd, env = {}, timeout = 300000) {
    return childProcess.spawnSync("sh", ["-c", cmd], {
        cwd,
        env: { ...process.env, ...env },
        encoding: "utf8",
        timeout,
        maxBuffer: 20 * 1024 * 1024,
    });
}

function commitSetupChangesIfAny(workDir) {
    const status = childProcess.execFileSync("git", ["status", "--porcelain"], {
        cwd: workDir,
        encoding: "utf8",
    }).trim();
    if (status) {
        childProcess.execFileSync("git", ["add", "-A"], { cwd: workDir, stdio: "ignore" });
        childProcess.execFileSync("git", ["commit", "-m", "chore: benchmark variant setup"], {
            cwd: workDir,
            stdio: "ignore",
        });
    }
}

function invokeRunnerAdapter({ runner, runnerCmd, prompt, promptFile, workDir, logFile, variant, taskId, runIndex, timeout }) {
    if (runner === "claude") {
        const res = childProcess.spawnSync(
            "claude",
            ["-p", prompt, "--output-format", "stream-json", "--verbose"],
            { cwd: workDir, encoding: "utf8", timeout, maxBuffer: 20 * 1024 * 1024 }
        );
        if (res.stdout) fs.writeFileSync(logFile, res.stdout, "utf8");
        return { status: res.status ?? 1, error: res.error ? res.error.message : null };
    }

    if (runner === "codex") {
        const res = childProcess.spawnSync(
            "codex",
            ["exec", "--json", prompt],
            { cwd: workDir, encoding: "utf8", timeout, maxBuffer: 20 * 1024 * 1024 }
        );
        if (res.stdout) fs.writeFileSync(logFile, res.stdout, "utf8");
        return { status: res.status ?? 1, error: res.error ? res.error.message : null };
    }

    if (runner === "cmd") {
        if (!runnerCmd) {
            throw new Error("--runner-cmd is required when --runner cmd is used.");
        }
        const substituted = runnerCmd
            .replace(/\{prompt_file\}/g, promptFile)
            .replace(/\{cwd\}/g, workDir)
            .replace(/\{log\}/g, logFile)
            .replace(/\{variant\}/g, variant)
            .replace(/\{task\}/g, taskId)
            .replace(/\{run\}/g, String(runIndex));

        const res = runShellCommand(
            substituted,
            workDir,
            {
                BENCH_PROMPT: prompt,
                BENCH_PROMPT_FILE: promptFile,
                BENCH_CWD: workDir,
                BENCH_LOG: logFile,
                BENCH_VARIANT: variant,
                BENCH_TASK: taskId,
                BENCH_RUN: String(runIndex),
            },
            timeout
        );
        if (!fs.existsSync(logFile) && res.stdout && res.stdout.trim().startsWith("{")) {
            fs.writeFileSync(logFile, res.stdout, "utf8");
        }
        return { status: res.status ?? 1, error: res.error ? res.error.message : null };
    }

    throw new Error(`Unknown runner "${runner}". Expected: claude, codex, or cmd.`);
}

function resolveTaskIds(taskOpt) {
    if (!taskOpt || taskOpt === "all") {
        return Object.keys(GOLDEN_TASKS);
    }
    const ids = String(taskOpt)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    for (const id of ids) {
        getTask(id);
    }
    return ids;
}

/**
 * Execute golden benchmark tasks across 1 or 2 (A/B) variants and grade automatically.
 * @param {object} options
 * @returns {object}
 */
function runBenchmarkSuite(options = {}) {
    const runner = options.runner || "cmd";
    const taskIds = resolveTaskIds(options.task || "all");
    const runs = Math.max(1, Number(options.runs) || 1);
    const timeout = Math.max(1000, Number(options.timeout) || 300000);
    const includeSubagents = options.includeSubagents !== false;
    const labelA = options.labelA || "A";
    const labelB = options.labelB || "B";
    const isAB = Boolean(options.ab || options.setupA || options.setupB);

    const outDir = options.outDir
        ? path.resolve(options.outDir)
        : fs.mkdtempSync(path.join(os.tmpdir(), "opow-bench-run-"));
    fs.mkdirSync(outDir, { recursive: true });

    const variants = [{ key: "A", label: labelA, setupCmd: options.setupA || null }];
    if (isAB) {
        variants.push({ key: "B", label: labelB, setupCmd: options.setupB || null });
    }

    const records = [];
    const sessionsByVariant = { A: [], B: [] };
    const passCounts = { A: { passed: 0, total: 0 }, B: { passed: 0, total: 0 } };

    for (const variant of variants) {
        for (const taskId of taskIds) {
            for (let r = 1; r <= runs; r++) {
                const runSlug = `${variant.key}-${taskId}-r${r}`;
                const runMetaDir = path.join(outDir, "meta", runSlug);
                const workDir = path.join(outDir, "workspaces", runSlug);
                fs.mkdirSync(runMetaDir, { recursive: true });

                const { prompt } = setupTaskWorkspace(taskId, workDir);
                if (variant.setupCmd) {
                    const setupRes = runShellCommand(variant.setupCmd, workDir, {
                        BENCH_CWD: workDir,
                        BENCH_VARIANT: variant.key,
                        BENCH_TASK: taskId,
                    }, timeout);
                    if (setupRes.status !== 0) {
                        throw new Error(`Setup command failed for ${runSlug}: ${setupRes.stderr || setupRes.stdout}`);
                    }
                    commitSetupChangesIfAny(workDir);
                }

                const promptFile = path.join(runMetaDir, "prompt.txt");
                const logFile = path.join(runMetaDir, "transcript.jsonl");
                fs.writeFileSync(promptFile, prompt, "utf8");

                const execRes = invokeRunnerAdapter({
                    runner,
                    runnerCmd: options.runnerCmd,
                    prompt,
                    promptFile,
                    workDir,
                    logFile,
                    variant: variant.key,
                    taskId,
                    runIndex: r,
                    timeout,
                });

                let parsedTranscript = null;
                if (fs.existsSync(logFile) && fs.readFileSync(logFile, "utf8").trim().length > 0) {
                    try {
                        parsedTranscript = parseTranscriptFile(logFile, { includeSubagents });
                        sessionsByVariant[variant.key].push(parsedTranscript);
                    } catch {
                        parsedTranscript = null;
                    }
                }

                const grade = gradeTask(taskId, workDir, parsedTranscript);
                passCounts[variant.key].total += 1;
                if (grade.passed) passCounts[variant.key].passed += 1;

                records.push({
                    variant: variant.key,
                    label: variant.label,
                    taskId,
                    run: r,
                    workDir,
                    logFile: fs.existsSync(logFile) ? logFile : null,
                    exitStatus: execRes.status,
                    runnerError: execRes.error,
                    grade,
                    transcript: parsedTranscript,
                });
            }
        }
    }

    let comparison = null;
    if (isAB && sessionsByVariant.A.length > 0 && sessionsByVariant.B.length > 0) {
        comparison = compareRuns(sessionsByVariant.A, sessionsByVariant.B, {
            labelA,
            labelB,
            passA: passCounts.A,
            passB: passCounts.B,
        });
    }

    const summaryA = sessionsByVariant.A.length > 0
        ? aggregateSessions(sessionsByVariant.A, passCounts.A)
        : { runs: passCounts.A.total, pass: passCounts.A, metrics: null };

    return {
        mode: isAB ? "ab" : "single",
        runner,
        outDir,
        taskIds,
        runsPerTask: runs,
        passCounts,
        summaryA,
        comparison,
        records,
    };
}

function formatRunReport(result, format = "text") {
    if (format === "json") {
        return JSON.stringify(result, null, 2);
    }

    const lines = [];
    if (format === "md") {
        lines.push(`## Benchmark Suite Run (${result.mode.toUpperCase()} — runner: \`${result.runner}\`)`);
        lines.push(`- **Workspace Root**: \`${result.outDir}\``);
        lines.push("");
        lines.push("| Variant | Task | Run | Grade | Score | Tokens (Total) | Subagent % |");
        lines.push("|---|---|---:|---|---:|---:|---:|");
        for (const rec of result.records) {
            const tok = rec.transcript ? rec.transcript.tokens.total.toLocaleString("en-US") : "n/a";
            const subPct = rec.transcript ? `${rec.transcript.breakdown?.subagent_token_share_pct ?? 0}%` : "n/a";
            lines.push(
                `| ${rec.label} | \`${rec.taskId}\` | ${rec.run} | ${rec.grade.passed ? "PASS" : "FAIL"} | ${rec.grade.score}/${rec.grade.maxScore} | ${tok} | ${subPct} |`
            );
        }
        if (result.comparison) {
            lines.push("");
            lines.push(formatCompareReport(result.comparison, "md"));
        }
        return lines.join("\n");
    }

    lines.push(`Benchmark Suite Run [${result.mode.toUpperCase()}] runner=${result.runner}`);
    lines.push(`OutDir: ${result.outDir}`);
    lines.push("");
    for (const rec of result.records) {
        const badge = rec.grade.passed ? "PASS" : "FAIL";
        const tok = rec.transcript ? `${rec.transcript.tokens.total.toLocaleString("en-US")} tok` : "no-log";
        const sub = rec.transcript ? `sub=${rec.transcript.breakdown?.subagent_token_share_pct ?? 0}%` : "";
        lines.push(
            `  [${rec.label}] ${rec.taskId.padEnd(20)} r${rec.run}  ${badge} (${rec.grade.score}/${rec.grade.maxScore})  ${tok}  ${sub}`
        );
    }
    if (result.comparison) {
        lines.push("");
        lines.push(formatCompareReport(result.comparison, "text"));
    }
    return lines.join("\n");
}

module.exports = {
    runBenchmarkSuite,
    formatRunReport,
};
