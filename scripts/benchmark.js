#!/usr/bin/env node

const { benchmarkStatic, formatStaticReport } = require("./bench/static");
const { parseTranscriptFile, formatSessionReport } = require("./bench/transcript");
const { parsePassInfo, compareRuns, formatCompareReport } = require("./bench/compare");

const HELP_TEXT = `Usage: npm run bench -- <command> [options]

Commands:
  static [--base <ref>] [--head <ref|WORKTREE>] [--no-diff] [--json|--md]
      Measure prompt token budget (~est. tokens) across src/ and diff git refs.
      Defaults: --base HEAD --head WORKTREE

  session <file1> [file2 ...] [--format agy|claude|codex] [--json|--md]
      Parse real session JSONL logs (Antigravity, Claude Code, Codex).

  compare --a <file[,file...]> --b <file[,file...]> [options] [--json|--md]
      Compare group A vs B sessions using medians across multiple runs.
      Options: --label-a <name> --label-b <name> --pass-a <P/N> --pass-b <P/N>
               --format agy|claude|codex
`;

function pushCommaSeparated(target, value) {
    for (const item of String(value).split(",")) {
        const trimmed = item.trim();
        if (trimmed) target.push(trimmed);
    }
}

/**
 * Parse CLI arguments for the benchmark harness.
 * @param {string[]} argv
 * @returns {object}
 */
function parseArgs(argv) {
    const positional = [];
    const options = {
        a: [],
        b: [],
        outputFormat: "text",
        noDiff: false,
    };

    const args = [...argv];
    let i = 0;
    while (i < args.length) {
        const token = args[i];
        if (token === "--") {
            i += 1;
            continue;
        }
        if (token === "-h" || token === "--help") {
            options.help = true;
            i += 1;
            continue;
        }
        if (token === "--json") {
            options.outputFormat = "json";
            i += 1;
            continue;
        }
        if (token === "--md") {
            options.outputFormat = "md";
            i += 1;
            continue;
        }
        if (token === "--no-diff") {
            options.noDiff = true;
            i += 1;
            continue;
        }

        if (token.startsWith("--")) {
            const eqIdx = token.indexOf("=");
            let key = eqIdx !== -1 ? token.slice(2, eqIdx) : token.slice(2);
            let value;
            if (eqIdx !== -1) {
                value = token.slice(eqIdx + 1);
            } else {
                if (i + 1 >= args.length) {
                    throw new Error(`Missing value for option --${key}`);
                }
                value = args[++i];
            }

            if (key === "a") pushCommaSeparated(options.a, value);
            else if (key === "b") pushCommaSeparated(options.b, value);
            else if (key === "base") options.base = value;
            else if (key === "head") options.head = value;
            else if (key === "format") options.format = value;
            else if (key === "label-a") options.labelA = value;
            else if (key === "label-b") options.labelB = value;
            else if (key === "pass-a") options.passA = value;
            else if (key === "pass-b") options.passB = value;
            else if (key === "cwd") options.cwd = value;
            else throw new Error(`Unknown option: --${key}`);

            i += 1;
            continue;
        }

        positional.push(token);
        i += 1;
    }

    const command = positional[0] || "help";
    return {
        command,
        args: positional.slice(1),
        options,
    };
}

/**
 * Execute benchmark CLI command and return process exit code.
 * @param {string[]} argv
 * @param {object} [io]
 * @returns {number}
 */
function runCli(argv, io = {}) {
    const stdout = io.stdout || ((msg) => console.log(msg));
    const stderr = io.stderr || ((msg) => console.error(msg));
    const defaultCwd = io.cwd || process.cwd();

    try {
        const parsed = parseArgs(argv);
        const { command, args, options } = parsed;

        if (options.help || command === "help") {
            stdout(HELP_TEXT);
            return 0;
        }

        if (command === "static") {
            const result = benchmarkStatic({
                base: options.noDiff ? null : options.base,
                head: options.head,
                cwd: options.cwd || defaultCwd,
            });
            stdout(formatStaticReport(result, options.outputFormat));
            return 0;
        }

        if (command === "session") {
            if (args.length === 0) {
                throw new Error("Please provide at least one transcript file path.");
            }
            const sessions = args.map((file) =>
                parseTranscriptFile(file, { format: options.format })
            );
            stdout(formatSessionReport(sessions, options.outputFormat));
            return 0;
        }

        if (command === "compare") {
            if (options.a.length === 0 || options.b.length === 0) {
                throw new Error("Both --a and --b transcript file lists are required.");
            }
            const sessionsA = options.a.map((file) =>
                parseTranscriptFile(file, { format: options.format })
            );
            const sessionsB = options.b.map((file) =>
                parseTranscriptFile(file, { format: options.format })
            );
            const passA = options.passA !== undefined
                ? parsePassInfo(options.passA, sessionsA.length)
                : null;
            const passB = options.passB !== undefined
                ? parsePassInfo(options.passB, sessionsB.length)
                : null;

            const result = compareRuns(sessionsA, sessionsB, {
                labelA: options.labelA || "A",
                labelB: options.labelB || "B",
                passA,
                passB,
            });
            stdout(formatCompareReport(result, options.outputFormat));
            return 0;
        }

        throw new Error(`Unknown command "${command}". Run with --help to see usage.`);
    } catch (err) {
        stderr(`Error: ${err.message}`);
        return 1;
    }
}

if (require.main === module) {
    process.exitCode = runCli(process.argv.slice(2));
}

module.exports = {
    HELP_TEXT,
    parseArgs,
    runCli,
};
