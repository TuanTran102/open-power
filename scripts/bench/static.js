const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const ASSET_CATEGORIES = [
    "workflows",
    "openspec_skills",
    "upstream_skills",
    "templates",
    "rules",
    "wrappers",
];

const CATEGORY_MATCHERS = [
    { category: "workflows", regex: /^src\/templates\/workflows\/([^/]+)\.md$/ },
    { category: "openspec_skills", regex: /^src\/skills\/openspec\/([^/]+)\/SKILL\.md$/ },
    { category: "upstream_skills", regex: /^src\/skills\/upstream\/([^/]+)\/SKILL\.md$/ },
    { category: "templates", regex: /^src\/templates\/openspec\/templates\/([^/]+)\.(md|json)$/ },
    { category: "rules", regex: /^src\/rules\/([^/]+)\.md$/ },
    { category: "wrappers", regex: /^src\/wrapper\/([^/]+)\/using-superpowers\/SKILL\.md$/ },
];

const NEGATED_INVOCATION_RE = /\b(?:do\s+not|don't|never)\s+(?:invoke|use|activate)\b/i;
const CORE_TEMPLATE_SCAFFOLD = ["proposal.md", "design.md", "tasks.md", "delta.spec.md"];

/**
 * Deterministic zero-dependency heuristic token estimator (~tokens).
 * Useful for relative A/B prompt-budget comparisons across git refs.
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
    if (typeof text !== "string" || text.length === 0) {
        return 0;
    }
    const words = (text.match(/\S+/g) || []).length;
    const byteEstimate = Buffer.byteLength(text, "utf8") / 4;
    return Math.ceil((byteEstimate + words * 1.3) / 2);
}

/**
 * Check if a relative POSIX path belongs to a tracked prompt asset category.
 * Ignores macOS AppleDouble files (._*) and .DS_Store.
 * @param {string} relPosixPath
 * @returns {string|null}
 */
function categorizeAssetPath(relPosixPath) {
    const normalized = String(relPosixPath).replace(/\\/g, "/");
    const base = path.posix.basename(normalized);
    if (base === ".DS_Store" || base.startsWith("._")) {
        return null;
    }
    for (const matcher of CATEGORY_MATCHERS) {
        if (matcher.regex.test(normalized)) {
            return matcher.category;
        }
    }
    return null;
}

/**
 * Walk a directory recursively and return POSIX-normalized relative file paths.
 * @param {string} dir
 * @param {string} rootDir
 * @returns {string[]}
 */
function walkDirPosix(dir, rootDir) {
    if (!fs.existsSync(dir)) {
        return [];
    }
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === ".DS_Store" || entry.name.startsWith("._")) {
            continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkDirPosix(fullPath, rootDir));
        } else if (entry.isFile()) {
            const rel = path.relative(rootDir, fullPath).split(path.sep).join("/");
            results.push(rel);
        }
    }
    return results;
}

/**
 * Load categorized prompt assets from the current working directory.
 * @param {string} [cwd]
 * @returns {Array<{path: string, category: string, content: string}>}
 */
function loadAssetsFromWorktree(cwd = process.cwd()) {
    const srcDir = path.join(cwd, "src");
    const relPaths = walkDirPosix(srcDir, cwd).sort();
    const assets = [];
    for (const relPath of relPaths) {
        const category = categorizeAssetPath(relPath);
        if (!category) {
            continue;
        }
        const content = fs.readFileSync(path.join(cwd, relPath), "utf8");
        assets.push({ path: relPath, category, content });
    }
    return assets;
}

/**
 * Execute git safely via execFileSync.
 * @param {string[]} args
 * @param {string} cwd
 * @returns {string}
 */
function runGitArgs(args, cwd) {
    return childProcess.execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
    });
}

/**
 * Load categorized prompt assets from a git commit/ref.
 * @param {string} ref
 * @param {string} [cwd]
 * @returns {Array<{path: string, category: string, content: string}>}
 */
function loadAssetsFromGitRef(ref, cwd = process.cwd()) {
    const rawList = runGitArgs(["ls-tree", "-r", "-z", "--name-only", ref, "--", "src"], cwd);
    const relPaths = rawList
        .split("\0")
        .filter(Boolean)
        .sort();

    const assets = [];
    for (const relPath of relPaths) {
        const category = categorizeAssetPath(relPath);
        if (!category) {
            continue;
        }
        const content = runGitArgs(["show", `${ref}:${relPath}`], cwd);
        assets.push({ path: relPath, category, content });
    }
    return assets;
}

/**
 * Extract referenced skill names from workflow markdown, skipping negated mentions.
 * @param {string} workflowContent
 * @param {Iterable<string>} availableSkillNames
 * @returns {string[]}
 */
function extractReferencedSkills(workflowContent, availableSkillNames) {
    const available = new Set(availableSkillNames);
    const found = new Set();
    const lines = String(workflowContent || "").split(/\r?\n/);

    for (const line of lines) {
        if (NEGATED_INVOCATION_RE.test(line)) {
            continue;
        }
        const matches = line.matchAll(/`([a-z0-9-]+)`/gi);
        for (const match of matches) {
            const candidate = match[1];
            if (available.has(candidate)) {
                found.add(candidate);
            }
        }
    }

    return Array.from(found);
}

/**
 * Extract referenced OpenSpec template filenames from workflow markdown.
 * @param {string} workflowContent
 * @param {Iterable<string>} availableTemplateNames
 * @returns {string[]}
 */
function extractReferencedTemplates(workflowContent, availableTemplateNames) {
    const available = new Set(availableTemplateNames);
    const found = new Set();
    const text = String(workflowContent || "");
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
        if (NEGATED_INVOCATION_RE.test(line)) {
            continue;
        }
        for (const tplName of available) {
            const escaped = tplName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const re = new RegExp(`(?:^|[\\s/\`"'(])${escaped}(?=$|[\\s\`"',.):])`);
            if (re.test(line)) {
                found.add(tplName);
            }
        }
    }

    if (/\.opow\/templates\/?/i.test(text)) {
        for (const core of CORE_TEMPLATE_SCAFFOLD) {
            if (available.has(core)) {
                found.add(core);
            }
        }
    }

    return Array.from(found);
}

/**
 * Build a static token snapshot for a git ref or WORKTREE.
 * @param {string} ref
 * @param {string} [cwd]
 * @returns {object}
 */
function computeStaticSnapshot(ref = "WORKTREE", cwd = process.cwd()) {
    const assets = ref === "WORKTREE"
        ? loadAssetsFromWorktree(cwd)
        : loadAssetsFromGitRef(ref, cwd);

    const byCategory = {};
    for (const cat of ASSET_CATEGORIES) {
        byCategory[cat] = { files: 0, bytes: 0, lines: 0, tokens: 0 };
    }

    const total = { files: 0, bytes: 0, lines: 0, tokens: 0 };
    const files = {};
    const skillToPath = new Map();
    const templateToPath = new Map();
    const workflowAssets = [];

    for (const asset of assets) {
        const bytes = Buffer.byteLength(asset.content, "utf8");
        const lines = asset.content.length === 0 ? 0 : asset.content.split(/\r?\n/).length;
        const tokens = estimateTokens(asset.content);

        files[asset.path] = {
            category: asset.category,
            bytes,
            lines,
            tokens,
        };

        const catBucket = byCategory[asset.category];
        catBucket.files += 1;
        catBucket.bytes += bytes;
        catBucket.lines += lines;
        catBucket.tokens += tokens;

        total.files += 1;
        total.bytes += bytes;
        total.lines += lines;
        total.tokens += tokens;

        if (asset.category === "openspec_skills" || asset.category === "upstream_skills") {
            const skillName = path.posix.basename(path.posix.dirname(asset.path));
            skillToPath.set(skillName, asset.path);
        } else if (asset.category === "templates") {
            const tplName = path.posix.basename(asset.path);
            templateToPath.set(tplName, asset.path);
        } else if (asset.category === "workflows") {
            workflowAssets.push(asset);
        }
    }

    const flows = {};
    for (const wf of workflowAssets) {
        const flowName = path.posix.basename(wf.path, ".md");
        const skills = extractReferencedSkills(wf.content, skillToPath.keys());
        const templates = extractReferencedTemplates(wf.content, templateToPath.keys());

        const workflowTokens = files[wf.path].tokens;
        let skillTokens = 0;
        for (const s of skills) {
            skillTokens += files[skillToPath.get(s)].tokens;
        }
        let templateTokens = 0;
        for (const t of templates) {
            templateTokens += files[templateToPath.get(t)].tokens;
        }

        flows[flowName] = {
            workflowFile: wf.path,
            workflowTokens,
            skills,
            templates,
            totalTokens: workflowTokens + skillTokens + templateTokens,
        };
    }

    return {
        ref,
        total,
        byCategory,
        files,
        flows,
    };
}

function round1(num) {
    return Math.round(num * 10) / 10;
}

function computeDelta(baseVal, headVal) {
    const deltaTokens = headVal - baseVal;
    const deltaPct = baseVal !== 0 ? round1((deltaTokens / baseVal) * 100) : null;
    return { base: baseVal, head: headVal, deltaTokens, deltaPct };
}

/**
 * Diff two static snapshots across totals, categories, flows, and individual files.
 * @param {object} baseSnap
 * @param {object} headSnap
 * @returns {object}
 */
function diffStaticSnapshots(baseSnap, headSnap) {
    const total = {
        ...computeDelta(baseSnap.total.tokens, headSnap.total.tokens),
        filesDelta: headSnap.total.files - baseSnap.total.files,
        bytesDelta: headSnap.total.bytes - baseSnap.total.bytes,
        linesDelta: headSnap.total.lines - baseSnap.total.lines,
    };

    const byCategory = {};
    for (const cat of ASSET_CATEGORIES) {
        byCategory[cat] = computeDelta(
            baseSnap.byCategory[cat]?.tokens || 0,
            headSnap.byCategory[cat]?.tokens || 0
        );
    }

    const flowNames = Array.from(
        new Set([...Object.keys(baseSnap.flows), ...Object.keys(headSnap.flows)])
    ).sort();
    const flows = {};
    for (const name of flowNames) {
        const b = baseSnap.flows[name];
        const h = headSnap.flows[name];
        const baseTokens = b ? b.totalTokens : 0;
        const headTokens = h ? h.totalTokens : 0;
        const delta = computeDelta(baseTokens, headTokens);
        let status = "unchanged";
        if (!b) status = "added";
        else if (!h) status = "removed";
        else if (delta.deltaTokens !== 0) status = "changed";

        flows[name] = {
            ...delta,
            status,
            skillsBase: b ? b.skills : [],
            skillsHead: h ? h.skills : [],
        };
    }

    const allFiles = Array.from(
        new Set([...Object.keys(baseSnap.files), ...Object.keys(headSnap.files)])
    );
    const changedFiles = [];
    for (const filePath of allFiles) {
        const b = baseSnap.files[filePath];
        const h = headSnap.files[filePath];
        const baseTokens = b ? b.tokens : 0;
        const headTokens = h ? h.tokens : 0;
        if (!b || !h || baseTokens !== headTokens || b.bytes !== h.bytes) {
            const delta = computeDelta(baseTokens, headTokens);
            changedFiles.push({
                path: filePath,
                category: (h || b).category,
                status: !b ? "added" : !h ? "removed" : "modified",
                baseTokens,
                headTokens,
                deltaTokens: delta.deltaTokens,
                deltaPct: delta.deltaPct,
            });
        }
    }

    changedFiles.sort((a, b) => {
        const absDiff = Math.abs(b.deltaTokens) - Math.abs(a.deltaTokens);
        return absDiff !== 0 ? absDiff : a.path.localeCompare(b.path);
    });

    return { total, byCategory, flows, changedFiles };
}

/**
 * Run static token analysis (single snapshot or git diff).
 * @param {object} [options]
 * @returns {object}
 */
function benchmarkStatic(options = {}) {
    const cwd = options.cwd || process.cwd();
    const head = options.head || "WORKTREE";
    const base = options.base === undefined ? "HEAD" : options.base;

    const headSnap = computeStaticSnapshot(head, cwd);
    if (!base) {
        return { mode: "snapshot", head: headSnap };
    }

    const baseSnap = computeStaticSnapshot(base, cwd);
    const diff = diffStaticSnapshots(baseSnap, headSnap);
    return {
        mode: "diff",
        base: baseSnap,
        head: headSnap,
        diff,
    };
}

function fmtSigned(n) {
    return n > 0 ? `+${n}` : `${n}`;
}

function fmtPct(pct) {
    if (pct === null || pct === undefined) return "n/a";
    return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function padRow(cols, widths) {
    return cols.map((c, i) => String(c).padEnd(widths[i])).join("  ");
}

/**
 * Format static benchmark output as text, markdown, or JSON.
 * @param {object} result
 * @param {"text"|"md"|"json"} [format]
 * @returns {string}
 */
function formatStaticReport(result, format = "text") {
    if (format === "json") {
        return JSON.stringify(result, null, 2);
    }

    const lines = [];
    if (result.mode === "snapshot") {
        const snap = result.head;
        lines.push(
            format === "md"
                ? `## Static Prompt Budget (${snap.ref}) *(~est. tokens)*`
                : `Static Prompt Budget (${snap.ref}) [~est. tokens]`
        );
        lines.push(`Total: ${snap.total.tokens} ~tokens across ${snap.total.files} files (${snap.total.lines} lines)`);
        lines.push("");

        if (format === "md") {
            lines.push("| Category | Files | ~Tokens |");
            lines.push("|---|---:|---:|");
            for (const cat of ASSET_CATEGORIES) {
                const b = snap.byCategory[cat];
                lines.push(`| ${cat} | ${b.files} | ${b.tokens} |`);
            }
            lines.push("");
            lines.push("| Flow | ~Tokens | Skills | Templates |");
            lines.push("|---|---:|---|---|");
            for (const [name, fl] of Object.entries(snap.flows).sort((a, b) => a[0].localeCompare(b[0]))) {
                lines.push(`| /${name} | ${fl.totalTokens} | ${fl.skills.join(", ") || "-"} | ${fl.templates.join(", ") || "-"} |`);
            }
        } else {
            lines.push("By Category:");
            for (const cat of ASSET_CATEGORIES) {
                const b = snap.byCategory[cat];
                lines.push(`  ${cat.padEnd(18)} ${String(b.files).padStart(3)} files  ${String(b.tokens).padStart(7)} ~tokens`);
            }
            lines.push("");
            lines.push("By Flow (workflow + referenced skills + templates):");
            for (const [name, fl] of Object.entries(snap.flows).sort((a, b) => a[0].localeCompare(b[0]))) {
                lines.push(`  /${name.padEnd(16)} ${String(fl.totalTokens).padStart(7)} ~tokens  skills=[${fl.skills.join(", ")}]`);
            }
        }
        return lines.join("\n");
    }

    const { base, head, diff } = result;
    if (format === "md") {
        lines.push(`## Static Prompt Diff: \`${base.ref}\` -> \`${head.ref}\` *(~est. tokens)*`);
        lines.push("");
        lines.push(`- **Total**: ${diff.total.base} -> ${diff.total.head} (${fmtSigned(diff.total.deltaTokens)}, ${fmtPct(diff.total.deltaPct)})`);
        lines.push("");
        lines.push("| Category | Base | Head | Delta | % |");
        lines.push("|---|---:|---:|---:|---:|");
        for (const cat of ASSET_CATEGORIES) {
            const d = diff.byCategory[cat];
            lines.push(`| ${cat} | ${d.base} | ${d.head} | ${fmtSigned(d.deltaTokens)} | ${fmtPct(d.deltaPct)} |`);
        }
        lines.push("");
        lines.push("| Flow | Base | Head | Delta | % | Status |");
        lines.push("|---|---:|---:|---:|---:|---|");
        for (const [name, d] of Object.entries(diff.flows)) {
            lines.push(`| /${name} | ${d.base} | ${d.head} | ${fmtSigned(d.deltaTokens)} | ${fmtPct(d.deltaPct)} | ${d.status} |`);
        }
        if (diff.changedFiles.length > 0) {
            lines.push("");
            lines.push("| File | Status | Base | Head | Delta |");
            lines.push("|---|---|---:|---:|---:|");
            for (const f of diff.changedFiles) {
                lines.push(`| ${f.path} | ${f.status} | ${f.baseTokens} | ${f.headTokens} | ${fmtSigned(f.deltaTokens)} |`);
            }
        }
        return lines.join("\n");
    }

    lines.push(`Static Prompt Diff: ${base.ref} -> ${head.ref} [~est. tokens]`);
    lines.push(
        `Total: ${diff.total.base} -> ${diff.total.head} ~tokens (${fmtSigned(diff.total.deltaTokens)}, ${fmtPct(diff.total.deltaPct)})`
    );
    lines.push("");
    lines.push("By Category:");
    for (const cat of ASSET_CATEGORIES) {
        const d = diff.byCategory[cat];
        lines.push(
            `  ${padRow([cat, d.base, "->", d.head, `${fmtSigned(d.deltaTokens)} (${fmtPct(d.deltaPct)})`], [18, 7, 2, 7, 16])}`
        );
    }
    lines.push("");
    lines.push("By Flow (workflow + referenced skills + templates):");
    for (const [name, d] of Object.entries(diff.flows)) {
        const tag = d.status !== "unchanged" && d.status !== "changed" ? ` [${d.status}]` : "";
        lines.push(
            `  ${padRow([`/${name}`, d.base, "->", d.head, `${fmtSigned(d.deltaTokens)} (${fmtPct(d.deltaPct)})${tag}`], [18, 7, 2, 7, 22])}`
        );
    }
    lines.push("");
    if (diff.changedFiles.length === 0) {
        lines.push("Changed Files: (none)");
    } else {
        lines.push(`Changed Files (${diff.changedFiles.length}):`);
        for (const f of diff.changedFiles) {
            lines.push(
                `  [${f.status.slice(0, 3).toUpperCase()}] ${f.path} (${f.baseTokens} -> ${f.headTokens}, ${fmtSigned(f.deltaTokens)})`
            );
        }
    }

    return lines.join("\n");
}

module.exports = {
    ASSET_CATEGORIES,
    estimateTokens,
    categorizeAssetPath,
    loadAssetsFromWorktree,
    loadAssetsFromGitRef,
    extractReferencedSkills,
    extractReferencedTemplates,
    computeStaticSnapshot,
    diffStaticSnapshots,
    benchmarkStatic,
    formatStaticReport,
};
