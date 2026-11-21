function round1(n) {
    return Math.round(n * 10) / 10;
}

function median(values) {
    const nums = values.filter((v) => typeof v === "number" && Number.isFinite(v)).sort((a, b) => a - b);
    if (nums.length === 0) return null;
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 === 1 ? nums[mid] : round1((nums[mid - 1] + nums[mid]) / 2);
}

function pctDelta(a, b) {
    if (a === null || b === null) return null;
    if (a === 0) return b === 0 ? 0 : null;
    return round1(((b - a) / a) * 100);
}

function summarizeVariant(jobs) {
    const valid = jobs.filter((j) => j.session);
    const passKnown = jobs.filter((j) => j.pass !== null && j.pass !== undefined);
    const passCount = passKnown.filter((j) => j.pass === true).length;
    const passRate = passKnown.length > 0 ? round1((passCount / passKnown.length) * 100) : null;

    const m = (fn) => median(valid.map(fn));
    const totalTokensMed = m((j) => j.session.tokens.total);
    const totalTokensSum = valid.reduce((acc, j) => acc + j.session.tokens.total, 0);
    const tokensPerPassing = passCount > 0 && valid.length > 0 ? Math.round(totalTokensSum / passCount) : null;

    const skillsSet = new Set();
    let testsRunSum = 0;
    let worktreeCount = 0;
    let commitsSum = 0;
    const modelsSet = new Set();

    for (const j of valid) {
        for (const s of j.session.compliance.skills_read || []) skillsSet.add(s);
        testsRunSum += j.session.compliance.tests_run || 0;
        if (j.session.compliance.used_worktree) worktreeCount += 1;
        commitsSum += j.session.compliance.commits || 0;
        for (const mod of j.session.models || []) modelsSet.add(mod);
    }

    return {
        totalJobs: jobs.length,
        parsedJobs: valid.length,
        passCount,
        passTotal: passKnown.length,
        metrics: {
            pass_rate_pct: passRate,
            total_tokens: totalTokensMed,
            uncached_input: m((j) => j.session.tokens.uncached),
            cache_read: m((j) => j.session.tokens.cache_read),
            output: m((j) => j.session.tokens.output),
            cache_hit_pct: m((j) => j.session.tokens.cache_hit_pct),
            peak_context: m((j) => j.session.tokens.peak_context),
            llm_steps: m((j) => j.session.steps.llm_steps),
            user_turns: m((j) => j.session.steps.user_turns),
            tool_calls: m((j) => j.session.tools.total),
            reads: m((j) => j.session.tools.reads),
            searches: m((j) => j.session.tools.searches),
            edits: m((j) => j.session.tools.edits),
            commands: m((j) => j.session.tools.commands),
            subagent_share_pct: m((j) => j.session.subagent_share_pct),
            rereads: m((j) => j.session.waste.rereads),
            tool_errors: m((j) => j.session.waste.tool_errors),
            edit_retries: m((j) => j.session.waste.edit_retries),
            active_duration_ms: m((j) => j.session.active_duration_ms),
            tokens_per_passing: tokensPerPassing,
            reads_plus_searches: m((j) => j.session.tools.reads + j.session.tools.searches),
        },
        compliance: {
            skills_read: Array.from(skillsSet).sort(),
            tests_run: testsRunSum,
            used_worktree: valid.length > 0 ? `${worktreeCount}/${valid.length}` : "n/a",
            commits: commitsSum,
        },
        models: Array.from(modelsSet).sort(),
    };
}

const NOISE_THRESHOLD_PCT = 3;

const VERDICT_AXES = [
    { key: "pass_rate_pct", label: "pass_rate", higherIsBetter: true },
    { key: "total_tokens", label: "total_tokens", higherIsBetter: false },
    { key: "uncached_input", label: "uncached", higherIsBetter: false },
    { key: "output", label: "output", higherIsBetter: false },
    { key: "peak_context", label: "peak_context", higherIsBetter: false },
    { key: "llm_steps", label: "llm_steps", higherIsBetter: false },
    { key: "reads_plus_searches", label: "reads+searches", higherIsBetter: false },
];

function computeVerdict(sumA, sumB) {
    const improved = [];
    const regressed = [];

    for (const axis of VERDICT_AXES) {
        const a = sumA.metrics[axis.key];
        const b = sumB.metrics[axis.key];
        if (a === null || b === null) continue;
        const deltaPct = pctDelta(a, b);
        if (deltaPct === null) continue;
        if (Math.abs(deltaPct) <= NOISE_THRESHOLD_PCT) continue;

        const isBetter = axis.higherIsBetter ? b > a : b < a;
        if (isBetter) improved.push(`${axis.label} (${deltaPct > 0 ? "+" : ""}${deltaPct}%)`);
        else regressed.push(`${axis.label} (${deltaPct > 0 ? "+" : ""}${deltaPct}%)`);
    }

    let verdict = "NEUTRAL";
    if (improved.length > 0 && regressed.length === 0) verdict = "BETTER";
    else if (regressed.length > 0 && improved.length === 0) verdict = "WORSE";
    else if (improved.length > 0 && regressed.length > 0) verdict = "MIXED";

    const parts = [];
    if (improved.length > 0) parts.push(`Improved: ${improved.join(", ")}`);
    if (regressed.length > 0) parts.push(`Regressed: ${regressed.join(", ")}`);
    const summaryLine = parts.length > 0 ? parts.join(" | ") : "All key axes within ±3% noise threshold.";

    return { verdict, summaryLine, improved, regressed };
}

/**
 * Aggregate A/B benchmark jobs into summary metrics, verdict, and warnings.
 * @param {Array<object>} jobs
 * @param {Array<string>} [extraWarnings]
 */
function aggregate(jobs, extraWarnings = []) {
    const jobsA = jobs.filter((j) => j.variant === "A");
    const jobsB = jobs.filter((j) => j.variant === "B");

    const sumA = summarizeVariant(jobsA);
    const sumB = summarizeVariant(jobsB);
    const { verdict, summaryLine, improved, regressed } = computeVerdict(sumA, sumB);

    const warnings = [...extraWarnings];
    for (const j of jobs) {
        if (j.status === "FAILED" || !j.session) {
            warnings.push(`Job ${j.id} missing transcript or failed (${j.error || "no convId recorded"}).`);
        }
    }
    if (sumA.metrics.pass_rate_pct !== null && sumB.metrics.pass_rate_pct !== null && sumB.metrics.pass_rate_pct < sumA.metrics.pass_rate_pct) {
        warnings.push(`Pass rate regressed from ${sumA.metrics.pass_rate_pct}% to ${sumB.metrics.pass_rate_pct}%.`);
    }
    if (sumB.metrics.rereads !== null && sumA.metrics.rereads !== null && sumB.metrics.rereads > sumA.metrics.rereads + 1) {
        warnings.push(`Re-reads increased from ${sumA.metrics.rereads} to ${sumB.metrics.rereads}.`);
    }
    if (sumB.metrics.tool_errors !== null && sumA.metrics.tool_errors !== null && sumB.metrics.tool_errors > sumA.metrics.tool_errors + 1) {
        warnings.push(`Tool errors increased from ${sumA.metrics.tool_errors} to ${sumB.metrics.tool_errors}.`);
    }

    return {
        A: sumA,
        B: sumB,
        verdict,
        verdictSummary: summaryLine,
        improved,
        regressed,
        warnings,
    };
}

function fmtNum(v) {
    if (v === null || v === undefined) return "n/a";
    return Number.isInteger(v) ? v.toLocaleString("en-US") : String(v);
}

function fmtDuration(ms) {
    if (ms === null || ms === undefined) return "n/a";
    const sec = Math.round(ms / 100) / 10;
    return `${sec}s`;
}

function fmtDelta(a, b, isDuration = false) {
    if (a === null || b === null) return { delta: "n/a", pct: "n/a" };
    const diff = round1(b - a);
    const sign = diff > 0 ? "+" : "";
    const delta = isDuration ? `${sign}${round1(diff / 1000)}s` : `${sign}${fmtNum(diff)}`;
    const p = pctDelta(a, b);
    const pct = p === null ? "n/a" : `${p > 0 ? "+" : ""}${p}%`;
    return { delta, pct };
}

function betterIndicator(a, b, higherIsBetter) {
    if (a === null || b === null) return "n/a";
    const p = pctDelta(a, b);
    if (p !== null && Math.abs(p) <= NOISE_THRESHOLD_PCT) return "—";
    if (a === b) return "—";
    const bWins = higherIsBetter ? b > a : b < a;
    return bWins ? "B" : "A";
}

const RUNTIME_ROWS = [
    { key: "pass_rate_pct", label: "Pass rate %", higherIsBetter: true, suffix: "%" },
    { key: "total_tokens", label: "Total tokens", higherIsBetter: false },
    { key: "uncached_input", label: "Uncached input", higherIsBetter: false },
    { key: "cache_read", label: "Cache read", higherIsBetter: true },
    { key: "output", label: "Output", higherIsBetter: false },
    { key: "cache_hit_pct", label: "Cache hit %", higherIsBetter: true, suffix: "%" },
    { key: "peak_context", label: "Peak context", higherIsBetter: false },
    { key: "llm_steps", label: "LLM steps", higherIsBetter: false },
    { key: "user_turns", label: "User turns", higherIsBetter: false },
    { key: "tool_calls", label: "Tool calls", higherIsBetter: false },
    { key: "reads", label: "Reads", higherIsBetter: false },
    { key: "searches", label: "Searches", higherIsBetter: false },
    { key: "edits", label: "Edits", higherIsBetter: false },
    { key: "commands", label: "Commands", higherIsBetter: false },
    { key: "subagent_share_pct", label: "Subagent token share %", higherIsBetter: false, suffix: "%" },
    { key: "rereads", label: "Re-reads", higherIsBetter: false },
    { key: "tool_errors", label: "Tool errors", higherIsBetter: false },
    { key: "edit_retries", label: "Edit retries", higherIsBetter: false },
    { key: "active_duration_ms", label: "Active duration", higherIsBetter: false, isDuration: true },
    { key: "tokens_per_passing", label: "Tokens / passing task", higherIsBetter: false },
];

/**
 * Render the fixed-format Markdown benchmark report.
 * @param {object} data
 * @returns {string}
 */
function renderMarkdown(data) {
    const { meta, changes, staticDiff, agg, jobs } = data;
    const models = Array.from(new Set([...(agg.A.models || []), ...(agg.B.models || [])]));
    const modeStr = meta.projectPath ? `project:${meta.projectPath}` : "repo (uncommitted)";
    const tasksStr = meta.customPrompt ? "custom" : (meta.tasks || []).join(", ");

    const lines = [
        "# opow A/B Benchmark Report",
        `- Run: ${meta.ts} | Mode: ${modeStr}`,
        `- A: ${meta.baseRef} @${meta.baseSha} | B: ${meta.headRef} (${changes.length} files changed)`,
        `- Tasks: ${tasksStr || "n/a"} | Runs/variant: ${meta.runs} | Runner: antigravity-subagent | Models: ${models.length > 0 ? models.join(", ") : "n/a"}`,
        "",
        `## Verdict: ${agg.verdict}`,
        agg.verdictSummary,
        "",
        "## 1. Changes Under Test",
    ];

    if (changes.length === 0) {
        lines.push("n/a");
    } else {
        lines.push("| File | Status |", "| --- | --- |");
        for (const c of changes) {
            lines.push(`| ${c.file} | ${c.status} |`);
        }
    }

    lines.push("", "## 2. Static Prompt Budget (~tokens)");
    if (!staticDiff) {
        lines.push("n/a");
    } else {
        lines.push("| Category | A | B | Δ | Δ% |", "| --- | ---: | ---: | ---: | ---: |");
        for (const cat of staticDiff.categories) {
            const d = fmtDelta(cat.a, cat.b);
            lines.push(`| ${cat.category} | ${fmtNum(cat.a)} | ${fmtNum(cat.b)} | ${d.delta} | ${d.pct} |`);
        }
        const td = fmtDelta(staticDiff.total.a, staticDiff.total.b);
        lines.push(`| **Total** | **${fmtNum(staticDiff.total.a)}** | **${fmtNum(staticDiff.total.b)}** | **${td.delta}** | **${td.pct}** |`);

        lines.push("", "### By Flow", "| Flow | A | B | Δ | Δ% |", "| --- | ---: | ---: | ---: | ---: |");
        for (const f of staticDiff.flows) {
            const fd = fmtDelta(f.a, f.b);
            lines.push(`| ${f.flow} | ${fmtNum(f.a)} | ${fmtNum(f.b)} | ${fd.delta} | ${fd.pct} |`);
        }
    }

    lines.push("", "## 3. Outcome");
    const taskNames = Array.from(new Set(jobs.map((j) => j.task)));
    if (taskNames.length === 0) {
        lines.push("n/a");
    } else {
        lines.push("| Task | A pass | B pass |", "| --- | :---: | :---: |");
        for (const t of taskNames) {
            const aList = jobs.filter((j) => j.task === t && j.variant === "A");
            const bList = jobs.filter((j) => j.task === t && j.variant === "B");
            const fmtPass = (arr) => {
                const known = arr.filter((j) => j.pass !== null && j.pass !== undefined);
                if (known.length === 0) return "n/a";
                return `${known.filter((j) => j.pass).length}/${known.length}`;
            };
            lines.push(`| ${t} | ${fmtPass(aList)} | ${fmtPass(bList)} |`);
        }
        const pA = agg.A.metrics.pass_rate_pct !== null ? `${agg.A.metrics.pass_rate_pct}%` : "n/a";
        const pB = agg.B.metrics.pass_rate_pct !== null ? `${agg.B.metrics.pass_rate_pct}%` : "n/a";
        lines.push("", `Pass rate: A ${pA} vs B ${pB}`);
    }

    lines.push("", "## 4. Runtime Metrics (median)");
    lines.push("| Metric | A | B | Δ | Δ% | Better |", "| --- | ---: | ---: | ---: | ---: | :---: |");
    for (const row of RUNTIME_ROWS) {
        const aVal = agg.A.metrics[row.key];
        const bVal = agg.B.metrics[row.key];
        const fmtCell = (v) => {
            if (v === null || v === undefined) return "n/a";
            if (row.isDuration) return fmtDuration(v);
            return row.suffix ? `${fmtNum(v)}${row.suffix}` : fmtNum(v);
        };
        const d = fmtDelta(aVal, bVal, row.isDuration);
        const better = betterIndicator(aVal, bVal, row.higherIsBetter);
        lines.push(`| ${row.label} | ${fmtCell(aVal)} | ${fmtCell(bVal)} | ${d.delta} | ${d.pct} | ${better} |`);
    }

    lines.push("", "## 5. Per-Task Breakdown");
    if (jobs.length === 0) {
        lines.push("n/a");
    } else {
        lines.push("| Task | Variant | Pass | Total tokens | Steps | Duration |", "| --- | :---: | :---: | ---: | ---: | ---: |");
        for (const j of jobs) {
            const passStr = j.pass === true ? "PASS" : j.pass === false ? "FAIL" : "n/a";
            const tokStr = j.session ? fmtNum(j.session.tokens.total) : "n/a";
            const stepStr = j.session ? fmtNum(j.session.steps.llm_steps) : "n/a";
            const durStr = j.session ? fmtDuration(j.session.active_duration_ms) : "n/a";
            lines.push(`| ${j.task} | ${j.variant} | ${passStr} | ${tokStr} | ${stepStr} | ${durStr} |`);
        }
    }

    lines.push("", "## 6. Compliance");
    lines.push("| Signal | A | B |", "| --- | --- | --- |");
    lines.push(`| skills_read | ${agg.A.compliance.skills_read.join(", ") || "none"} | ${agg.B.compliance.skills_read.join(", ") || "none"} |`);
    lines.push(`| tests_run | ${agg.A.compliance.tests_run} | ${agg.B.compliance.tests_run} |`);
    lines.push(`| used_worktree | ${agg.A.compliance.used_worktree} | ${agg.B.compliance.used_worktree} |`);
    lines.push(`| commits | ${agg.A.compliance.commits} | ${agg.B.compliance.commits} |`);

    lines.push("", "## 7. Warnings");
    if (agg.warnings.length === 0) {
        lines.push("None");
    } else {
        for (const w of agg.warnings) {
            lines.push(`- ${w}`);
        }
    }

    lines.push("", "## 8. Notes & Limitations");
    const notes = [
        "Static token counts are estimated using `ceil(chars / 4)`.",
        "Subagents inherit the parent agent's system prompt; isolated behavior relies on workspace `.agent/` rules and skills.",
    ];
    if (meta.runs < 3) {
        notes.unshift(`Small sample size (runs=${meta.runs} < 3); single-run variance may affect medians.`);
    }
    for (const n of notes) {
        lines.push(`- ${n}`);
    }

    lines.push("", "## Artifacts");
    lines.push(`- Run dir: \`${meta.runDir}\``);
    lines.push(`- Report JSON: \`${meta.reportJsonPath}\``);
    lines.push(`- Workspaces: \`${meta.tmpRunDir}\``);

    return lines.join("\n") + "\n";
}

module.exports = {
    aggregate,
    renderMarkdown,
    median,
};
