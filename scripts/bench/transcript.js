const fs = require("fs");
const path = require("path");

const TOOL_CATEGORIES = {
    reads: [
        "read_file",
        "view_file",
        "view_file_outline",
        "view_code_item",
        "Read",
        "read",
        "list_dir",
        "LS",
        "list_files",
        "read_multiple_files",
    ],
    searches: [
        "grep_search",
        "find_by_name",
        "Grep",
        "Glob",
        "search_web",
        "WebSearch",
        "WebFetch",
        "search_files",
        "ripgrep",
    ],
    writes: [
        "write_file",
        "edit_file",
        "write_to_file",
        "replace_file_content",
        "multi_replace_file_content",
        "Edit",
        "Write",
        "MultiEdit",
        "NotebookEdit",
        "apply_patch",
        "create_file",
    ],
    commands: [
        "run_command",
        "Bash",
        "exec_command",
        "shell",
        "command_status",
        "send_command_input",
        "write_stdin",
    ],
    subagents: [
        "invoke_subagent",
        "Agent",
        "Task",
        "swarm",
        "run_workflow",
        "spawn_agent",
        "send_message",
    ],
};

const TOOL_LOOKUP = new Map();
for (const [category, names] of Object.entries(TOOL_CATEGORIES)) {
    for (const name of names) {
        TOOL_LOOKUP.set(name, category);
        TOOL_LOOKUP.set(name.toLowerCase(), category);
    }
}

const ANTIGRAVITY_TYPES = new Set([
    "USER_INPUT",
    "PLANNER_RESPONSE",
    "SYSTEM_MESSAGE",
    "GENERIC",
    "ERROR_MESSAGE",
]);

const CLAUDE_TYPES = new Set([
    "assistant",
    "user",
    "queue-operation",
    "last-prompt",
    "attachment",
    "system",
]);

const CODEX_TYPES = new Set([
    "session_meta",
    "event_msg",
    "response_item",
    "turn_context",
]);

const TEST_CMD_RE = /\b(?:npm\s+test|node\s+--test|vitest|jest|pytest|go\s+test|cargo\s+test)\b/i;
const WORKTREE_CMD_RE = /\bgit\s+worktree\b/i;
const WORKTREE_PATH_RE = /(?:^|\/)\.worktrees(?:\/|$)/;
const SKILL_PATH_RE = /(?:^|\/)([^/]+)\/SKILL\.md$/;
const WORKFLOW_PATH_RE = /(?:^|\/)workflows\/([^/]+)\.md$/;
const GIT_COMMIT_RE = /\bgit\s+commit\b/i;
const GIT_COMMIT_MSG_RE = /-m\s+(?:"([^"]+)"|'([^']+)'|(\S+))/;
const SPEC_PREFIX_RE = /\[\d{14}\]/;

function round1(num) {
    return Math.round(num * 10) / 10;
}

/**
 * Categorize a tool call name into reads/searches/writes/commands/subagents/other.
 * @param {string} name
 * @returns {"reads"|"searches"|"writes"|"commands"|"subagents"|"other"}
 */
function categorizeTool(name) {
    if (!name || typeof name !== "string") {
        return "other";
    }
    return TOOL_LOOKUP.get(name) || TOOL_LOOKUP.get(name.toLowerCase()) || "other";
}

function emptyToolStats() {
    return {
        total: 0,
        byCategory: {
            reads: 0,
            searches: 0,
            writes: 0,
            commands: 0,
            subagents: 0,
            other: 0,
        },
        byName: {},
    };
}

function recordTool(tools, name) {
    if (!name) return;
    const category = categorizeTool(name);
    tools.total += 1;
    tools.byCategory[category] += 1;
    tools.byName[name] = (tools.byName[name] || 0) + 1;
}

function computeDurationMs(timestamps) {
    let min = Infinity;
    let max = -Infinity;
    let count = 0;
    for (const raw of timestamps) {
        if (!raw) continue;
        const ms = typeof raw === "number" ? raw : Date.parse(raw);
        if (Number.isFinite(ms)) {
            if (ms < min) min = ms;
            if (ms > max) max = ms;
            count += 1;
        }
    }
    return count >= 2 ? Math.max(0, max - min) : 0;
}

function computeActiveDurationMs(timeline) {
    if (!Array.isArray(timeline) || timeline.length < 2) {
        return 0;
    }
    let active = 0;
    for (let i = 1; i < timeline.length; i++) {
        const prev = timeline[i - 1];
        const curr = timeline[i];
        if (!curr.isUserTurn && curr.ts > prev.ts) {
            active += curr.ts - prev.ts;
        }
    }
    return active;
}

function parseTimestampMs(raw) {
    if (!raw) return null;
    const ms = typeof raw === "number" ? raw : Date.parse(raw);
    return Number.isFinite(ms) ? ms : null;
}

function normalizePathForMatch(p) {
    if (!p || typeof p !== "string") return null;
    const trimmed = p.trim().replace(/\\/g, "/");
    return trimmed.length > 1 && trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function safeParseArgs(rawArgs) {
    if (!rawArgs) return {};
    if (typeof rawArgs === "object") return rawArgs;
    if (typeof rawArgs === "string") {
        try {
            const parsed = JSON.parse(rawArgs);
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
            return {};
        }
    }
    return {};
}

function extractToolMeta(rawArgs) {
    const args = safeParseArgs(rawArgs);
    const filePath = normalizePathForMatch(
        args.Path || args.AbsolutePath || args.TargetFile || args.file_path || args.path || args.TargetDir || args.DirectoryPath || null
    );
    const startLine = args.StartLine ?? args.offset ?? null;
    let endLine = args.EndLine ?? null;
    if (endLine === null && args.offset !== undefined && args.limit !== undefined) {
        const off = Number(args.offset);
        const lim = Number(args.limit);
        if (Number.isFinite(off) && Number.isFinite(lim)) {
            endLine = off + lim;
        }
    }
    const command = typeof (args.CommandLine || args.command || args.cmd) === "string"
        ? (args.CommandLine || args.command || args.cmd)
        : null;
    return { filePath, startLine, endLine, command };
}

function createTracker() {
    return {
        seenReads: new Map(),
        rereads: 0,
        rereadFiles: new Set(),
        toolErrors: 0,
        editRetries: 0,
        lastWritePath: null,
        lastWriteStep: -999,
        hadRecentToolError: false,
        skillsRead: new Set(),
        workflowsRead: new Set(),
        testsRun: 0,
        usedWorktree: false,
        wroteToSrc: false,
        directAgentWrites: 0,
        commitsTotal: 0,
        commitsWithSpecPrefix: 0,
    };
}

function trackToolCall(tracker, name, rawArgs, stepIdx) {
    if (!name) return;
    const category = categorizeTool(name);
    const { filePath, startLine, endLine, command } = extractToolMeta(rawArgs);

    if (filePath) {
        if (WORKTREE_PATH_RE.test(filePath)) {
            tracker.usedWorktree = true;
        }
        const skillMatch = filePath.match(SKILL_PATH_RE);
        if (skillMatch) {
            tracker.skillsRead.add(skillMatch[1]);
        }
        const wfMatch = filePath.match(WORKFLOW_PATH_RE);
        if (wfMatch) {
            tracker.workflowsRead.add(wfMatch[1]);
        }
    }

    if (category === "reads" && filePath) {
        const rangeKey =
            (startLine !== null && startLine !== undefined) || (endLine !== null && endLine !== undefined)
                ? `${startLine ?? ""}:${endLine ?? ""}`
                : "all";
        let ranges = tracker.seenReads.get(filePath);
        if (!ranges) {
            ranges = new Set();
            tracker.seenReads.set(filePath, ranges);
        }
        if (ranges.has("all") || ranges.has(rangeKey)) {
            tracker.rereads += 1;
            tracker.rereadFiles.add(filePath);
        } else {
            ranges.add(rangeKey);
        }
    } else if (category === "writes" && filePath) {
        tracker.seenReads.delete(filePath);
        if (/(?:^|\/)src\//.test(filePath)) {
            tracker.wroteToSrc = true;
        } else if (/(?:^|\/)(?:\.agent|\.opow)\//.test(filePath)) {
            tracker.directAgentWrites += 1;
        }
        if (
            tracker.lastWritePath === filePath &&
            (stepIdx <= tracker.lastWriteStep + 1 || tracker.hadRecentToolError)
        ) {
            tracker.editRetries += 1;
        }
        tracker.lastWritePath = filePath;
        tracker.lastWriteStep = stepIdx;
        tracker.hadRecentToolError = false;
    } else if (category === "commands" && command) {
        if (TEST_CMD_RE.test(command)) {
            tracker.testsRun += 1;
        }
        if (WORKTREE_CMD_RE.test(command) || /\.worktrees\//.test(command)) {
            tracker.usedWorktree = true;
        }
        if (GIT_COMMIT_RE.test(command)) {
            tracker.commitsTotal += 1;
            const m = command.match(GIT_COMMIT_MSG_RE);
            const msg = m ? (m[1] || m[2] || m[3] || "") : "";
            if (SPEC_PREFIX_RE.test(msg)) {
                tracker.commitsWithSpecPrefix += 1;
            }
        }
    }
}

function finalizeTracker(tracker, tools) {
    const readsCount = tools.byCategory.reads || 0;
    const totalTools = tools.total || 0;
    return {
        waste: {
            rereads: tracker.rereads,
            reread_files: Array.from(tracker.rereadFiles).sort(),
            reread_rate_pct: readsCount > 0 ? round1((tracker.rereads / readsCount) * 100) : 0,
            tool_errors: tracker.toolErrors,
            tool_error_rate_pct: totalTools > 0 ? round1((tracker.toolErrors / totalTools) * 100) : 0,
            edit_retries: tracker.editRetries,
        },
        compliance: {
            skills_read: Array.from(tracker.skillsRead).sort(),
            workflows_read: Array.from(tracker.workflowsRead).sort(),
            tests_run: tracker.testsRun,
            used_worktree: tracker.usedWorktree,
            direct_agent_edits: tracker.wroteToSrc ? 0 : tracker.directAgentWrites,
            commits_total: tracker.commitsTotal,
            commits_with_spec_prefix: tracker.commitsWithSpecPrefix,
        },
    };
}

function buildTokenSummary(uncachedInput, cacheRead, cacheWrite, output, totalInputOverride = null, peakContext = 0) {
    const totalInput = totalInputOverride !== null
        ? totalInputOverride
        : uncachedInput + cacheRead + cacheWrite;
    const total = totalInput + output;
    const cacheHitPct = totalInput > 0 ? round1((cacheRead / totalInput) * 100) : 0;
    return {
        uncached_input: uncachedInput,
        cache_read: cacheRead,
        cache_write: cacheWrite,
        total_input: totalInput,
        output,
        total,
        peak_context: peakContext,
        cache_hit_pct: cacheHitPct,
    };
}

/**
 * Normalize CLI --format flag to canonical format name.
 * @param {string} format
 * @returns {"antigravity"|"claude"|"codex"}
 */
function normalizeFormatName(format) {
    const f = String(format || "").toLowerCase().trim();
    if (f === "agy" || f === "antigravity") return "antigravity";
    if (f === "claude" || f === "cc") return "claude";
    if (f === "codex" || f === "cdx") return "codex";
    throw new Error(`Unknown transcript format: "${format}". Expected: antigravity (agy), claude, or codex`);
}

/**
 * Auto-detect JSONL session transcript format from parsed records.
 * @param {Array<object>} records
 * @returns {"antigravity"|"claude"|"codex"}
 */
function detectFormat(records) {
    if (!Array.isArray(records) || records.length === 0) {
        throw new Error("Cannot detect transcript format: no valid JSONL records found.");
    }
    for (const r of records) {
        if (!r || typeof r !== "object") continue;
        if (typeof r.step_index === "number" && ANTIGRAVITY_TYPES.has(r.type)) {
            return "antigravity";
        }
        if (CODEX_TYPES.has(r.type) && r.payload && typeof r.payload === "object") {
            return "codex";
        }
        if (CLAUDE_TYPES.has(r.type) && (r.sessionId !== undefined || r.message !== undefined || r.uuid !== undefined)) {
            return "claude";
        }
    }
    throw new Error("Unable to auto-detect transcript format (supported: antigravity, claude, codex).");
}

/**
 * Parse Antigravity transcript records.
 * input_tokens is uncached input; cache_read_tokens is cached input.
 * @param {Array<object>} records
 * @returns {object}
 */
function parseAntigravity(records) {
    let uncachedInput = 0;
    let cacheRead = 0;
    let output = 0;
    let peakContext = 0;
    let llmSteps = 0;
    let userTurns = 0;
    let errors = 0;
    const models = new Set();
    const tools = emptyToolStats();
    const timestamps = [];
    const timeline = [];
    const tracker = createTracker();
    const childIds = new Set();

    for (const r of records) {
        if (!r || typeof r !== "object") continue;
        const tsMs = parseTimestampMs(r.created_at);
        if (r.created_at) timestamps.push(r.created_at);
        const isUserTurn = r.type === "USER_INPUT";
        if (tsMs !== null) {
            timeline.push({ ts: tsMs, isUserTurn });
        }

        if (r.type === "PLANNER_RESPONSE") {
            const stepIdx = llmSteps;
            llmSteps += 1;
            const stepIn = Number(r.input_tokens) || 0;
            const stepCache = Number(r.cache_read_tokens) || 0;
            uncachedInput += stepIn;
            cacheRead += stepCache;
            output += Number(r.output_tokens) || 0;
            peakContext = Math.max(peakContext, stepIn + stepCache);
            if (r.model) models.add(r.model);
            if (Array.isArray(r.tool_calls)) {
                for (const tc of r.tool_calls) {
                    if (tc && tc.name) {
                        recordTool(tools, tc.name);
                        trackToolCall(tracker, tc.name, tc.args, stepIdx);
                    }
                    const respStr = tc && (tc.response || tc.result || tc.output);
                    if (typeof respStr === "string") {
                        const m = respStr.match(/"conversationId"\s*:\s*"([a-f0-9-]{8,})"/i);
                        if (m) childIds.add(m[1]);
                    }
                }
            }
        } else if (r.type === "USER_INPUT") {
            userTurns += 1;
        } else if (r.type === "ERROR_MESSAGE") {
            errors += 1;
            tracker.toolErrors += 1;
            tracker.hadRecentToolError = true;
        } else if (r.type === "GENERIC" && typeof r.content === "string") {
            if (
                r.status === "ERROR" ||
                /Command exited with code [1-9]\d*/.test(r.content) ||
                /Error executing tool/i.test(r.content)
            ) {
                tracker.toolErrors += 1;
                tracker.hadRecentToolError = true;
            }
            const subMatch = r.content.match(/Created the following subagent:[\s\S]*?"conversationId"\s*:\s*"([a-f0-9-]{8,})"/i);
            if (subMatch) {
                childIds.add(subMatch[1]);
            }
        }
    }

    const { waste, compliance } = finalizeTracker(tracker, tools);
    return {
        format: "antigravity",
        models: Array.from(models),
        tokens: buildTokenSummary(uncachedInput, cacheRead, 0, output, null, peakContext),
        steps: { llm_steps: llmSteps, user_turns: userTurns, errors },
        tools,
        duration_ms: computeDurationMs(timestamps),
        active_duration_ms: computeActiveDurationMs(timeline),
        waste,
        compliance,
        _subagentRefs: { childIds: Array.from(childIds) },
    };
}

function isClaudeUserTurn(record) {
    if (record.isSidechain) return false;
    const content = record.message?.content;
    if (typeof content === "string") {
        return content.trim().length > 0;
    }
    if (Array.isArray(content)) {
        return content.some((block) => block && block.type !== "tool_result");
    }
    return false;
}

/**
 * Parse Claude Code JSONL records.
 * Deduplicates streaming assistant events by message.id (keeping last usage).
 * @param {Array<object>} records
 * @returns {object}
 */
function parseClaude(records) {
    const assistantByMsgId = new Map();
    const timestamps = [];
    const timeline = [];
    let userTurns = 0;
    let errors = 0;
    let anonIdx = 0;
    let sessionId = null;
    const childAgentIds = new Set();
    let claudeToolErrors = 0;

    for (const r of records) {
        if (!r || typeof r !== "object") continue;
        if (!sessionId && typeof r.sessionId === "string" && r.sessionId) {
            sessionId = r.sessionId;
        }
        if (r.toolUseResult && typeof r.toolUseResult.agentId === "string") {
            childAgentIds.add(r.toolUseResult.agentId);
        }
        if (typeof r.agentId === "string" && r.agentId) {
            childAgentIds.add(r.agentId);
        }

        const tsMs = parseTimestampMs(r.timestamp);
        if (r.timestamp) timestamps.push(r.timestamp);
        const isUserTurn = r.type === "user" && isClaudeUserTurn(r);
        if (tsMs !== null) {
            timeline.push({ ts: tsMs, isUserTurn });
        }

        if (r.type === "assistant" && r.message && typeof r.message === "object") {
            const msgId = r.message.id || `__anon_${anonIdx++}`;
            let entry = assistantByMsgId.get(msgId);
            if (!entry) {
                entry = {
                    model: null,
                    usage: null,
                    toolUsesById: new Map(),
                    unkeyedTools: [],
                    isError: false,
                };
                assistantByMsgId.set(msgId, entry);
            }
            if (r.message.model) entry.model = r.message.model;
            if (r.message.usage) entry.usage = r.message.usage;
            if (r.isApiErrorMessage || r.error) entry.isError = true;

            if (Array.isArray(r.message.content)) {
                const currentUnkeyed = [];
                for (const block of r.message.content) {
                    if (block && block.type === "tool_use" && block.name) {
                        const toolItem = { name: block.name, input: block.input || {} };
                        if (block.id) {
                            entry.toolUsesById.set(block.id, toolItem);
                        } else {
                            currentUnkeyed.push(toolItem);
                        }
                    }
                }
                entry.unkeyedTools = currentUnkeyed;
            }
        } else if (r.type === "user") {
            if (isUserTurn) {
                userTurns += 1;
            }
            if (Array.isArray(r.message?.content)) {
                for (const block of r.message.content) {
                    if (block && block.type === "tool_result" && block.is_error === true) {
                        claudeToolErrors += 1;
                    }
                }
            }
        }
    }

    let uncachedInput = 0;
    let cacheRead = 0;
    let cacheWrite = 0;
    let output = 0;
    let peakContext = 0;
    const models = new Set();
    const tools = emptyToolStats();
    const tracker = createTracker();
    tracker.toolErrors = claudeToolErrors;
    if (claudeToolErrors > 0) tracker.hadRecentToolError = true;

    let stepIdx = 0;
    for (const entry of assistantByMsgId.values()) {
        if (entry.model) models.add(entry.model);
        if (entry.isError) errors += 1;
        if (entry.usage) {
            const uIn = Number(entry.usage.input_tokens) || 0;
            const uCacheRead = Number(entry.usage.cache_read_input_tokens) || 0;
            const uCacheWrite = Number(entry.usage.cache_creation_input_tokens) || 0;
            uncachedInput += uIn;
            cacheRead += uCacheRead;
            cacheWrite += uCacheWrite;
            output += Number(entry.usage.output_tokens) || 0;
            peakContext = Math.max(peakContext, uIn + uCacheRead + uCacheWrite);
        }
        for (const item of entry.toolUsesById.values()) {
            recordTool(tools, item.name);
            trackToolCall(tracker, item.name, item.input, stepIdx);
        }
        for (const item of entry.unkeyedTools) {
            recordTool(tools, item.name);
            trackToolCall(tracker, item.name, item.input, stepIdx);
        }
        stepIdx += 1;
    }

    const { waste, compliance } = finalizeTracker(tracker, tools);
    return {
        format: "claude",
        models: Array.from(models),
        tokens: buildTokenSummary(uncachedInput, cacheRead, cacheWrite, output, null, peakContext),
        steps: {
            llm_steps: assistantByMsgId.size,
            user_turns: userTurns,
            errors,
        },
        tools,
        duration_ms: computeDurationMs(timestamps),
        active_duration_ms: computeActiveDurationMs(timeline),
        waste,
        compliance,
        _subagentRefs: {
            sessionId,
            childAgentIds: Array.from(childAgentIds),
        },
    };
}

/**
 * Parse Codex JSONL records.
 * Uses the last cumulative total_token_usage snapshot where input_tokens already includes cached_input_tokens.
 * @param {Array<object>} records
 * @returns {object}
 */
function parseCodex(records) {
    let lastTotalUsage = null;
    let peakContext = 0;
    let tokenCountSteps = 0;
    let assistantMessageSteps = 0;
    let taskStartedTurns = 0;
    let userMessageTurns = 0;
    let errors = 0;
    let sessionId = null;
    const models = new Set();
    const tools = emptyToolStats();
    const timestamps = [];
    const timeline = [];
    const tracker = createTracker();
    const childAgentIds = new Set();

    for (const r of records) {
        if (!r || typeof r !== "object") continue;
        const payload = r.payload;
        const tsMs = parseTimestampMs(r.timestamp);
        if (r.timestamp) timestamps.push(r.timestamp);
        const isUserTurn =
            (r.type === "event_msg" && payload?.type === "task_started") ||
            (r.type === "response_item" && payload?.type === "message" && payload?.role === "user");
        if (tsMs !== null) {
            timeline.push({ ts: tsMs, isUserTurn });
        }

        if (!payload || typeof payload !== "object") continue;

        if (r.type === "session_meta" && typeof payload.id === "string") {
            sessionId = payload.id;
        } else if (r.type === "turn_context" && payload.model) {
            models.add(payload.model);
        } else if (r.type === "event_msg") {
            if (payload.type === "token_count" && payload.info && typeof payload.info === "object") {
                tokenCountSteps += 1;
                if (payload.info.total_token_usage) {
                    lastTotalUsage = payload.info.total_token_usage;
                }
                const lastIn = Number(payload.info.last_token_usage?.input_tokens) || 0;
                if (lastIn > peakContext) {
                    peakContext = lastIn;
                }
            } else if (payload.type === "task_started") {
                taskStartedTurns += 1;
            } else if (payload.type === "error" || payload.type === "turn_aborted") {
                errors += 1;
                tracker.toolErrors += 1;
                tracker.hadRecentToolError = true;
            }
        } else if (r.type === "response_item") {
            if (payload.type === "function_call" || payload.type === "custom_tool_call") {
                if (payload.name) {
                    recordTool(tools, payload.name);
                    trackToolCall(tracker, payload.name, payload.arguments ?? payload.input, tokenCountSteps);
                }
            } else if (payload.type === "function_call_output" || payload.type === "custom_tool_call_output") {
                const outStr = typeof payload.output === "string" ? payload.output : JSON.stringify(payload.output || "");
                if (/exit code:\s*[1-9]\d*/i.test(outStr) || /"error"\s*:/i.test(outStr) || /^Error:/m.test(outStr)) {
                    tracker.toolErrors += 1;
                    tracker.hadRecentToolError = true;
                }
                const idMatch = outStr.match(/"agent_id"\s*:\s*"([a-f0-9-]{8,})"/i);
                if (idMatch) childAgentIds.add(idMatch[1]);
            } else if (payload.type === "message") {
                if (payload.role === "assistant") assistantMessageSteps += 1;
                else if (payload.role === "user") userMessageTurns += 1;
            }
        }
    }

    const totalInput = Number(lastTotalUsage?.input_tokens) || 0;
    const cacheRead = Number(lastTotalUsage?.cached_input_tokens) || 0;
    const cacheWrite = Number(lastTotalUsage?.cache_write_input_tokens) || 0;
    const uncachedInput = Math.max(0, totalInput - cacheRead - cacheWrite);
    const output = Number(lastTotalUsage?.output_tokens) || 0;
    if (peakContext === 0 && tokenCountSteps === 1) {
        peakContext = totalInput;
    }

    const { waste, compliance } = finalizeTracker(tracker, tools);
    return {
        format: "codex",
        models: Array.from(models),
        tokens: buildTokenSummary(uncachedInput, cacheRead, cacheWrite, output, totalInput, peakContext),
        steps: {
            llm_steps: tokenCountSteps > 0 ? tokenCountSteps : assistantMessageSteps,
            user_turns: taskStartedTurns > 0 ? taskStartedTurns : userMessageTurns,
            errors,
        },
        tools,
        duration_ms: computeDurationMs(timestamps),
        active_duration_ms: computeActiveDurationMs(timeline),
        waste,
        compliance,
        _subagentRefs: {
            sessionId,
            childAgentIds: Array.from(childAgentIds),
        },
    };
}

function discoverChildTranscripts(parentPath, format, refs, searchDirs = []) {
    const resolvedParent = path.resolve(parentPath);
    const parentDir = path.dirname(resolvedParent);
    const found = [];
    const seenCandidates = new Set();
    let missing = 0;

    function tryAdd(candidatePath) {
        const resolved = path.resolve(candidatePath);
        if (resolved === resolvedParent || seenCandidates.has(resolved)) return true;
        if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
            seenCandidates.add(resolved);
            found.push(resolved);
            return true;
        }
        return false;
    }

    if (format === "antigravity") {
        const roots = new Set(searchDirs.map((d) => path.resolve(d)));
        const logsDir = parentDir;
        if (path.basename(logsDir) === "logs" && path.basename(path.dirname(logsDir)) === ".system_generated") {
            const convDir = path.dirname(path.dirname(logsDir));
            roots.add(path.dirname(convDir));
        } else {
            roots.add(parentDir);
        }
        for (const childId of refs?.childIds || []) {
            let matched = false;
            for (const root of roots) {
                if (
                    tryAdd(path.join(root, childId, ".system_generated", "logs", "transcript.jsonl")) ||
                    tryAdd(path.join(root, childId, "transcript.jsonl")) ||
                    tryAdd(path.join(root, `${childId}.jsonl`))
                ) {
                    matched = true;
                    break;
                }
            }
            if (!matched) missing += 1;
        }
    } else if (format === "claude") {
        const stem = path.basename(resolvedParent, path.extname(resolvedParent));
        const sessionId = refs?.sessionId || stem;
        const subDir = path.join(parentDir, sessionId, "subagents");
        if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
            for (const entry of fs.readdirSync(subDir)) {
                if (entry.endsWith(".jsonl") && entry.startsWith("agent-")) {
                    tryAdd(path.join(subDir, entry));
                }
            }
        }
        for (const agentId of refs?.childAgentIds || []) {
            const ok =
                tryAdd(path.join(subDir, `agent-${agentId}.jsonl`)) ||
                tryAdd(path.join(parentDir, `agent-${agentId}.jsonl`));
            if (!ok) missing += 1;
        }
    } else if (format === "codex") {
        const sessionId = refs?.sessionId;
        const childIds = new Set(refs?.childAgentIds || []);
        if (fs.existsSync(parentDir) && fs.statSync(parentDir).isDirectory()) {
            const entries = fs.readdirSync(parentDir).filter((e) => e.endsWith(".jsonl"));
            for (const entry of entries) {
                const candidate = path.join(parentDir, entry);
                if (path.resolve(candidate) === resolvedParent) continue;
                let matchedById = false;
                for (const cid of childIds) {
                    if (entry.includes(cid)) {
                        tryAdd(candidate);
                        matchedById = true;
                        break;
                    }
                }
                if (matchedById) continue;
                if (sessionId && entry.startsWith("rollout-")) {
                    try {
                        const fd = fs.openSync(candidate, "r");
                        const buf = Buffer.alloc(4096);
                        const bytesRead = fs.readSync(fd, buf, 0, 4096, 0);
                        fs.closeSync(fd);
                        const firstLine = buf.toString("utf8", 0, bytesRead).split(/\r?\n/)[0];
                        if (firstLine) {
                            const meta = JSON.parse(firstLine);
                            const parentRef = meta?.payload?.source?.subagent?.thread_spawn?.parent_thread_id;
                            if (parentRef === sessionId) {
                                tryAdd(candidate);
                            }
                        }
                    } catch {
                        // Ignore unreadable sibling files
                    }
                }
            }
        }
    }

    return { found, missing };
}

function emptyScopeSummary() {
    return {
        tokens: buildTokenSummary(0, 0, 0, 0, 0, 0),
        steps: { llm_steps: 0, user_turns: 0, errors: 0 },
        tools: emptyToolStats(),
        duration_ms: 0,
        active_duration_ms: 0,
        waste: {
            rereads: 0,
            reread_files: [],
            reread_rate_pct: 0,
            tool_errors: 0,
            tool_error_rate_pct: 0,
            edit_retries: 0,
        },
        compliance: {
            skills_read: [],
            workflows_read: [],
            tests_run: 0,
            used_worktree: false,
            direct_agent_edits: 0,
            commits_total: 0,
            commits_with_spec_prefix: 0,
        },
    };
}

function mergeScopeSummaries(items) {
    if (!items || items.length === 0) {
        return emptyScopeSummary();
    }
    let uncached = 0;
    let cacheRead = 0;
    let cacheWrite = 0;
    let totalInput = 0;
    let output = 0;
    let peakContext = 0;
    let llmSteps = 0;
    let userTurns = 0;
    let errors = 0;
    let durationMs = 0;
    let activeDurationMs = 0;
    const tools = emptyToolStats();
    let rereads = 0;
    const rereadFiles = new Set();
    let toolErrors = 0;
    let editRetries = 0;
    const skillsRead = new Set();
    const workflowsRead = new Set();
    let testsRun = 0;
    let usedWorktree = false;
    let directAgentEdits = 0;
    let commitsTotal = 0;
    let commitsWithSpecPrefix = 0;

    for (const s of items) {
        uncached += s.tokens.uncached_input || 0;
        cacheRead += s.tokens.cache_read || 0;
        cacheWrite += s.tokens.cache_write || 0;
        totalInput += s.tokens.total_input || 0;
        output += s.tokens.output || 0;
        peakContext = Math.max(peakContext, s.tokens.peak_context || 0);

        llmSteps += s.steps.llm_steps || 0;
        userTurns += s.steps.user_turns || 0;
        errors += s.steps.errors || 0;
        durationMs += s.duration_ms || 0;
        activeDurationMs += s.active_duration_ms || 0;

        tools.total += s.tools.total || 0;
        for (const cat of Object.keys(tools.byCategory)) {
            tools.byCategory[cat] += s.tools.byCategory[cat] || 0;
        }
        for (const [name, cnt] of Object.entries(s.tools.byName || {})) {
            tools.byName[name] = (tools.byName[name] || 0) + cnt;
        }

        if (s.waste) {
            rereads += s.waste.rereads || 0;
            for (const f of s.waste.reread_files || []) rereadFiles.add(f);
            toolErrors += s.waste.tool_errors || 0;
            editRetries += s.waste.edit_retries || 0;
        }
        if (s.compliance) {
            for (const sk of s.compliance.skills_read || []) skillsRead.add(sk);
            for (const wf of s.compliance.workflows_read || []) workflowsRead.add(wf);
            testsRun += s.compliance.tests_run || 0;
            if (s.compliance.used_worktree) usedWorktree = true;
            directAgentEdits += s.compliance.direct_agent_edits || 0;
            commitsTotal += s.compliance.commits_total || 0;
            commitsWithSpecPrefix += s.compliance.commits_with_spec_prefix || 0;
        }
    }

    const readsCount = tools.byCategory.reads || 0;
    const totalTools = tools.total || 0;
    return {
        tokens: buildTokenSummary(uncached, cacheRead, cacheWrite, output, totalInput, peakContext),
        steps: { llm_steps: llmSteps, user_turns: userTurns, errors },
        tools,
        duration_ms: durationMs,
        active_duration_ms: activeDurationMs,
        waste: {
            rereads,
            reread_files: Array.from(rereadFiles).sort(),
            reread_rate_pct: readsCount > 0 ? round1((rereads / readsCount) * 100) : 0,
            tool_errors: toolErrors,
            tool_error_rate_pct: totalTools > 0 ? round1((toolErrors / totalTools) * 100) : 0,
            edit_retries: editRetries,
        },
        compliance: {
            skills_read: Array.from(skillsRead).sort(),
            workflows_read: Array.from(workflowsRead).sort(),
            tests_run: testsRun,
            used_worktree: usedWorktree,
            direct_agent_edits: directAgentEdits,
            commits_total: commitsTotal,
            commits_with_spec_prefix: commitsWithSpecPrefix,
        },
    };
}

function parseSingleTranscriptFile(filePath, options = {}) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Transcript file not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);
    const records = [];
    let skippedLines = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
            records.push(JSON.parse(trimmed));
        } catch {
            skippedLines += 1;
        }
    }

    const format = options.format
        ? normalizeFormatName(options.format)
        : detectFormat(records);

    let parsed;
    if (format === "antigravity") {
        parsed = parseAntigravity(records);
    } else if (format === "claude") {
        parsed = parseClaude(records);
    } else if (format === "codex") {
        parsed = parseCodex(records);
    }

    return {
        file: filePath,
        ...parsed,
        skippedLines,
    };
}

function collectSubagentDescendants(parentFile, format, refs, options, depth, visited, outList) {
    if (depth > options.maxSubagentDepth) {
        return { missing: 0, maxDepth: depth - 1 };
    }
    const { found, missing: directMissing } = discoverChildTranscripts(
        parentFile,
        format,
        refs,
        options.subagentSearchDirs
    );
    let totalMissing = directMissing;
    let maxDepth = depth - 1;

    for (const childPath of found) {
        const resolved = path.resolve(childPath);
        if (visited.has(resolved)) continue;
        visited.add(resolved);

        try {
            const childParsed = parseSingleTranscriptFile(childPath, { format: options.format });
            outList.push(childParsed);
            if (depth > maxDepth) maxDepth = depth;
            const nested = collectSubagentDescendants(
                childPath,
                childParsed.format,
                childParsed._subagentRefs,
                options,
                depth + 1,
                visited,
                outList
            );
            totalMissing += nested.missing;
            if (nested.maxDepth > maxDepth) maxDepth = nested.maxDepth;
        } catch {
            totalMissing += 1;
        }
    }

    return { missing: totalMissing, maxDepth };
}

/**
 * Parse a JSONL transcript file from disk into a normalized metrics summary.
 * Discovers and aggregates subagent transcripts by default (disable with includeSubagents: false).
 * @param {string} filePath
 * @param {object} [options]
 * @returns {object}
 */
function parseTranscriptFile(filePath, options = {}) {
    const includeSubagents = options.includeSubagents !== false;
    const maxSubagentDepth = options.maxSubagentDepth ?? 5;
    const subagentSearchDirs = Array.isArray(options.subagentSearchDirs) ? options.subagentSearchDirs : [];

    const resolvedRoot = path.resolve(filePath);
    const visited = options._visited || new Set();
    visited.add(resolvedRoot);

    const rootParsed = parseSingleTranscriptFile(filePath, options);
    const { _subagentRefs, ...mainRaw } = rootParsed;

    const mainSummary = {
        tokens: mainRaw.tokens,
        steps: mainRaw.steps,
        tools: mainRaw.tools,
        duration_ms: mainRaw.duration_ms,
        active_duration_ms: mainRaw.active_duration_ms,
        waste: mainRaw.waste,
        compliance: mainRaw.compliance,
    };

    const subagentItems = [];
    let missingSubagents = 0;
    let maxDepth = 0;

    if (includeSubagents) {
        const res = collectSubagentDescendants(
            filePath,
            mainRaw.format,
            _subagentRefs,
            { format: options.format, maxSubagentDepth, subagentSearchDirs },
            1,
            visited,
            subagentItems
        );
        missingSubagents = res.missing;
        maxDepth = res.maxDepth;
    }

    const subSummary = mergeScopeSummaries(subagentItems);
    const combinedSummary = subagentItems.length > 0
        ? mergeScopeSummaries([mainSummary, subSummary])
        : mainSummary;

    // Keep human user_turns strictly from main session (subagents have internal prompts)
    const finalSteps = {
        llm_steps: combinedSummary.steps.llm_steps,
        user_turns: mainSummary.steps.user_turns,
        errors: combinedSummary.steps.errors,
    };

    const modelsSet = new Set(mainRaw.models);
    for (const sub of subagentItems) {
        for (const m of sub.models || []) modelsSet.add(m);
    }

    const totalTokensAll = combinedSummary.tokens.total || 0;
    const subSharePct = totalTokensAll > 0
        ? round1((subSummary.tokens.total / totalTokensAll) * 100)
        : 0;

    return {
        file: mainRaw.file,
        format: mainRaw.format,
        models: Array.from(modelsSet),
        tokens: combinedSummary.tokens,
        steps: finalSteps,
        tools: combinedSummary.tools,
        duration_ms: mainSummary.duration_ms,
        active_duration_ms: mainSummary.active_duration_ms + subSummary.active_duration_ms,
        waste: combinedSummary.waste,
        compliance: combinedSummary.compliance,
        skippedLines: mainRaw.skippedLines + subagentItems.reduce((acc, s) => acc + (s.skippedLines || 0), 0),
        breakdown: {
            includeSubagents,
            main: mainSummary,
            subagents: {
                count: subagentItems.length,
                missing: missingSubagents,
                max_depth: maxDepth,
                files: subagentItems.map((s) => s.file),
                ...subSummary,
            },
            subagent_token_share_pct: subSharePct,
        },
    };
}

function formatDuration(ms) {
    if (!ms || ms <= 0) return "0s";
    if (ms < 1000) return `${ms}ms`;
    const secs = ms / 1000;
    if (secs < 60) return `${secs.toFixed(1)}s`;
    const mins = Math.floor(secs / 60);
    const rem = Math.round(secs % 60);
    return `${mins}m ${rem}s`;
}

function formatNum(n) {
    return Number(n || 0).toLocaleString("en-US");
}

/**
 * Format one or more parsed session summaries as text, markdown, or JSON.
 * @param {Array<object>} sessions
 * @param {"text"|"md"|"json"} [format]
 * @returns {string}
 */
function formatSessionReport(sessions, format = "text") {
    if (format === "json") {
        return JSON.stringify(sessions.length === 1 ? sessions[0] : sessions, null, 2);
    }

    const blocks = [];
    for (const s of sessions) {
        const lines = [];
        const cats = s.tools.byCategory;
        const main = s.breakdown?.main;
        const sub = s.breakdown?.subagents;
        const subShare = s.breakdown?.subagent_token_share_pct ?? 0;

        if (format === "md") {
            lines.push(`### Session: \`${s.file}\` (${s.format})`);
            lines.push(`- **Models**: ${s.models.join(", ") || "-"}`);
            if (main && sub) {
                lines.push("");
                lines.push("| Scope | Uncached | Cache Read | Output | Total | Peak | Steps | Tools |");
                lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
                lines.push(
                    `| Main | ${formatNum(main.tokens.uncached_input)} | ${formatNum(main.tokens.cache_read)} | ${formatNum(main.tokens.output)} | ${formatNum(main.tokens.total)} | ${formatNum(main.tokens.peak_context)} | ${main.steps.llm_steps} | ${main.tools.total} |`
                );
                lines.push(
                    `| Subagents (n=${sub.count}, ${subShare}%) | ${formatNum(sub.tokens.uncached_input)} | ${formatNum(sub.tokens.cache_read)} | ${formatNum(sub.tokens.output)} | ${formatNum(sub.tokens.total)} | ${formatNum(sub.tokens.peak_context)} | ${sub.steps.llm_steps} | ${sub.tools.total} |`
                );
                lines.push(
                    `| **Total** | **${formatNum(s.tokens.uncached_input)}** | **${formatNum(s.tokens.cache_read)}** | **${formatNum(s.tokens.output)}** | **${formatNum(s.tokens.total)}** | **${formatNum(s.tokens.peak_context)}** | **${s.steps.llm_steps}** | **${s.tools.total}** |`
                );
                lines.push("");
            } else {
                lines.push(`- **Tokens**: uncached=${formatNum(s.tokens.uncached_input)} | cache_read=${formatNum(s.tokens.cache_read)} | cache_write=${formatNum(s.tokens.cache_write)} | total_input=${formatNum(s.tokens.total_input)} | output=${formatNum(s.tokens.output)} | peak=${formatNum(s.tokens.peak_context)} | **cache_hit=${s.tokens.cache_hit_pct}%**`);
            }
            lines.push(`- **Steps & Time**: user_turns=${s.steps.user_turns}, errors=${s.steps.errors}, cache_hit=${s.tokens.cache_hit_pct}%, wall=${formatDuration(s.duration_ms)}, active=${formatDuration(s.active_duration_ms ?? s.duration_ms)}`);
            lines.push(`- **Tools (${s.tools.total})**: reads=${cats.reads}, searches=${cats.searches}, writes=${cats.writes}, commands=${cats.commands}, subagents=${cats.subagents}, other=${cats.other}`);
            if (s.waste) {
                lines.push(`- **Waste**: rereads=${s.waste.rereads} (${s.waste.reread_rate_pct}%), tool_errors=${s.waste.tool_errors} (${s.waste.tool_error_rate_pct}%), edit_retries=${s.waste.edit_retries}`);
            }
            if (s.compliance) {
                lines.push(`- **Compliance**: skills=[${s.compliance.skills_read.join(", ") || "-"}], tests_run=${s.compliance.tests_run}, worktree=${s.compliance.used_worktree}`);
            }
            if (s.skippedLines > 0) {
                lines.push(`- **Skipped malformed lines**: ${s.skippedLines}`);
            }
        } else {
            lines.push(`Session: ${s.file} [${s.format}]`);
            lines.push(`  Models:      ${s.models.join(", ") || "-"}`);
            if (main && sub) {
                lines.push(
                    `  Main:        uncached=${formatNum(main.tokens.uncached_input)}  cache_read=${formatNum(main.tokens.cache_read)}  output=${formatNum(main.tokens.output)}  total=${formatNum(main.tokens.total)}  peak=${formatNum(main.tokens.peak_context)}  steps=${main.steps.llm_steps}  tools=${main.tools.total}`
                );
                lines.push(
                    `  Subagents:   n=${sub.count} (${subShare}%)  uncached=${formatNum(sub.tokens.uncached_input)}  cache_read=${formatNum(sub.tokens.cache_read)}  output=${formatNum(sub.tokens.output)}  total=${formatNum(sub.tokens.total)}  peak=${formatNum(sub.tokens.peak_context)}  steps=${sub.steps.llm_steps}  tools=${sub.tools.total}`
                );
                lines.push(
                    `  Total:       uncached=${formatNum(s.tokens.uncached_input)}  cache_read=${formatNum(s.tokens.cache_read)}  output=${formatNum(s.tokens.output)}  total=${formatNum(s.tokens.total)}  peak=${formatNum(s.tokens.peak_context)}  cache_hit=${s.tokens.cache_hit_pct}%`
                );
            } else {
                lines.push(
                    `  Tokens:      uncached=${formatNum(s.tokens.uncached_input)}  cache_read=${formatNum(s.tokens.cache_read)}  cache_write=${formatNum(s.tokens.cache_write)}  output=${formatNum(s.tokens.output)}`
                );
                lines.push(
                    `               total_input=${formatNum(s.tokens.total_input)}  total=${formatNum(s.tokens.total)}  peak=${formatNum(s.tokens.peak_context)}  cache_hit=${s.tokens.cache_hit_pct}%`
                );
            }
            lines.push(
                `  Steps:       llm_steps=${s.steps.llm_steps}  user_turns=${s.steps.user_turns}  errors=${s.steps.errors}  wall=${formatDuration(s.duration_ms)}  active=${formatDuration(s.active_duration_ms ?? s.duration_ms)}`
            );
            lines.push(
                `  Tools (${s.tools.total}): reads=${cats.reads}  searches=${cats.searches}  writes=${cats.writes}  commands=${cats.commands}  subagents=${cats.subagents}  other=${cats.other}`
            );
            if (s.waste) {
                lines.push(
                    `  Waste:       rereads=${s.waste.rereads} (${s.waste.reread_rate_pct}%)  tool_errors=${s.waste.tool_errors} (${s.waste.tool_error_rate_pct}%)  edit_retries=${s.waste.edit_retries}`
                );
            }
            if (s.compliance) {
                lines.push(
                    `  Compliance:  skills=[${s.compliance.skills_read.join(", ") || "-"}]  tests_run=${s.compliance.tests_run}  worktree=${s.compliance.used_worktree}`
                );
            }
            if (s.skippedLines > 0) {
                lines.push(`  Skipped:     ${s.skippedLines} malformed JSONL line(s)`);
            }
        }
        blocks.push(lines.join("\n"));
    }
    return blocks.join("\n\n");
}

module.exports = {
    TOOL_CATEGORIES,
    categorizeTool,
    normalizeFormatName,
    detectFormat,
    parseAntigravity,
    parseClaude,
    parseCodex,
    parseTranscriptFile,
    formatSessionReport,
    formatDuration,
};
