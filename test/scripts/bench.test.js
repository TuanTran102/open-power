const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { parseArgs, cmdPrepare, cmdRecord, cmdReport, cmdClean } = require("../../scripts/benchmark");
const { exportVariant, changedFiles } = require("../../scripts/bench/git-src");
const { parseSession } = require("../../scripts/bench/transcript");
const { aggregate, renderMarkdown } = require("../../scripts/bench/report");
const { getTask } = require("../../scripts/bench/tasks");

const tempDirs = [];
function makeTempDir(prefix) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
}

after(() => {
    for (const d of tempDirs) {
        fs.rmSync(d, { recursive: true, force: true });
    }
});

describe("benchmark CLI parseArgs", () => {
    it("parses prepare options and defaults", () => {
        const parsed = parseArgs(["prepare", "--task", "bugfix-tdd", "--runs", "2", "--project", "/tmp/proj", "--prompt", "do x"]);
        assert.equal(parsed.command, "prepare");
        assert.equal(parsed.options.base, "HEAD");
        assert.equal(parsed.options.head, "WORKTREE");
        assert.equal(parsed.options.task, "bugfix-tdd");
        assert.equal(parsed.options.runs, 2);
        assert.equal(parsed.options.project, "/tmp/proj");
        assert.equal(parsed.options.prompt, "do x");
    });

    it("throws on invalid --runs", () => {
        assert.throws(() => parseArgs(["prepare", "--runs", "0"]), /Invalid --runs/);
    });
});

describe("parseSession (Antigravity + subagent recursion)", () => {
    it("parses main and child transcripts, tokens, rereads, and compliance", () => {
        const brainDir = makeTempDir("bench-brain-");
        const mainId = "11111111-1111-1111-1111-111111111111";
        const subId = "22222222-2222-2222-2222-222222222222";

        const writeLog = (id, records) => {
            const logDir = path.join(brainDir, id, ".system_generated", "logs");
            fs.mkdirSync(logDir, { recursive: true });
            fs.writeFileSync(
                path.join(logDir, "transcript.jsonl"),
                records.map((r) => JSON.stringify(r)).join("\n") + "\n",
                "utf8"
            );
        };

        writeLog(mainId, [
            { type: "USER_INPUT", created_at: "2026-11-21T10:00:00Z", content: "Fix bug" },
            {
                type: "PLANNER_RESPONSE",
                created_at: "2026-11-21T10:00:05Z",
                model: "claude-opus",
                input_tokens: 1000,
                cache_read_tokens: 4000,
                output_tokens: 200,
                tool_calls: [
                    { name: "read_file", args: { Path: "/ws/.agent/skills/opow-tdd/SKILL.md" } },
                    { name: "read_file", args: { Path: "/ws/src/a.js" } },
                    { name: "read_file", args: { Path: "/ws/src/a.js" } }, // reread!
                    {
                        name: "invoke_subagent",
                        args: { TypeName: "self" },
                        response: JSON.stringify({ conversationId: subId }),
                    },
                ],
            },
        ]);

        writeLog(subId, [
            { type: "USER_INPUT", created_at: "2026-11-21T10:00:06Z", content: "Subtask" },
            {
                type: "PLANNER_RESPONSE",
                created_at: "2026-11-21T10:00:10Z",
                model: "claude-opus",
                input_tokens: 500,
                cache_read_tokens: 2000,
                output_tokens: 100,
                tool_calls: [
                    { name: "edit_file", args: { Path: "/ws/src/a.js" } },
                    { name: "run_command", args: { CommandLine: "npm test" } },
                ],
            },
        ]);

        const session = parseSession(mainId, { brainDir });
        assert.ok(session);
        assert.equal(session.tokens.uncached, 1500);
        assert.equal(session.tokens.cache_read, 6000);
        assert.equal(session.tokens.output, 300);
        assert.equal(session.tokens.total, 7800);
        assert.equal(session.tokens.peak_context, 5000);
        assert.equal(session.steps.llm_steps, 2);
        assert.equal(session.steps.user_turns, 1); // main only
        assert.equal(session.tools.reads, 3);
        assert.equal(session.tools.edits, 1);
        assert.equal(session.tools.commands, 1);
        assert.equal(session.tools.subagents, 1);
        assert.equal(session.waste.rereads, 1);
        assert.equal(session.compliance.tests_run, 1);
        assert.deepEqual(session.compliance.skills_read, ["opow-tdd"]);
        assert.equal(session.subagent_share_pct, 33.3);
    });
});

describe("aggregate & renderMarkdown", () => {
    it("computes BETTER verdict and renders all 8 sections in order", () => {
        const makeJob = (id, variant, pass, total, uncached) => ({
            id,
            variant,
            task: "bugfix-tdd",
            run: 1,
            status: "OK",
            pass,
            session: {
                tokens: { uncached, cache_read: 5000, output: 300, total, cache_hit_pct: 70, peak_context: 4000 },
                steps: { llm_steps: variant === "A" ? 10 : 6, user_turns: 1 },
                tools: { total: 10, reads: variant === "A" ? 6 : 3, searches: 2, edits: 1, commands: 1, subagents: 0 },
                waste: { rereads: 0, tool_errors: 0, edit_retries: 0 },
                active_duration_ms: 12000,
                subagent_share_pct: 0,
                compliance: { skills_read: ["opow-tdd"], tests_run: 1, used_worktree: false, commits: 0 },
                models: ["test-model"],
            },
        });

        const jobs = [
            makeJob("A-bugfix-tdd-1", "A", true, 10000, 3000),
            makeJob("B-bugfix-tdd-1", "B", true, 7000, 1500),
        ];
        const agg = aggregate(jobs);
        assert.equal(agg.verdict, "BETTER");

        const md = renderMarkdown({
            meta: {
                ts: "20261121210000",
                baseRef: "HEAD",
                baseSha: "abc1234",
                headRef: "WORKTREE",
                projectPath: null,
                tasks: ["bugfix-tdd"],
                customPrompt: false,
                runs: 1,
                runDir: "/tmp/run",
                reportJsonPath: "/tmp/run/report.json",
                tmpRunDir: "/tmp/ws",
            },
            changes: [{ file: "src/rules/brief.md", status: "M" }],
            staticDiff: {
                categories: [{ category: "rules", a: 100, b: 90, delta: -10, deltaPct: -10 }],
                flows: [{ flow: "opow-fast", a: 500, b: 450, delta: -50, deltaPct: -10 }],
                total: { a: 100, b: 90, delta: -10, deltaPct: -10 },
            },
            agg,
            jobs,
        });

        const expectedHeadings = [
            "# opow A/B Benchmark Report",
            "## Verdict: BETTER",
            "## 1. Changes Under Test",
            "## 2. Static Prompt Budget (~tokens)",
            "## 3. Outcome",
            "## 4. Runtime Metrics (median)",
            "## 5. Per-Task Breakdown",
            "## 6. Compliance",
            "## 7. Warnings",
            "## 8. Notes & Limitations",
            "## Artifacts",
        ];
        let lastIdx = -1;
        for (const h of expectedHeadings) {
            const idx = md.indexOf(h);
            assert.ok(idx > lastIdx, `Missing or out-of-order heading: ${h}`);
            lastIdx = idx;
        }
    });
});

describe("git-src exportVariant & changedFiles", () => {
    it("exports HEAD vs WORKTREE including untracked files and excluding deleted files", () => {
        const repo = makeTempDir("bench-repo-");
        fs.mkdirSync(path.join(repo, "bin"), { recursive: true });
        fs.mkdirSync(path.join(repo, "src"), { recursive: true });
        fs.writeFileSync(path.join(repo, "package.json"), '{"name":"t"}');
        fs.writeFileSync(path.join(repo, "bin", "cli.js"), "// cli v1\n");
        fs.writeFileSync(path.join(repo, "src", "old.js"), "// old\n");

        childProcess.execFileSync("git", ["init", "-b", "main"], { cwd: repo });
        childProcess.execFileSync("git", ["config", "user.email", "t@example.com"], { cwd: repo });
        childProcess.execFileSync("git", ["config", "user.name", "T"], { cwd: repo });
        childProcess.execFileSync("git", ["add", "."], { cwd: repo });
        childProcess.execFileSync("git", ["commit", "-m", "init"], { cwd: repo });

        // Uncommitted changes: modify cli.js, delete old.js, add new.js
        fs.writeFileSync(path.join(repo, "bin", "cli.js"), "// cli v2\n");
        fs.unlinkSync(path.join(repo, "src", "old.js"));
        fs.writeFileSync(path.join(repo, "src", "new.js"), "// new\n");

        const changes = changedFiles("HEAD", "WORKTREE", repo);
        assert.deepEqual(changes, [
            { file: "bin/cli.js", status: "M" },
            { file: "src/new.js", status: "A" },
            { file: "src/old.js", status: "D" },
        ]);

        const outA = makeTempDir("bench-expA-");
        const outB = makeTempDir("bench-expB-");
        exportVariant("HEAD", outA, repo);
        exportVariant("WORKTREE", outB, repo);

        assert.ok(fs.existsSync(path.join(outA, "src", "old.js")));
        assert.ok(!fs.existsSync(path.join(outB, "src", "old.js")));
        assert.ok(fs.existsSync(path.join(outB, "src", "new.js")));
        assert.equal(fs.readFileSync(path.join(outB, "bin", "cli.js"), "utf8"), "// cli v2\n");
    });
});

describe("golden task graders", () => {
    it("bugfix-tdd fails on initial fixture and passes when fixed", () => {
        const ws = makeTempDir("bench-task-");
        const task = getTask("bugfix-tdd");
        task.setup(ws);

        const failRes = task.grade(ws);
        assert.equal(failRes.pass, false);

        fs.writeFileSync(
            path.join(ws, "src", "pricing.js"),
            [
                "function applyDiscount(price, pct) {",
                "    if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw new RangeError('Invalid pct');",
                "    return Math.round(price * (1 - pct / 100) * 100) / 100;",
                "}",
                "module.exports = { applyDiscount };",
            ].join("\n")
        );
        fs.appendFileSync(
            path.join(ws, "test", "pricing.test.js"),
            "\n// updated tests\n"
        );
        const passRes = task.grade(ws);
        assert.equal(passRes.pass, true);
    });
});

describe("end-to-end prepare -> record -> report -> clean", () => {
    it("prepares workspaces on repo, records convIds, and generates report.md", () => {
        const repoRoot = path.resolve(__dirname, "../..");
        const brainDir = makeTempDir("bench-e2e-brain-");
        const { plan, output } = cmdPrepare({
            base: "HEAD",
            head: "WORKTREE",
            task: "bugfix-tdd",
            runs: 1,
            target: "antigravity",
            brain: brainDir,
        }, repoRoot);

        tempDirs.push(plan.runDir);
        tempDirs.push(plan.tmpRunDir);

        assert.equal(output.jobs.length, 2);
        assert.ok(fs.existsSync(path.join(plan.runDir, "plan.json")));
        for (const job of output.jobs) {
            assert.ok(fs.existsSync(path.join(job.workspace, ".agent", "skills")));
            const convId = `${job.variant}0000000-0000-0000-0000-000000000001`;
            const logDir = path.join(brainDir, convId, ".system_generated", "logs");
            fs.mkdirSync(logDir, { recursive: true });
            fs.writeFileSync(
                path.join(logDir, "transcript.jsonl"),
                JSON.stringify({
                    type: "PLANNER_RESPONSE",
                    created_at: "2026-11-21T10:00:00Z",
                    model: "test-model",
                    input_tokens: 500,
                    cache_read_tokens: 1000,
                    output_tokens: 100,
                    tool_calls: [{ name: "run_command", args: { CommandLine: "npm test" } }],
                }) + "\n"
            );
            cmdRecord({ run: plan.runDir, job: job.id, conv: convId });
        }

        const { markdown, reportMdPath, reportJsonPath } = cmdReport({ run: plan.runDir });
        assert.ok(fs.existsSync(reportMdPath));
        assert.ok(fs.existsSync(reportJsonPath));
        assert.ok(markdown.includes("## 1. Changes Under Test"));
        assert.ok(markdown.includes("## 8. Notes & Limitations"));

        cmdClean({ run: plan.runDir });
        assert.ok(!fs.existsSync(plan.tmpRunDir));
        assert.ok(fs.existsSync(reportMdPath));
    });
});
