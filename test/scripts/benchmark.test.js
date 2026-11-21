const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
    estimateTokens,
    categorizeAssetPath,
    extractReferencedSkills,
    extractReferencedTemplates,
    benchmarkStatic,
    formatStaticReport,
} = require("../../scripts/bench/static");
const {
    categorizeTool,
    detectFormat,
    parseTranscriptFile,
} = require("../../scripts/bench/transcript");
const {
    median,
    parsePassInfo,
    compareRuns,
    formatCompareReport,
} = require("../../scripts/bench/compare");

function runGit(args, cwd) {
    return childProcess.execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    });
}

describe("scripts / bench / static", () => {
    let tempDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opow-bench-static-"));
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("estimateTokens is deterministic, handles empty input, and scales with length", () => {
        assert.equal(estimateTokens(""), 0);
        assert.equal(estimateTokens(null), 0);
        const shortText = "hello world";
        const longText = "hello world ".repeat(50);
        assert.equal(estimateTokens(shortText), estimateTokens(shortText));
        assert.ok(estimateTokens(shortText) > 0);
        assert.ok(estimateTokens(longText) > estimateTokens(shortText) * 20);
    });

    it("categorizeAssetPath categorizes tracked prompt assets and excludes AppleDouble files", () => {
        assert.equal(categorizeAssetPath("src/templates/workflows/implement.md"), "workflows");
        assert.equal(categorizeAssetPath("src/skills/openspec/openspec-explore/SKILL.md"), "openspec_skills");
        assert.equal(categorizeAssetPath("src/skills/upstream/brainstorming/SKILL.md"), "upstream_skills");
        assert.equal(categorizeAssetPath("src/templates/openspec/templates/design.md"), "templates");
        assert.equal(categorizeAssetPath("src/templates/openspec/templates/schema-template.json"), "templates");
        assert.equal(categorizeAssetPath("src/rules/brief.md"), "rules");
        assert.equal(categorizeAssetPath("src/wrapper/claude/using-superpowers/SKILL.md"), "wrappers");

        assert.equal(categorizeAssetPath("src/templates/workflows/._implement.md"), null);
        assert.equal(categorizeAssetPath("src/commands/._uninstall.js"), null);
        assert.equal(categorizeAssetPath("src/.DS_Store"), null);
        assert.equal(categorizeAssetPath("src/commands/install.js"), null);
    });

    it("extractReferencedSkills skips negated mentions such as DO NOT invoke", () => {
        const md = [
            "1. Invoke `using-git-worktrees` first.",
            "2. Invoke `test-driven-development` inside worktree.",
            "3. **CRITICAL**: DO NOT invoke `finishing-a-development-branch`.",
            "4. Never invoke `brainstorming` during implement.",
        ].join("\n");

        const skills = extractReferencedSkills(md, [
            "using-git-worktrees",
            "test-driven-development",
            "finishing-a-development-branch",
            "brainstorming",
        ]);
        assert.deepEqual(skills, ["using-git-worktrees", "test-driven-development"]);
    });

    it("extractReferencedTemplates detects template filenames and .opow/templates/ scaffolding", () => {
        const md = "Copy from `.opow/templates/` and check `living.spec.md`.";
        const templates = extractReferencedTemplates(md, [
            "proposal.md",
            "design.md",
            "tasks.md",
            "delta.spec.md",
            "living.spec.md",
        ]);
        assert.deepEqual(templates.sort(), [
            "delta.spec.md",
            "design.md",
            "living.spec.md",
            "proposal.md",
            "tasks.md",
        ]);
    });

    it("benchmarkStatic diffs commits and dirty WORKTREE accurately in a git repo", () => {
        const wfDir = path.join(tempDir, "src", "templates", "workflows");
        const skillDir = path.join(tempDir, "src", "skills", "openspec", "openspec-explore");
        const tplDir = path.join(tempDir, "src", "templates", "openspec", "templates");
        fs.mkdirSync(wfDir, { recursive: true });
        fs.mkdirSync(skillDir, { recursive: true });
        fs.mkdirSync(tplDir, { recursive: true });

        fs.writeFileSync(path.join(wfDir, "explore.md"), "# Explore\nInvoke `openspec-explore`.");
        fs.writeFileSync(path.join(wfDir, "._explore.md"), "appledouble noise");
        fs.writeFileSync(path.join(skillDir, "SKILL.md"), "# Explore Skill\nShort baseline instructions.");
        fs.writeFileSync(path.join(tplDir, "design.md"), "# Design Template");

        runGit(["init", "-b", "main"], tempDir);
        runGit(["config", "user.email", "bench@example.com"], tempDir);
        runGit(["config", "user.name", "Bench"], tempDir);
        runGit(["add", "src/templates/workflows/explore.md", "src/skills/openspec/openspec-explore/SKILL.md", "src/templates/openspec/templates/design.md"], tempDir);
        runGit(["commit", "-m", "commit A"], tempDir);
        const commitA = runGit(["rev-parse", "HEAD"], tempDir).trim();

        // Commit B expands SKILL.md and adds a new rule
        const rulesDir = path.join(tempDir, "src", "rules");
        fs.mkdirSync(rulesDir, { recursive: true });
        fs.writeFileSync(path.join(rulesDir, "brief.md"), "be brief and concise always");
        fs.writeFileSync(
            path.join(skillDir, "SKILL.md"),
            "# Explore Skill\nExpanded instructions with much more detail.\n".repeat(5)
        );
        runGit(["add", "."], tempDir);
        runGit(["commit", "-m", "commit B"], tempDir);
        const commitB = runGit(["rev-parse", "HEAD"], tempDir).trim();

        // Dirty worktree shrinks explore.md
        fs.writeFileSync(path.join(wfDir, "explore.md"), "# Explore");

        const diffCommits = benchmarkStatic({ base: commitA, head: commitB, cwd: tempDir });
        assert.equal(diffCommits.mode, "diff");
        assert.ok(diffCommits.diff.total.deltaTokens > 0);
        assert.ok(diffCommits.diff.byCategory.rules.deltaTokens > 0);
        assert.ok(diffCommits.diff.flows.explore.deltaTokens > 0);
        assert.equal(diffCommits.diff.changedFiles[0].path, "src/skills/openspec/openspec-explore/SKILL.md");

        const diffWorktree = benchmarkStatic({ base: commitB, head: "WORKTREE", cwd: tempDir });
        assert.ok(diffWorktree.diff.flows.explore.deltaTokens < 0);
        assert.equal(diffWorktree.head.files["src/templates/workflows/._explore.md"], undefined);

        const md = formatStaticReport(diffWorktree, "md");
        assert.match(md, /~est\. tokens/);
        assert.match(md, /\| \/explore \|/);
    });
});

describe("scripts / bench / transcript", () => {
    let tempDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opow-bench-tx-"));
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("categorizes common tool names across IDEs", () => {
        assert.equal(categorizeTool("read_file"), "reads");
        assert.equal(categorizeTool("Read"), "reads");
        assert.equal(categorizeTool("Grep"), "searches");
        assert.equal(categorizeTool("apply_patch"), "writes");
        assert.equal(categorizeTool("exec_command"), "commands");
        assert.equal(categorizeTool("invoke_subagent"), "subagents");
        assert.equal(categorizeTool("custom_unknown_tool"), "other");
    });

    it("parses Antigravity transcript with uncached + cache_read, tools, turns, errors, duration", () => {
        const file = path.join(tempDir, "agy.jsonl");
        const lines = [
            JSON.stringify({
                step_index: 0,
                type: "USER_INPUT",
                created_at: "2026-11-21T06:00:00Z",
                content: "hi",
            }),
            JSON.stringify({
                step_index: 1,
                type: "PLANNER_RESPONSE",
                created_at: "2026-11-21T06:00:05Z",
                model: "gemini-pro-orchestrator-neon",
                input_tokens: 1000,
                cache_read_tokens: 4000,
                output_tokens: 200,
                tool_calls: [{ name: "read_file" }, { name: "grep_search" }],
            }),
            JSON.stringify({
                step_index: 2,
                type: "ERROR_MESSAGE",
                created_at: "2026-11-21T06:00:06Z",
                error: "transient",
            }),
            JSON.stringify({
                step_index: 3,
                type: "PLANNER_RESPONSE",
                created_at: "2026-11-21T06:00:10Z",
                model: "gemini-pro-orchestrator-neon",
                input_tokens: 500,
                cache_read_tokens: 5500,
                output_tokens: 300,
                tool_calls: [{ name: "edit_file" }, { name: "run_command" }],
            }),
        ];
        fs.writeFileSync(file, lines.join("\n"));

        const parsed = parseTranscriptFile(file);
        assert.equal(parsed.format, "antigravity");
        assert.deepEqual(parsed.models, ["gemini-pro-orchestrator-neon"]);
        assert.equal(parsed.tokens.uncached_input, 1500);
        assert.equal(parsed.tokens.cache_read, 9500);
        assert.equal(parsed.tokens.cache_write, 0);
        assert.equal(parsed.tokens.total_input, 11000);
        assert.equal(parsed.tokens.output, 500);
        assert.equal(parsed.tokens.total, 11500);
        assert.equal(parsed.tokens.peak_context, 6000);
        assert.equal(parsed.tokens.cache_hit_pct, 86.4);
        assert.equal(parsed.steps.llm_steps, 2);
        assert.equal(parsed.steps.user_turns, 1);
        assert.equal(parsed.steps.errors, 1);
        assert.equal(parsed.tools.total, 4);
        assert.deepEqual(parsed.tools.byCategory, {
            reads: 1,
            searches: 1,
            writes: 1,
            commands: 1,
            subagents: 0,
            other: 0,
        });
        assert.equal(parsed.duration_ms, 10000);
    });

    it("parses Claude Code transcript with message.id dedup and filtered user turns", () => {
        const file = path.join(tempDir, "claude.jsonl");
        const lines = [
            JSON.stringify({ type: "queue-operation", operation: "dequeue", timestamp: "2026-11-21T06:00:00Z", sessionId: "s1" }),
            JSON.stringify({
                type: "user",
                isSidechain: false,
                timestamp: "2026-11-21T06:00:01Z",
                sessionId: "s1",
                message: { role: "user", content: "Fix bug" },
            }),
            // Streaming chunk 1 for msg_1
            JSON.stringify({
                type: "assistant",
                timestamp: "2026-11-21T06:00:02Z",
                sessionId: "s1",
                message: {
                    id: "msg_1",
                    model: "claude-sonnet-4-5",
                    usage: { input_tokens: 100, cache_read_input_tokens: 500, cache_creation_input_tokens: 200, output_tokens: 10 },
                    content: [{ type: "tool_use", id: "tool_1", name: "Read" }],
                },
            }),
            // Streaming chunk 2 (final) for msg_1 - must dedup usage & tool_1
            JSON.stringify({
                type: "assistant",
                timestamp: "2026-11-21T06:00:04Z",
                sessionId: "s1",
                message: {
                    id: "msg_1",
                    model: "claude-sonnet-4-5",
                    usage: { input_tokens: 100, cache_read_input_tokens: 500, cache_creation_input_tokens: 200, output_tokens: 80 },
                    content: [
                        { type: "tool_use", id: "tool_1", name: "Read" },
                        { type: "tool_use", id: "tool_2", name: "Bash" },
                    ],
                },
            }),
            // tool_result user record MUST NOT count as human user turn
            JSON.stringify({
                type: "user",
                isSidechain: false,
                timestamp: "2026-11-21T06:00:05Z",
                sessionId: "s1",
                message: { role: "user", content: [{ type: "tool_result", tool_use_id: "tool_1", content: "ok" }] },
            }),
            // Sidechain user prompt MUST NOT count as human user turn
            JSON.stringify({
                type: "user",
                isSidechain: true,
                timestamp: "2026-11-21T06:00:06Z",
                sessionId: "s1",
                message: { role: "user", content: "Subagent internal prompt" },
            }),
            // Second real user turn
            JSON.stringify({
                type: "user",
                isSidechain: false,
                timestamp: "2026-11-21T06:00:11Z",
                sessionId: "s1",
                message: { role: "user", content: [{ type: "text", text: "Looks good" }] },
            }),
        ];
        fs.writeFileSync(file, lines.join("\n"));

        const parsed = parseTranscriptFile(file);
        assert.equal(parsed.format, "claude");
        assert.deepEqual(parsed.models, ["claude-sonnet-4-5"]);
        assert.equal(parsed.tokens.uncached_input, 100);
        assert.equal(parsed.tokens.cache_read, 500);
        assert.equal(parsed.tokens.cache_write, 200);
        assert.equal(parsed.tokens.total_input, 800);
        assert.equal(parsed.tokens.output, 80);
        assert.equal(parsed.tokens.peak_context, 800);
        assert.equal(parsed.steps.llm_steps, 1);
        assert.equal(parsed.steps.user_turns, 2);
        assert.equal(parsed.tools.total, 2);
        assert.equal(parsed.tools.byCategory.reads, 1);
        assert.equal(parsed.tools.byCategory.commands, 1);
        assert.equal(parsed.duration_ms, 11000);
    });

    it("parses Codex transcript using final cumulative total_token_usage and skips malformed lines", () => {
        const file = path.join(tempDir, "codex.jsonl");
        const lines = [
            "{not valid json",
            JSON.stringify({
                timestamp: "2026-11-21T06:00:00Z",
                type: "event_msg",
                payload: { type: "task_started", turn_id: "t1" },
            }),
            JSON.stringify({
                timestamp: "2026-11-21T06:00:01Z",
                type: "turn_context",
                payload: { turn_id: "t1", model: "gpt-5-codex" },
            }),
            JSON.stringify({
                timestamp: "2026-11-21T06:00:02Z",
                type: "event_msg",
                payload: {
                    type: "token_count",
                    info: {
                        last_token_usage: {
                            input_tokens: 1000,
                        },
                        total_token_usage: {
                            input_tokens: 1000,
                            cached_input_tokens: 600,
                            cache_write_input_tokens: 0,
                            output_tokens: 100,
                        },
                    },
                },
            }),
            JSON.stringify({
                timestamp: "2026-11-21T06:00:03Z",
                type: "response_item",
                payload: { type: "function_call", name: "exec_command", call_id: "c1" },
            }),
            JSON.stringify({
                timestamp: "2026-11-21T06:00:04Z",
                type: "response_item",
                payload: { type: "custom_tool_call", name: "apply_patch", call_id: "c2" },
            }),
            JSON.stringify({
                timestamp: "2026-11-21T06:00:08Z",
                type: "event_msg",
                payload: {
                    type: "token_count",
                    info: {
                        last_token_usage: {
                            input_tokens: 4000,
                        },
                        total_token_usage: {
                            input_tokens: 5000,
                            cached_input_tokens: 4000,
                            cache_write_input_tokens: 0,
                            output_tokens: 450,
                        },
                    },
                },
            }),
        ];
        fs.writeFileSync(file, lines.join("\n"));

        const parsed = parseTranscriptFile(file);
        assert.equal(parsed.format, "codex");
        assert.equal(parsed.skippedLines, 1);
        assert.deepEqual(parsed.models, ["gpt-5-codex"]);
        assert.equal(parsed.tokens.total_input, 5000);
        assert.equal(parsed.tokens.cache_read, 4000);
        assert.equal(parsed.tokens.uncached_input, 1000);
        assert.equal(parsed.tokens.output, 450);
        assert.equal(parsed.tokens.total, 5450);
        assert.equal(parsed.tokens.peak_context, 4000);
        assert.equal(parsed.tokens.cache_hit_pct, 80);
        assert.equal(parsed.steps.llm_steps, 2);
        assert.equal(parsed.steps.user_turns, 1);
        assert.equal(parsed.tools.total, 2);
        assert.equal(parsed.tools.byCategory.commands, 1);
        assert.equal(parsed.tools.byCategory.writes, 1);
        assert.equal(parsed.duration_ms, 8000);
    });

    it("detectFormat throws on unknown/empty records", () => {
        assert.throws(() => detectFormat([]), /no valid JSONL/);
        assert.throws(() => detectFormat([{ foo: "bar" }]), /Unable to auto-detect/);
    });
});

describe("scripts / bench / compare", () => {
    function makeSession({ uncached = 1000, cache = 2000, out = 300, steps = 4, turns = 1, reads = 4, searches = 2, duration = 5000 }) {
        return {
            tokens: {
                uncached_input: uncached,
                cache_read: cache,
                cache_write: 0,
                total_input: uncached + cache,
                output: out,
                total: uncached + cache + out,
                cache_hit_pct: Math.round((cache / (uncached + cache)) * 1000) / 10,
            },
            steps: { llm_steps: steps, user_turns: turns, errors: 0 },
            tools: {
                total: reads + searches + 1,
                byCategory: { reads, searches, writes: 1, commands: 0, subagents: 0, other: 0 },
            },
            duration_ms: duration,
        };
    }

    it("computes median accurately for odd, even, and empty arrays", () => {
        assert.equal(median([]), 0);
        assert.equal(median([30, 10, 20]), 20);
        assert.equal(median([40, 10, 20, 30]), 25);
    });

    it("compareRuns detects 'better' flow, calculates tokens_per_passing_task, and formats output", () => {
        const a = [
            makeSession({ uncached: 2000, out: 500, turns: 3, reads: 10, searches: 4 }),
            makeSession({ uncached: 2200, out: 600, turns: 3, reads: 12, searches: 4 }),
            makeSession({ uncached: 4000, out: 900, turns: 4, reads: 20, searches: 8 }), // outlier ignored by median
        ];
        const b = [
            makeSession({ uncached: 1200, out: 350, turns: 1, reads: 4, searches: 1 }),
            makeSession({ uncached: 1300, out: 360, turns: 2, reads: 5, searches: 1 }),
            makeSession({ uncached: 1400, out: 400, turns: 2, reads: 6, searches: 2 }),
        ];

        const result = compareRuns(a, b, {
            labelA: "Old",
            labelB: "New",
            passA: parsePassInfo("2/3", 3),
            passB: parsePassInfo("3/3", 3),
        });

        assert.equal(result.verdict, "better");
        assert.equal(result.warnings.length, 0);
        assert.equal(result.a.metrics.uncached_input, 2200);
        assert.equal(result.b.metrics.uncached_input, 1300);
        assert.equal(result.b.metrics.pass_rate_pct, 100);
        assert.ok(result.b.metrics.tokens_per_passing_task < result.a.metrics.tokens_per_passing_task);

        const md = formatCompareReport(result, "md");
        assert.match(md, /Verdict\*\*: `BETTER`/);
        assert.match(md, /Tokens \/ Passing Task/);
    });

    it("compareRuns detects 'worse' and 'mixed' with regression warnings", () => {
        const baseline = [makeSession({ uncached: 1000, out: 400, turns: 1, reads: 4, searches: 1 })];
        const worse = [makeSession({ uncached: 1800, out: 600, turns: 3, reads: 10, searches: 4 })];
        const resWorse = compareRuns(baseline, worse);
        assert.equal(resWorse.verdict, "worse");
        assert.ok(resWorse.warnings.some((w) => /Uncached input/.test(w)));
        assert.ok(resWorse.warnings.some((w) => /User turns/.test(w)));
        assert.ok(resWorse.warnings.some((w) => /Exploration calls/.test(w)));

        const cheaperButFailing = [makeSession({ uncached: 500, out: 200, turns: 1, reads: 2, searches: 0 })];
        const resMixed = compareRuns(baseline, cheaperButFailing, {
            passA: { passed: 1, total: 1 },
            passB: { passed: 0, total: 1 },
        });
        assert.equal(resMixed.verdict, "mixed");
        assert.equal(resMixed.b.metrics.tokens_per_passing_task, null);
        assert.ok(resMixed.warnings.some((w) => /Pass rate dropped/.test(w)));
    });

    it("compareRuns flags MIXED when uncached drops but total tokens and llm_steps spike", () => {
        const base = [makeSession({ uncached: 5000, cache: 5000, out: 1000, steps: 10, turns: 1, reads: 10, searches: 0 })];
        const bloatedCache = [makeSession({ uncached: 2000, cache: 12000, out: 1000, steps: 15, turns: 1, reads: 10, searches: 0 })];
        // base total = 11000, bloatedCache total = 15000 (+36.4%), steps 10 -> 15 (+50%)
        const res = compareRuns(base, bloatedCache);
        assert.equal(res.verdict, "mixed");
        assert.ok(res.warnings.some((w) => /Total tokens increased/.test(w)));
        assert.ok(res.warnings.some((w) => /LLM steps increased/.test(w)));

        const md = formatCompareReport(res, "md");
        assert.match(md, /\| Peak Context \|/);
    });
});

describe("scripts / benchmark CLI e2e", () => {
    const cliPath = path.resolve(__dirname, "../../scripts/benchmark.js");
    const repoRoot = path.resolve(__dirname, "../..");
    let tempDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "opow-bench-cli-"));
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("executes static --no-diff --json cleanly", () => {
        const out = childProcess.execFileSync(
            process.execPath,
            [cliPath, "static", "--no-diff", "--json", "--cwd", repoRoot],
            { encoding: "utf8" }
        );
        const parsed = JSON.parse(out);
        assert.equal(parsed.mode, "snapshot");
        assert.ok(parsed.head.total.tokens > 0);
        assert.ok(parsed.head.flows.implement.totalTokens > 0);
        assert.ok(!parsed.head.flows.implement.skills.includes("finishing-a-development-branch"));
    });

    it("executes session and compare commands via CLI and handles invalid args with exit code 1", () => {
        const fA = path.join(tempDir, "a.jsonl");
        const fB = path.join(tempDir, "b.jsonl");

        fs.writeFileSync(
            fA,
            [
                JSON.stringify({ step_index: 0, type: "USER_INPUT", created_at: "2026-11-21T06:00:00Z", content: "go" }),
                JSON.stringify({ step_index: 1, type: "PLANNER_RESPONSE", created_at: "2026-11-21T06:00:02Z", model: "m1", input_tokens: 2000, cache_read_tokens: 1000, output_tokens: 400, tool_calls: [{ name: "read_file" }, { name: "grep_search" }] }),
            ].join("\n")
        );
        fs.writeFileSync(
            fB,
            [
                JSON.stringify({ step_index: 0, type: "USER_INPUT", created_at: "2026-11-21T06:00:00Z", content: "go" }),
                JSON.stringify({ step_index: 1, type: "PLANNER_RESPONSE", created_at: "2026-11-21T06:00:01Z", model: "m1", input_tokens: 1000, cache_read_tokens: 1000, output_tokens: 200, tool_calls: [{ name: "read_file" }] }),
            ].join("\n")
        );

        const sessionOut = childProcess.execFileSync(
            process.execPath,
            [cliPath, "session", fA, "--json"],
            { encoding: "utf8" }
        );
        const sessionJson = JSON.parse(sessionOut);
        assert.equal(sessionJson.format, "antigravity");
        assert.equal(sessionJson.tokens.uncached_input, 2000);

        const cmpOut = childProcess.execFileSync(
            process.execPath,
            [cliPath, "compare", "--a", fA, "--b", fB, "--md"],
            { encoding: "utf8" }
        );
        assert.match(cmpOut, /\*\*Verdict\*\*: `BETTER`/);

        assert.throws(
            () => childProcess.execFileSync(process.execPath, [cliPath, "session", path.join(tempDir, "missing.jsonl")], { stdio: "pipe" }),
            (err) => err.status === 1
        );
    });
});
