const fs = require("fs");
const path = require("path");

const ASSET_CATEGORIES = [
    "workflows",
    "openspec_skills",
    "upstream_skills",
    "wrappers",
    "templates",
    "rules",
];

const CATEGORY_MATCHERS = [
    { category: "workflows", regex: /^src\/templates\/workflows\/([^/]+)\.md$/ },
    { category: "openspec_skills", regex: /^src\/skills\/openspec\/([^/]+)\/SKILL\.md$/ },
    { category: "upstream_skills", regex: /^src\/skills\/upstream\/([^/]+)\/SKILL\.md$/ },
    { category: "wrappers", regex: /^src\/wrapper\/([^/]+)\/using-superpowers\/SKILL\.md$/ },
    { category: "templates", regex: /^src\/templates\/openspec\/templates\/([^/]+)\.(md|json)$/ },
    { category: "rules", regex: /^src\/rules\/([^/]+)\.md$/ },
];

const NEGATED_RE = /\b(?:do\s+not|don't|never)\s+(?:invoke|use|activate)\b/i;
const CORE_TEMPLATES = ["proposal.md", "design.md", "tasks.md", "delta.spec.md"];

function estimateTokens(text) {
    if (typeof text !== "string" || text.length === 0) return 0;
    return Math.ceil(text.length / 4);
}

function categorizeAssetPath(relPosixPath) {
    const normalized = String(relPosixPath).replace(/\\/g, "/");
    const base = path.posix.basename(normalized);
    if (base === ".DS_Store" || base.startsWith("._")) return null;
    for (const m of CATEGORY_MATCHERS) {
        if (m.regex.test(normalized)) return m.category;
    }
    return null;
}

function walkDirPosix(dir, rootDir) {
    if (!fs.existsSync(dir)) return [];
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === ".DS_Store" || entry.name.startsWith("._")) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkDirPosix(full, rootDir));
        } else if (entry.isFile()) {
            results.push(path.relative(rootDir, full).split(path.sep).join("/"));
        }
    }
    return results;
}

function extractReferencedSkills(workflowContent, availableSkills) {
    const available = new Set(availableSkills);
    const found = new Set();
    for (const line of String(workflowContent || "").split(/\r?\n/)) {
        if (NEGATED_RE.test(line)) continue;
        for (const match of line.matchAll(/`([a-z0-9-]+)`/gi)) {
            if (available.has(match[1])) found.add(match[1]);
        }
    }
    return Array.from(found);
}

function extractReferencedTemplates(workflowContent, availableTemplates) {
    const available = new Set(availableTemplates);
    const found = new Set();
    const text = String(workflowContent || "");
    for (const line of text.split(/\r?\n/)) {
        if (NEGATED_RE.test(line)) continue;
        for (const tpl of available) {
            const escaped = tpl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const re = new RegExp(`(?:^|[\\s/\`"'(])${escaped}(?=$|[\\s\`"',.):])`);
            if (re.test(line)) found.add(tpl);
        }
    }
    if (/\.opow\/templates\/?/i.test(text)) {
        for (const core of CORE_TEMPLATES) {
            if (available.has(core)) found.add(core);
        }
    }
    return Array.from(found);
}

/**
 * Compute static prompt token budget snapshot for an exported variant directory.
 * @param {string} variantDir
 * @returns {object}
 */
function computeStaticSnapshot(variantDir) {
    const srcDir = path.join(variantDir, "src");
    const relPaths = walkDirPosix(srcDir, variantDir).sort();

    const byCategory = {};
    for (const cat of ASSET_CATEGORIES) {
        byCategory[cat] = { files: 0, tokens: 0 };
    }

    const total = { files: 0, tokens: 0 };
    const fileTokens = new Map();
    const skillToPath = new Map();
    const templateToPath = new Map();
    const workflows = [];

    for (const relPath of relPaths) {
        const category = categorizeAssetPath(relPath);
        if (!category) continue;
        const content = fs.readFileSync(path.join(variantDir, relPath), "utf8");
        const tokens = estimateTokens(content);

        fileTokens.set(relPath, tokens);
        byCategory[category].files += 1;
        byCategory[category].tokens += tokens;
        total.files += 1;
        total.tokens += tokens;

        if (category === "openspec_skills" || category === "upstream_skills") {
            const parts = relPath.split("/");
            const skillName = parts[parts.length - 2];
            skillToPath.set(skillName, relPath);
            if (!skillName.startsWith("opow-")) {
                skillToPath.set(`opow-${skillName}`, relPath);
            }
        } else if (category === "templates") {
            templateToPath.set(path.posix.basename(relPath), relPath);
        } else if (category === "workflows") {
            workflows.push({
                name: path.posix.basename(relPath, ".md"),
                path: relPath,
                content,
                tokens,
            });
        }
    }

    const byFlow = {};
    const availableSkills = Array.from(skillToPath.keys());
    const availableTemplates = Array.from(templateToPath.keys());

    for (const wf of workflows) {
        const skills = extractReferencedSkills(wf.content, availableSkills);
        const templates = extractReferencedTemplates(wf.content, availableTemplates);
        const seenPaths = new Set([wf.path]);
        let flowTokens = wf.tokens;

        for (const s of skills) {
            const p = skillToPath.get(s);
            if (p && !seenPaths.has(p)) {
                seenPaths.add(p);
                flowTokens += fileTokens.get(p) || 0;
            }
        }
        for (const t of templates) {
            const p = templateToPath.get(t);
            if (p && !seenPaths.has(p)) {
                seenPaths.add(p);
                flowTokens += fileTokens.get(p) || 0;
            }
        }
        byFlow[wf.name] = flowTokens;
    }

    return { byCategory, byFlow, total };
}

function pctDelta(a, b) {
    if (a === 0) return b === 0 ? 0 : null;
    return Math.round(((b - a) / a) * 1000) / 10;
}

/**
 * Diff two static snapshots (A vs B).
 */
function diffStatic(snapA, snapB) {
    const categories = ASSET_CATEGORIES.map((cat) => {
        const a = snapA.byCategory[cat]?.tokens || 0;
        const b = snapB.byCategory[cat]?.tokens || 0;
        return { category: cat, a, b, delta: b - a, deltaPct: pctDelta(a, b) };
    });

    const flowNames = Array.from(
        new Set([...Object.keys(snapA.byFlow), ...Object.keys(snapB.byFlow)])
    ).sort();
    const flows = flowNames.map((flow) => {
        const a = snapA.byFlow[flow] ?? null;
        const b = snapB.byFlow[flow] ?? null;
        const delta = a !== null && b !== null ? b - a : null;
        const deltaPct = a !== null && b !== null ? pctDelta(a, b) : null;
        return { flow, a, b, delta, deltaPct };
    });

    const totalA = snapA.total.tokens;
    const totalB = snapB.total.tokens;
    return {
        categories,
        flows,
        total: { a: totalA, b: totalB, delta: totalB - totalA, deltaPct: pctDelta(totalA, totalB) },
    };
}

module.exports = {
    ASSET_CATEGORIES,
    estimateTokens,
    computeStaticSnapshot,
    diffStatic,
};
