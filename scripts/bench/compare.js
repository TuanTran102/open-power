const { formatDuration } = require("./transcript");

function round1(num) {
    return Math.round(num * 10) / 10;
}

/**
 * Compute exact arithmetic median of numeric values.
 * @param {number[]} numbers
 * @returns {number}
 */
function median(numbers) {
    const valid = (numbers || []).filter((n) => typeof n === "number" && Number.isFinite(n));
    if (valid.length === 0) {
        return 0;
    }
    const sorted = [...valid].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) {
        return sorted[mid];
    }
    return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Parse --pass-a / --pass-b option such as "2/3" or "2".
 * @param {string|number} raw
 * @param {number} defaultTotal
 * @returns {{passed: number, total: number}}
 */
function parsePassInfo(raw, defaultTotal) {
    const str = String(raw).trim();
    if (str.includes("/")) {
        const parts = str.split("/");
        if (parts.length !== 2) {
            throw new Error(`Invalid pass value "${raw}". Expected format "P/N" (e.g. "2/3") or integer.`);
        }
        const passed = Number(parts[0]);
        const total = Number(parts[1]);
        if (!Number.isFinite(passed) || !Number.isFinite(total) || total <= 0 || passed < 0 || passed > total) {
            throw new Error(`Invalid pass ratio "${raw}". Expected 0 <= passed <= total and total > 0.`);
        }
        return { passed, total };
    }
    const passed = Number(str);
    if (!Number.isFinite(passed) || passed < 0 || (defaultTotal > 0 && passed > defaultTotal)) {
        throw new Error(`Invalid pass count "${raw}" for ${defaultTotal} run(s).`);
    }
    return { passed, total: defaultTotal };
}

/**
 * Aggregate a list of normalized sessions using medians and optional pass-rate efficiency.
 * @param {Array<object>} sessions
 * @param {{passed: number, total: number}|null} [passInfo]
 * @returns {object}
 */
function aggregateSessions(sessions, passInfo = null) {
    if (!Array.isArray(sessions) || sessions.length === 0) {
        throw new Error("Cannot aggregate empty session list.");
    }

    const metrics = {
        uncached_input: median(sessions.map((s) => s.tokens.uncached_input)),
        cache_read: median(sessions.map((s) => s.tokens.cache_read)),
        cache_write: median(sessions.map((s) => s.tokens.cache_write)),
        total_input: median(sessions.map((s) => s.tokens.total_input)),
        output: median(sessions.map((s) => s.tokens.output)),
        total: median(sessions.map((s) => s.tokens.total)),
        cache_hit_pct: round1(median(sessions.map((s) => s.tokens.cache_hit_pct))),
        llm_steps: median(sessions.map((s) => s.steps.llm_steps)),
        user_turns: median(sessions.map((s) => s.steps.user_turns)),
        errors: median(sessions.map((s) => s.steps.errors)),
        tool_total: median(sessions.map((s) => s.tools.total)),
        reads: median(sessions.map((s) => s.tools.byCategory.reads)),
        searches: median(sessions.map((s) => s.tools.byCategory.searches)),
        writes: median(sessions.map((s) => s.tools.byCategory.writes)),
        commands: median(sessions.map((s) => s.tools.byCategory.commands)),
        subagents: median(sessions.map((s) => s.tools.byCategory.subagents)),
        other: median(sessions.map((s) => s.tools.byCategory.other)),
        duration_ms: median(sessions.map((s) => s.duration_ms)),
    };

    if (passInfo) {
        const sumTotal = sessions.reduce((acc, s) => acc + s.tokens.total, 0);
        const sumUncached = sessions.reduce((acc, s) => acc + s.tokens.uncached_input, 0);
        metrics.pass_rate_pct = round1((passInfo.passed / passInfo.total) * 100);
        metrics.tokens_per_passing_task = passInfo.passed > 0 ? Math.round(sumTotal / passInfo.passed) : null;
        metrics.uncached_per_passing_task = passInfo.passed > 0 ? Math.round(sumUncached / passInfo.passed) : null;
    }

    return {
        runs: sessions.length,
        pass: passInfo,
        metrics,
    };
}

function computeMetricDelta(aVal, bVal) {
    if (aVal === null || aVal === undefined || bVal === null || bVal === undefined) {
        return { diff: null, pct: null };
    }
    const diff = round1(bVal - aVal);
    const pct = aVal !== 0 ? round1(((bVal - aVal) / aVal) * 100) : null;
    return { diff, pct };
}

/**
 * Compare group A vs group B session runs and classify outcome.
 * @param {Array<object>} sessionsA
 * @param {Array<object>} sessionsB
 * @param {object} [options]
 * @returns {object}
 */
function compareRuns(sessionsA, sessionsB, options = {}) {
    const labelA = options.labelA || "A";
    const labelB = options.labelB || "B";
    const passA = options.passA || null;
    const passB = options.passB || null;

    const aggA = aggregateSessions(sessionsA, passA);
    const aggB = aggregateSessions(sessionsB, passB);

    const keys = Object.keys(aggA.metrics).filter(
        (k) => k in aggB.metrics && aggA.metrics[k] !== undefined && aggB.metrics[k] !== undefined
    );
    const deltas = {};
    for (const key of keys) {
        deltas[key] = computeMetricDelta(aggA.metrics[key], aggB.metrics[key]);
    }

    const warnings = [];
    let improved = 0;
    let regressed = 0;

    // 1. Quality axis (pass rate)
    if (deltas.pass_rate_pct && deltas.pass_rate_pct.diff !== null) {
        if (deltas.pass_rate_pct.diff > 0) {
            improved += 1;
        } else if (deltas.pass_rate_pct.diff < 0) {
            regressed += 1;
            warnings.push(
                `Pass rate dropped from ${aggA.metrics.pass_rate_pct}% to ${aggB.metrics.pass_rate_pct}% (${deltas.pass_rate_pct.diff}pp).`
            );
        }
    }

    // 2. Uncached input tokens
    const uncachedDelta = deltas.uncached_input;
    if (uncachedDelta.pct !== null) {
        if (uncachedDelta.pct <= -2) improved += 1;
        else if (uncachedDelta.pct >= 2) regressed += 1;
        if (uncachedDelta.pct > 10) {
            warnings.push(`Uncached input tokens increased by +${uncachedDelta.pct}%.`);
        }
    } else if (aggA.metrics.uncached_input === 0 && aggB.metrics.uncached_input > 0) {
        regressed += 1;
        warnings.push(`Uncached input tokens increased from 0 to ${aggB.metrics.uncached_input}.`);
    }

    // 3. Output tokens
    const outDelta = deltas.output;
    if (outDelta.pct !== null) {
        if (outDelta.pct <= -2) improved += 1;
        else if (outDelta.pct >= 2) regressed += 1;
    } else if (aggA.metrics.output === 0 && aggB.metrics.output > 0) {
        regressed += 1;
    }

    // 4. Friction (user turns)
    if (deltas.user_turns.diff < 0) {
        improved += 1;
    } else if (deltas.user_turns.diff > 0) {
        regressed += 1;
        warnings.push(
            `User turns (friction) increased from ${aggA.metrics.user_turns} to ${aggB.metrics.user_turns}.`
        );
    }

    // 5. Exploration overhead (reads + searches)
    const expA = aggA.metrics.reads + aggA.metrics.searches;
    const expB = aggB.metrics.reads + aggB.metrics.searches;
    const expDiff = expB - expA;
    const expPct = expA > 0 ? round1((expDiff / expA) * 100) : null;
    if (expPct !== null) {
        if (expPct <= -5) improved += 1;
        else if (expPct >= 5) regressed += 1;
        if (expPct > 20) {
            warnings.push(`Exploration calls (reads + searches) increased by +${expPct}% (${expA} -> ${expB}).`);
        }
    } else if (expDiff >= 2) {
        regressed += 1;
        warnings.push(`Exploration calls (reads + searches) increased from ${expA} to ${expB}.`);
    }

    let verdict = "neutral";
    if (improved > 0 && regressed === 0) verdict = "better";
    else if (regressed > 0 && improved === 0) verdict = "worse";
    else if (improved > 0 && regressed > 0) verdict = "mixed";

    return {
        labelA,
        labelB,
        countA: sessionsA.length,
        countB: sessionsB.length,
        a: aggA,
        b: aggB,
        deltas,
        verdict,
        warnings,
    };
}

function fmtValue(key, val) {
    if (val === null || val === undefined) return "n/a";
    if (key === "duration_ms") return formatDuration(val);
    if (key.endsWith("_pct")) return `${val}%`;
    return Number(val).toLocaleString("en-US");
}

function fmtDelta(key, delta) {
    if (!delta || delta.diff === null) return "n/a";
    const sign = delta.diff > 0 ? "+" : "";
    const diffStr = key === "duration_ms"
        ? `${delta.diff > 0 ? "+" : delta.diff < 0 ? "-" : ""}${formatDuration(Math.abs(delta.diff))}`
        : `${sign}${Number(delta.diff).toLocaleString("en-US")}`;
    const pctStr = delta.pct !== null && !key.endsWith("_pct")
        ? ` (${delta.pct > 0 ? "+" : ""}${delta.pct}%)`
        : "";
    return `${diffStr}${pctStr}`;
}

/**
 * Format A/B comparison result as text, markdown, or JSON.
 * @param {object} result
 * @param {"text"|"md"|"json"} [format]
 * @returns {string}
 */
function formatCompareReport(result, format = "text") {
    if (format === "json") {
        return JSON.stringify(result, null, 2);
    }

    const rows = [
        ["uncached_input", "Uncached Input"],
        ["cache_read", "Cache Read"],
        ["cache_write", "Cache Write"],
        ["total_input", "Total Input"],
        ["output", "Output"],
        ["total", "Total Tokens"],
        ["cache_hit_pct", "Cache Hit %"],
        ["llm_steps", "LLM Steps"],
        ["user_turns", "User Turns"],
        ["tool_total", "Tool Calls"],
        ["reads", "  reads"],
        ["searches", "  searches"],
        ["writes", "  writes"],
        ["commands", "  commands"],
        ["subagents", "  subagents"],
        ["duration_ms", "Duration"],
    ];

    if ("pass_rate_pct" in result.deltas) {
        rows.push(["pass_rate_pct", "Pass Rate"]);
        rows.push(["tokens_per_passing_task", "Tokens / Passing Task"]);
        rows.push(["uncached_per_passing_task", "Uncached / Passing Task"]);
    }

    const lines = [];
    const header = `A/B Comparison (median): ${result.labelA} (n=${result.countA}) vs ${result.labelB} (n=${result.countB})`;

    if (format === "md") {
        lines.push(`## ${header}`);
        lines.push(`**Verdict**: \`${result.verdict.toUpperCase()}\``);
        lines.push("");
        lines.push(`| Metric | ${result.labelA} | ${result.labelB} | Delta |`);
        lines.push("|---|---:|---:|---:|");
        for (const [key, label] of rows) {
            lines.push(
                `| ${label.trim()} | ${fmtValue(key, result.a.metrics[key])} | ${fmtValue(key, result.b.metrics[key])} | ${fmtDelta(key, result.deltas[key])} |`
            );
        }
        if (result.warnings.length > 0) {
            lines.push("");
            lines.push("**Warnings:**");
            for (const w of result.warnings) lines.push(`- ${w}`);
        }
        return lines.join("\n");
    }

    lines.push(header);
    lines.push(`Verdict: ${result.verdict.toUpperCase()}`);
    lines.push("");
    const colHeader = `  ${"Metric".padEnd(26)} ${result.labelA.padStart(14)} ${result.labelB.padStart(14)}  Delta`;
    lines.push(colHeader);
    lines.push(`  ${"-".repeat(74)}`);
    for (const [key, label] of rows) {
        const aStr = fmtValue(key, result.a.metrics[key]).padStart(14);
        const bStr = fmtValue(key, result.b.metrics[key]).padStart(14);
        const dStr = fmtDelta(key, result.deltas[key]);
        lines.push(`  ${label.padEnd(26)} ${aStr} ${bStr}  ${dStr}`);
    }
    if (result.warnings.length > 0) {
        lines.push("");
        lines.push("Warnings:");
        for (const w of result.warnings) lines.push(`  ! ${w}`);
    }
    return lines.join("\n");
}

module.exports = {
    median,
    parsePassInfo,
    aggregateSessions,
    compareRuns,
    formatCompareReport,
};
