const fs = require("fs");
const os = require("os");
const path = require("path");

const READ_TOOLS = new Set(["read_file", "view_file", "view_file_outline", "view_code_item", "list_dir"]);
const SEARCH_TOOLS = new Set(["grep_search", "find_by_name", "search_web", "read_url_content"]);
const EDIT_TOOLS = new Set(["write_file", "edit_file", "write_to_file", "replace_file_content", "multi_replace_file_content"]);
const COMMAND_TOOLS = new Set(["run_command", "command_status", "send_command_input"]);
const SUBAGENT_TOOLS = new Set(["invoke_subagent", "send_message"]);

const SKILL_PATH_RE = /(?:\.agent|\.claude|\.codex|\.cline)\/skills\/([^/]+)\/SKILL\.md/;
const WORKTREE_RE = /(?:^|\/)\.worktrees\/|git\s+worktree\b/;
const TEST_CMD_RE = /\b(?:npm\s+test|node\s+--test|pytest|vitest|jest|mocha)\b/;
const GIT_COMMIT_RE = /\bgit\s+commit\b/;
const CONV_ID_RE = /\\?"conversationId\\?"\s*:\s*\\?"([a-f0-9-]{8,})\\?"/gi;

const MAX_ACTIVE_GAP_MS = 5 * 60 * 1000;
const USER_WAIT_GAP_MS = 30 * 1000;

function defaultBrainDir() {
    return path.join(os.homedir(), ".gemini", "antigravity", "brain");
}

function round1(n) {
    return Math.round(n * 10) / 10;
}

function categorizeTool(name) {
    if (READ_TOOLS.has(name)) return "reads";
    if (SEARCH_TOOLS.has(name)) return "searches";
    if (EDIT_TOOLS.has(name)) return "edits";
    if (COMMAND_TOOLS.has(name)) return "commands";
    if (SUBAGENT_TOOLS.has(name)) return "subagents";
    return "other";
}

function safeParseArgs(rawArgs) {
    if (!rawArgs) return {};
    if (typeof rawArgs === "object") return rawArgs;
    if (typeof rawArgs === "string") {
        try {
            return JSON.parse(rawArgs);
        } catch {
            return {};
        }
    }
    return {};
}

function extractToolMeta(rawArgs) {
    const args = safeParseArgs(rawArgs);
    const filePath = args.Path || args.path || args.TargetFile || args.AbsolutePath || args.file || null;
    const startLine = args.StartLine ?? args.startLine ?? null;
    const endLine = args.EndLine ?? args.endLine ?? null;
    const command = args.CommandLine || args.command || args.cmd || null;
    return {
        filePath: filePath ? String(filePath).replace(/^"|"$/g, "") : null,
        startLine,
        endLine,
        command: command ? String(command) : null,
    };
}

function computeActiveDurationMs(timeline) {
    if (timeline.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < timeline.length; i += 1) {
        const prev = timeline[i - 1];
        const curr = timeline[i];
        const gap = curr.ts - prev.ts;
        if (gap <= 0) continue;
        if (curr.isUserTurn && gap > USER_WAIT_GAP_MS) continue;
        if (gap > MAX_ACTIVE_GAP_MS) continue;
        total += gap;
    }
    return total;
}

function collectChildIdsFromRecord(record, lineText, outSet) {
    if (typeof lineText === "string") {
        let m;
        CONV_ID_RE.lastIndex = 0;
        while ((m = CONV_ID_RE.exec(lineText)) !== null) {
            outSet.add(m[1]);
        }
    }
    if (record && Array.isArray(record.tool_calls)) {
        for (const tc of record.tool_calls) {
            const resp = tc && (tc.response || tc.result || tc.output);
            if (typeof resp === "string") {
                let m;
                CONV_ID_RE.lastIndex = 0;
                while ((m = CONV_ID_RE.exec(resp)) !== null) {
                    outSet.add(m[1]);
                }
            }
        }
    }
}

function parseSingleFile(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

    let uncached = 0;
    let cacheRead = 0;
    let output = 0;
    let peakContext = 0;
    let llmSteps = 0;
    let userTurns = 0;

    const tools = { total: 0, reads: 0, searches: 0, edits: 0, commands: 0, subagents: 0 };
    const seenReads = new Map();
    let rereads = 0;
    let toolErrors = 0;
    let editRetries = 0;
    let lastWritePath = null;
    let lastWriteStep = -999;
    let hadRecentError = false;

    const skillsRead = new Set();
    let testsRun = 0;
    let usedWorktree = false;
    let commits = 0;
    const models = new Set();
    const timeline = [];
    const childIds = new Set();

    for (const line of lines) {
        let r;
        try {
            r = JSON.parse(line);
        } catch {
            continue;
        }
        if (!r || typeof r !== "object") continue;

        collectChildIdsFromRecord(r, line, childIds);

        const tsMs = r.created_at ? Date.parse(r.created_at) : NaN;
        if (Number.isFinite(tsMs)) {
            timeline.push({ ts: tsMs, isUserTurn: r.type === "USER_INPUT" });
        }

        if (r.type === "PLANNER_RESPONSE") {
            const stepIdx = llmSteps;
            llmSteps += 1;
            const stepIn = Number(r.input_tokens) || 0;
            const stepCache = Number(r.cache_read_tokens) || 0;
            uncached += stepIn;
            cacheRead += stepCache;
            output += Number(r.output_tokens) || 0;
            peakContext = Math.max(peakContext, stepIn + stepCache);
            if (r.model) models.add(r.model);

            if (Array.isArray(r.tool_calls)) {
                for (const tc of r.tool_calls) {
                    if (!tc || !tc.name) continue;
                    const cat = categorizeTool(tc.name);
                    tools.total += 1;
                    if (cat !== "other") tools[cat] += 1;

                    const meta = extractToolMeta(tc.args);
                    if (meta.filePath) {
                        if (WORKTREE_RE.test(meta.filePath)) usedWorktree = true;
                        const sm = meta.filePath.match(SKILL_PATH_RE);
                        if (sm) skillsRead.add(sm[1]);
                    }

                    if (cat === "reads" && meta.filePath) {
                        const rangeKey =
                            meta.startLine !== null || meta.endLine !== null
                                ? `${meta.startLine ?? ""}:${meta.endLine ?? ""}`
                                : "all";
                        let ranges = seenReads.get(meta.filePath);
                        if (!ranges) {
                            ranges = new Set();
                            seenReads.set(meta.filePath, ranges);
                        }
                        if (ranges.has("all") || ranges.has(rangeKey)) {
                            rereads += 1;
                        } else {
                            ranges.add(rangeKey);
                        }
                    } else if (cat === "edits" && meta.filePath) {
                        seenReads.delete(meta.filePath);
                        if (
                            lastWritePath === meta.filePath &&
                            (stepIdx <= lastWriteStep + 1 || hadRecentError)
                        ) {
                            editRetries += 1;
                        }
                        lastWritePath = meta.filePath;
                        lastWriteStep = stepIdx;
                        hadRecentError = false;
                    } else if (cat === "commands" && meta.command) {
                        if (TEST_CMD_RE.test(meta.command)) testsRun += 1;
                        if (WORKTREE_RE.test(meta.command)) usedWorktree = true;
                        if (GIT_COMMIT_RE.test(meta.command)) commits += 1;
                    }
                }
            }
        } else if (r.type === "USER_INPUT") {
            userTurns += 1;
        } else if (r.type === "ERROR_MESSAGE") {
            toolErrors += 1;
            hadRecentError = true;
        } else if (r.type === "GENERIC" && typeof r.content === "string") {
            if (
                r.status === "ERROR" ||
                /Command exited with code [1-9]\d*/.test(r.content) ||
                /Error executing tool/i.test(r.content)
            ) {
                toolErrors += 1;
                hadRecentError = true;
            }
        }
    }

    return {
        uncached,
        cacheRead,
        output,
        peakContext,
        llmSteps,
        userTurns,
        tools,
        waste: { rereads, tool_errors: toolErrors, edit_retries: editRetries },
        activeDurationMs: computeActiveDurationMs(timeline),
        compliance: {
            skills_read: Array.from(skillsRead).sort(),
            tests_run: testsRun,
            used_worktree: usedWorktree,
            commits,
        },
        models: Array.from(models),
        childIds: Array.from(childIds),
    };
}

/**
 * Parse an Antigravity session transcript and all descendant subagent transcripts.
 * @param {string} convId
 * @param {{ brainDir?: string }} [options]
 * @returns {object|null}
 */
function parseSession(convId, options = {}) {
    if (!convId) return null;
    const brainDir = options.brainDir || defaultBrainDir();
    const mainFile = path.join(brainDir, convId, ".system_generated", "logs", "transcript.jsonl");
    const main = parseSingleFile(mainFile);
    if (!main) return null;

    const visited = new Set([convId]);
    const queue = main.childIds.filter((id) => !visited.has(id));
    const subagents = [];

    while (queue.length > 0) {
        const childId = queue.shift();
        if (visited.has(childId)) continue;
        visited.add(childId);
        const childFile = path.join(brainDir, childId, ".system_generated", "logs", "transcript.jsonl");
        const parsed = parseSingleFile(childFile);
        if (!parsed) continue;
        subagents.push(parsed);
        for (const nextId of parsed.childIds) {
            if (!visited.has(nextId)) queue.push(nextId);
        }
    }

    let uncached = main.uncached;
    let cacheRead = main.cacheRead;
    let output = main.output;
    let peakContext = main.peakContext;
    let llmSteps = main.llmSteps;
    let activeDurationMs = main.activeDurationMs;
    const tools = { ...main.tools };
    const waste = { ...main.waste };
    const skillsSet = new Set(main.compliance.skills_read);
    let testsRun = main.compliance.tests_run;
    let usedWorktree = main.compliance.used_worktree;
    let commits = main.compliance.commits;
    const modelsSet = new Set(main.models);

    let subagentTotalTokens = 0;
    for (const sub of subagents) {
        uncached += sub.uncached;
        cacheRead += sub.cacheRead;
        output += sub.output;
        subagentTotalTokens += sub.uncached + sub.cacheRead + sub.output;
        peakContext = Math.max(peakContext, sub.peakContext);
        llmSteps += sub.llmSteps;
        activeDurationMs += sub.activeDurationMs;
        for (const k of Object.keys(tools)) tools[k] += sub.tools[k];
        waste.rereads += sub.waste.rereads;
        waste.tool_errors += sub.waste.tool_errors;
        waste.edit_retries += sub.waste.edit_retries;
        for (const s of sub.compliance.skills_read) skillsSet.add(s);
        testsRun += sub.compliance.tests_run;
        usedWorktree = usedWorktree || sub.compliance.used_worktree;
        commits += sub.compliance.commits;
        for (const m of sub.models) modelsSet.add(m);
    }

    const total = uncached + cacheRead + output;
    const totalInput = uncached + cacheRead;
    const cacheHitPct = totalInput > 0 ? round1((cacheRead / totalInput) * 100) : 0;
    const subagentSharePct = total > 0 ? round1((subagentTotalTokens / total) * 100) : 0;

    return {
        tokens: {
            uncached,
            cache_read: cacheRead,
            output,
            total,
            cache_hit_pct: cacheHitPct,
            peak_context: peakContext,
        },
        steps: {
            llm_steps: llmSteps,
            user_turns: main.userTurns,
        },
        tools,
        waste,
        active_duration_ms: activeDurationMs,
        subagent_share_pct: subagentSharePct,
        compliance: {
            skills_read: Array.from(skillsSet).sort(),
            tests_run: testsRun,
            used_worktree: usedWorktree,
            commits,
        },
        models: Array.from(modelsSet).sort(),
    };
}

module.exports = {
    defaultBrainDir,
    parseSession,
};
