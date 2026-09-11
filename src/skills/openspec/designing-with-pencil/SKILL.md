---
name: designing-with-pencil
description: Use when creating, viewing, or modifying .pen design files and UI mockups via Pencil CLI (preferred) or Pencil MCP
---

# Designing with Pencil

Comprehensive guide for creating, inspecting, and modifying `.pen` vector design files for Web and Mobile interfaces without trial-and-error.

---

## 1. Runtime Selection (Dual-Mode: CLI First)

**MANDATORY CHECK**: You MUST always check CLI availability first before touching any `.pen` files:

```bash
which pen 2>/dev/null
```

* **Mode A: Pencil CLI & JSON Native (STRICTLY PREFERRED)**: If `which pen` returns a path, **you MUST use Mode A**. Works 100% headless in RAM, requires zero GUI, no active editor tab, and zero disk pollution.
  - **New canvases / complex layout generation**: Use `pen interactive` (with helper functions like `FindEmptySpace`, `Insert`).
  - **Editing existing designs (colors, fills, effects, hierarchy)**: `.pen` files are **100% standard JSON** (`version: "2.17"`). Modifying JSON directly via Node.js script is instantaneous, deterministic, and avoids TTY stdin buffering issues.
* **Mode B: Pencil MCP (FALLBACK ONLY)**: Use **ONLY** if `pen` CLI is not installed on the system. Requires an active editor tab open in Antigravity IDE / VS Code.

---

## 2. Mode A: Execution Patterns

> **Critical Notes**: 
> 1. Do NOT use `pen --prompt "..."` because it delegates to external Claude Code and requires AI API keys (`Not logged in` error).
> 2. **Direct JSON Editing for Existing Files**: When modifying styles, fills, glass effects, borders, or text on existing screens, edit the `.pen` file directly as JSON using Node.js. It is 10x faster and eliminates stdin hanging in non-TTY environments.
> 3. **Piping to `pen interactive`**: When using `pen interactive`, pass all commands at once via piped stdin (e.g. `echo "..." | pen interactive ...`) rather than keeping an unbuffered stream open.

### Pattern 1: Creating a New Canvas via `pen interactive`
```bash
node -e '
const cp = require("child_process");
const fs = require("fs");

const designCode = `
const pos = FindEmptySpace({ width: 1440, height: 900, padding: 40 });
const screen = Insert(document, {
  type: "frame", name: "App Canvas", x: pos.x, y: pos.y, width: 1440, height: 900,
  fill: "#0B0F19", layout: "vertical", padding: 32, gap: 24, placeholder: true
});

Insert(screen, {
  type: "text", name: "Title", fontFamily: "Inter", fontSize: 32, fontWeight: "bold",
  fill: "#FFFFFF", content: "Design Title"
});

Update(screen, { placeholder: false });
`;

fs.mkdirSync(".design", { recursive: true });

// Pipe entire session in one flush to avoid stdin hang
const script = `execute({ input: ${JSON.stringify(designCode)} })\nsave()\nexit()\n`;
cp.execSync("pen interactive -o .design/screen.pen", { input: script, stdio: ["pipe", "inherit", "inherit"] });
'
```

### Pattern 2: Fast Editing Existing Files via JSON
Because `.pen` is standard JSON, modifying node properties directly is the fastest, most reliable method:
```bash
node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(".design/screen.pen", "utf8"));

function findNode(node, id) {
  if (node.id === id) return node;
  if (node.children) {
    for (const c of node.children) {
      const res = findNode(c, id);
      if (res) return res;
    }
  }
  return null;
}

// Modify node properties directly (fills, corner radius, stroke, effects)
const target = findNode(data, "targetNodeId");
if (target) {
  target.fill = "#ffffff14";
  target.cornerRadius = 24;
}

fs.writeFileSync(".design/screen.pen", JSON.stringify(data, null, 2));
console.log("Updated design JSON successfully");
'
```

### Pattern 3: Visual Export & Self-Verification
To render and inspect the visual output:
```bash
pen --in .design/screen.pen --export .design/screen.png
```

> **Export Behavior & Timing**:
> - `pen --in ... --export ...` internally boots the Pencil editor runtime (`[INFO] Agent: claude, Model: claude-opus-5, Initializing editor...`), taking ~5–8 seconds to render and exit with code 0.
> - When running via `run_command`, set `WaitMsBeforeAsync: 8000` (or wait for the command task to complete) before attempting to read the exported PNG.
> - **Visual Self-Verification**: Always call `view_file` on the exported `.png` to evaluate contrast, visual balance, blur realism, and focus states.

---

## 3. Mode B: Pencil MCP Execution (FALLBACK ONLY)

> Use **ONLY** when `which pen` returns nothing (CLI is not installed).

```bash
mkdir -p .design
touch .design/screen.pen
"/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide" .design/screen.pen
```
Call MCP tool `execute` (or connect via stdio JSON-RPC if server is disabled in `mcp_config.json`):
```javascript
execute({
  filePath: ".design/screen.pen",
  input: `
    const pos = FindEmptySpace({ width: 1440, height: 900, padding: 40 });
    const screen = Insert(document, { type: "frame", x: pos.x, y: pos.y, width: 1440, height: 900, fill: "#0B0F19", placeholder: true });
    Update(screen, { placeholder: false });
  `
});
```

---

## 4. Complete DSL & Schema Reference

### Essential Operations

| Function | Purpose | Example |
| :--- | :--- | :--- |
| `FindEmptySpace({width, height, padding, direction})` | Finds vacant canvas space | `const pos = FindEmptySpace({ width: 1440, height: 900, padding: 40 });` |
| `Insert(parent, nodeData)` | Inserts a new node | `const card = Insert(parent, { type: "frame", layout: "vertical" });` |
| `Update(nodeId, updateData)` | Modifies node properties | `Update(card, { placeholder: false });` |
| `Delete(nodeId)` | Removes a node | `Delete(oldNodeId);` |
| `Generate(nodeId, "stock", query)` | Fetches real Unsplash photo | `Generate(posterFrame, "stock", "desert dune cinematic");` |

### Node Properties & Layout Rules

1. **Root Screens & Placeholder Pattern**:
   * Root frames **must** be created with `placeholder: true`, and unset via `Update(screenId, { placeholder: false })` after inserting child elements.

2. **Frames & Flexbox Layout**:
   * Direction: `layout: "horizontal"` or `"vertical"`.
   * Sizing: Use `width: "fill_container"`, `height: "fill_container"`, or numeric pixels.
   * Alignment: `alignItems` and `justifyContent` accept `"start"`, `"center"`, `"end"`, `"space-between"` (do **NOT** use `"baseline"`).
   * Absolute Positioning: To place floating glows or badges inside a flex frame, use `layoutPosition: "absolute"`, `x: ..., y: ...`.

3. **Text Nodes**:
   * Text nodes **must** declare `fill: "#HEX"`, otherwise they are invisible.
   * Multi-line text wrapping: `textGrowth: "fixed-width"` with `width: "fill_container"`.

4. **Icons (Exact Schema)**:
   * Do **NOT** use `iconFont`, `iconName`, or `fontSize`.
   * Use Lucide icons:
     ```javascript
     Insert(parent, {
       type: "icon",
       library: "lucide",
       icon: "play",      // Valid Lucide name (e.g., 'house' not 'home', 'history' not 'clock')
       width: 18,
       height: 18,
       fill: "#FFFFFF"
     });
     ```

5. **Effects (Blur & Drop Shadows)**:
   * Ambient light / Ambilight: Always apply Gaussian blur to avoid harsh geometric edges:
     `effect: [{ type: "blur", radius: 90 }]`
   * Drop shadow / Glows:
     `effect: [{ type: "shadow", enabled: true, shadowType: "outer", offset: { x: 0, y: 16 }, blur: 40, color: "rgba(245, 158, 11, 0.65)" }]`

---

## 5. Troubleshooting & Common Errors

| Error | Root Cause | Solution |
| :--- | :--- | :--- |
| `Failed to access file "undefined"` | MCP tab is inactive in IDE | Switch to Mode A (Pencil CLI) or re-run `antigravity-ide <file.pen>` |
| Interactive shell hangs on stdin | Non-TTY child process buffers stdin stream | Use direct JSON script modification (Pattern 2) or single-flush `cp.execSync` with `input` |
| Export times out / takes 5–8s | `pen --export` boots internal editor agent session | Use `WaitMsBeforeAsync: 8000+` and wait for code 0 before reading PNG |
| `Invalid properties: /iconFont, /fontSize` | Using invalid Icon properties | Use `library: "lucide"`, `icon: "name"`, `width`, `height`, `fill` |
| Icon not showing | Outdated icon name in Lucide | Use standard Lucide names (e.g., `house` instead of `home`, `history` instead of `clock`) |
| Geometric circles look harsh | Missing blur on background glows | Add `effect: [{ type: "blur", radius: 90 }]` to glowing ellipses |

---

## 6. On-Demand Debugging & Unknown Schema Lookup

> **CRITICAL GUARDRAIL FOR AGENTS**:
> * **DO NOT** execute the commands below during standard design work. The cheatsheet in Section 4 is completely self-contained for 99% of UI tasks.
> * **ONLY** run these lookup commands if:
>   1. An `execute` call throws an unexpected `Invalid properties` or syntax error that cannot be resolved.
>   2. The user specifically asks for advanced, unlisted vector node types (e.g. `mesh_gradient`, `polygon`, `script`).

| When to Run | Lookup Command (Runs in RAM, zero files) |
| :--- | :--- |
| Inspect complete TypeScript types | `echo 'read_skill({ path: "pen-schema.md" })' \| pen interactive -o /tmp/ref.pen` |
| Deep dive into functions / edge cases | `echo 'read_skill({ path: "execute.md" })' \| pen interactive -o /tmp/ref.pen` |
| Query pre-built styles and palettes | `echo 'get_style()' \| pen interactive -o /tmp/ref.pen` |
