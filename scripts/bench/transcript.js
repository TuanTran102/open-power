const fs = require("fs");

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

function buildTokenSummary(uncachedInput, cacheRead, cacheWrite, output, totalInputOverride = null) {
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
    let llmSteps = 0;
    let userTurns = 0;
    let errors = 0;
    const models = new Set();
    const tools = emptyToolStats();
    const timestamps = [];

    for (const r of records) {
        if (!r || typeof r !== "object") continue;
        if (r.created_at) timestamps.push(r.created_at);

        if (r.type === "PLANNER_RESPONSE") {
            llmSteps += 1;
            uncachedInput += Number(r.input_tokens) || 0;
            cacheRead += Number(r.cache_read_tokens) || 0;
            output += Number(r.output_tokens) || 0;
            if (r.model) models.add(r.model);
            if (Array.isArray(r.tool_calls)) {
                for (const tc of r.tool_calls) {
                    if (tc && tc.name) recordTool(tools, tc.name);
                }
            }
        } else if (r.type === "USER_INPUT") {
            userTurns += 1;
        } else if (r.type === "ERROR_MESSAGE") {
            errors += 1;
        }
    }

    return {
        format: "antigravity",
        models: Array.from(models),
        tokens: buildTokenSummary(uncachedInput, cacheRead, 0, output),
        steps: { llm_steps: llmSteps, user_turns: userTurns, errors },
        tools,
        duration_ms: computeDurationMs(timestamps),
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
    let userTurns = 0;
    let errors = 0;
    let anonIdx = 0;

    for (const r of records) {
        if (!r || typeof r !== "object") continue;
        if (r.timestamp) timestamps.push(r.timestamp);

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
                        if (block.id) {
                            entry.toolUsesById.set(block.id, block.name);
                        } else {
                            currentUnkeyed.push(block.name);
                        }
                    }
                }
                entry.unkeyedTools = currentUnkeyed;
            }
        } else if (r.type === "user") {
            if (isClaudeUserTurn(r)) {
                userTurns += 1;
            }
        }
    }

    let uncachedInput = 0;
    let cacheRead = 0;
    let cacheWrite = 0;
    let output = 0;
    const models = new Set();
    const tools = emptyToolStats();

    for (const entry of assistantByMsgId.values()) {
        if (entry.model) models.add(entry.model);
        if (entry.isError) errors += 1;
        if (entry.usage) {
            uncachedInput += Number(entry.usage.input_tokens) || 0;
            cacheRead += Number(entry.usage.cache_read_input_tokens) || 0;
            cacheWrite += Number(entry.usage.cache_creation_input_tokens) || 0;
            output += Number(entry.usage.output_tokens) || 0;
        }
        for (const name of entry.toolUsesById.values()) {
            recordTool(tools, name);
        }
        for (const name of entry.unkeyedTools) {
            recordTool(tools, name);
        }
    }

    return {
        format: "claude",
        models: Array.from(models),
        tokens: buildTokenSummary(uncachedInput, cacheRead, cacheWrite, output),
        steps: {
            llm_steps: assistantByMsgId.size,
            user_turns: userTurns,
            errors,
        },
        tools,
        duration_ms: computeDurationMs(timestamps),
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
    let tokenCountSteps = 0;
    let assistantMessageSteps = 0;
    let taskStartedTurns = 0;
    let userMessageTurns = 0;
    let errors = 0;
    const models = new Set();
    const tools = emptyToolStats();
    const timestamps = [];

    for (const r of records) {
        if (!r || typeof r !== "object") continue;
        if (r.timestamp) timestamps.push(r.timestamp);

        const payload = r.payload;
        if (!payload || typeof payload !== "object") continue;

        if (r.type === "turn_context" && payload.model) {
            models.add(payload.model);
        } else if (r.type === "event_msg") {
            if (payload.type === "token_count" && payload.info && typeof payload.info === "object") {
                tokenCountSteps += 1;
                if (payload.info.total_token_usage) {
                    lastTotalUsage = payload.info.total_token_usage;
                }
            } else if (payload.type === "task_started") {
                taskStartedTurns += 1;
            } else if (payload.type === "error" || payload.type === "turn_aborted") {
                errors += 1;
            }
        } else if (r.type === "response_item") {
            if (payload.type === "function_call" || payload.type === "custom_tool_call") {
                if (payload.name) recordTool(tools, payload.name);
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

    return {
        format: "codex",
        models: Array.from(models),
        tokens: buildTokenSummary(uncachedInput, cacheRead, cacheWrite, output, totalInput),
        steps: {
            llm_steps: tokenCountSteps > 0 ? tokenCountSteps : assistantMessageSteps,
            user_turns: taskStartedTurns > 0 ? taskStartedTurns : userMessageTurns,
            errors,
        },
        tools,
        duration_ms: computeDurationMs(timestamps),
    };
}

/**
 * Parse a JSONL transcript file from disk into a normalized metrics summary.
 * @param {string} filePath
 * @param {object} [options]
 * @returns {object}
 */
function parseTranscriptFile(filePath, options = {}) {
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
        } catch (err) {
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
        if (format === "md") {
            lines.push(`### Session: \`${s.file}\` (${s.format})`);
            lines.push(`- **Models**: ${s.models.join(", ") || "-"}`);
            lines.push(`- **Tokens**: uncached=${formatNum(s.tokens.uncached_input)} | cache_read=${formatNum(s.tokens.cache_read)} | cache_write=${formatNum(s.tokens.cache_write)} | total_input=${formatNum(s.tokens.total_input)} | output=${formatNum(s.tokens.output)} | **cache_hit=${s.tokens.cache_hit_pct}%**`);
            lines.push(`- **Steps**: llm_steps=${s.steps.llm_steps}, user_turns=${s.steps.user_turns}, errors=${s.steps.errors}, duration=${formatDuration(s.duration_ms)}`);
            lines.push(`- **Tools (${s.tools.total})**: reads=${cats.reads}, searches=${cats.searches}, writes=${cats.writes}, commands=${cats.commands}, subagents=${cats.subagents}, other=${cats.other}`);
            if (s.skippedLines > 0) {
                lines.push(`- **Skipped malformed lines**: ${s.skippedLines}`);
            }
        } else {
            lines.push(`Session: ${s.file} [${s.format}]`);
            lines.push(`  Models:      ${s.models.join(", ") || "-"}`);
            lines.push(
                `  Tokens:      uncached=${formatNum(s.tokens.uncached_input)}  cache_read=${formatNum(s.tokens.cache_read)}  cache_write=${formatNum(s.tokens.cache_write)}  output=${formatNum(s.tokens.output)}`
            );
            lines.push(
                `               total_input=${formatNum(s.tokens.total_input)}  total=${formatNum(s.tokens.total)}  cache_hit=${s.tokens.cache_hit_pct}%`
            );
            lines.push(
                `  Steps:       llm_steps=${s.steps.llm_steps}  user_turns=${s.steps.user_turns}  errors=${s.steps.errors}  duration=${formatDuration(s.duration_ms)}`
            );
            lines.push(
                `  Tools (${s.tools.total}): reads=${cats.reads}  searches=${cats.searches}  writes=${cats.writes}  commands=${cats.commands}  subagents=${cats.subagents}  other=${cats.other}`
            );
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
