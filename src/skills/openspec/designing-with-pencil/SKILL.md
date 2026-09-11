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

* **Mode A: JSON-Native First & Pencil CLI (STRICTLY PREFERRED)**: If `which pen` returns a path, **you MUST use Mode A**. Works 100% headless in RAM, requires zero GUI, no active editor tab, and zero disk pollution.
  - **Default Workflow (95% of tasks)**: **Direct JSON**. Create new screens and edit existing designs directly as standard JSON files (`version: "2.17"`). It runs in ~1ms, produces zero I/O buffer hangs, and grants full control over design tokens.
  - **Specialized `pen interactive` (Only 2 exceptions)**: Use `pen interactive` strictly when you need backend services: (1) Cloning a live website into vector layers via `browser({ action: "import-to-canvas" })`, or (2) Fetching real Unsplash stock photos via `Generate(nodeId, "stock", query)`.
* **Mode B: Pencil MCP (FALLBACK ONLY)**: Use **ONLY** if `pen` CLI is not installed on the system. Requires an active editor tab open in Antigravity IDE / VS Code.

---

## 2. Mode A: Execution Patterns

> **Critical Rules**: 
> 1. Do NOT use `pen --prompt "..."` because it delegates to external Claude Code and requires AI API keys (`Not logged in` error).
> 2. **JSON-Native by Default**: Whether creating a new design or editing an existing file, generate/modify the `.pen` file directly as JSON. It is 100x faster than booting interactive shells and eliminates all stdin/TTY buffering risks.
> 3. **Interactive Mode Reserved For**: Web cloning (`browser: import-to-canvas`) and stock image fetching (`Generate stock`). Always pipe input all at once via `cp.execSync` when using it.

### Pattern 1: Creating a New Design via JSON-Native (Recommended Default)
Write the complete `.pen` JSON directly from your agent script or file tools:
```bash
node -e '
const fs = require("fs");
fs.mkdirSync(".design", { recursive: true });

const randId = () => Math.random().toString(36).substring(2, 7);

const doc = {
  version: "2.17",
  variables: {
    "color/bg": { type: "color", value: "#0B0F19" },
    "color/primary": { type: "color", value: "#FFFFFF" }
  },
  children: [
    {
      type: "frame",
      id: randId(),
      name: "App Canvas",
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
      fill: "#0B0F19",
      layout: "vertical",
      padding: 32,
      gap: 24,
      children: [
        {
          type: "text",
          id: randId(),
          name: "Title",
          fontFamily: "Inter",
          fontSize: 32,
          fontWeight: "bold",
          fill: "#FFFFFF",
          content: "Design Title"
        }
      ]
    }
  ]
};

fs.writeFileSync(".design/screen.pen", JSON.stringify(doc, null, 2));
console.log("Created .design/screen.pen directly via JSON");
'
```

### Pattern 2: When to Use `pen interactive` (Web Clone & Stock Fetching Only)
Use `pen interactive` ONLY when delegating to backend services:
```bash
# Example A: Clone a real web page to editable canvas layers
node -e '
const cp = require("child_process");
const script = `
browser({ action: "load-page", url: "https://example.com" })
browser({ action: "import-to-canvas", target: "full-page" })
save()
exit()
`;
cp.execSync("pen interactive -o .design/imported.pen", { input: script, stdio: ["pipe", "inherit", "inherit"] });
'

# Example B: Generate dynamic stock photo from Unsplash
node -e '
const cp = require("child_process");
const script = `
Generate("targetCardId", "stock", "cinematic desert dunes")
save()
exit()
`;
cp.execSync("pen interactive -i .design/screen.pen -o .design/screen.pen", { input: script, stdio: ["pipe", "inherit", "inherit"] });
'
```

### Pattern 3: Fast Editing Existing Files via JSON
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

### Pattern 4: Pre-flight Style & Token Inspection (Reading Existing Files)
Before modifying an existing design, inspect established design tokens and style recipes:
```bash
node -e '
const fs = require("fs");
const doc = JSON.parse(fs.readFileSync(".design/screen.pen", "utf8"));

// 1. Check root design tokens if present
if (doc.variables) console.log("Root Variables:", JSON.stringify(doc.variables, null, 2));

// 2. Scan unique glass / card styles across nodes
const styles = [];
function scan(n) {
  if (n.fill || n.stroke || n.effect) {
    styles.push({ id: n.id, name: n.name, fill: n.fill, stroke: n.stroke, effect: n.effect, radius: n.cornerRadius });
  }
  if (n.children) n.children.forEach(scan);
}
scan(doc);
console.log("Sample existing styles:", JSON.stringify(styles.slice(0, 5), null, 2));
'
```

### Pattern 5: Best Practices When Creating New Designs
To make files effortless to inspect, maintain, and extend:
1. **Declare Root `variables`**: Store primary palette and radius tokens at the document root:
   ```json
   "variables": {
     "glass/surface": { "type": "color", "value": "#ffffff14" },
     "glass/stroke": { "type": "color", "value": "#ffffff4d" },
     "radius/pill": { "type": "number", "value": 22 }
   }
   ```
2. **Flag Reusable Components**: Mark primary interactive components (buttons, cards, navigation items) with `"reusable": true`. Future agents can find them instantly with `Get(n => n.reusable)`.
3. **Semantic Naming**: Include state or role in node names (e.g. `"Nav Item - Home [Focused]"`, `"Floating Glass Nav Dock"`).

### Pattern 6: Visual Export & Self-Verification
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

5. **Effects & Visual Style Recipes**:
   * **Liquid Glass / Frosted Glass Material**:
     Combines translucent gradient, specular rim stroke, background blur, and dual shadows (inner specular edge + outer diffused drop shadow):
     ```javascript
     fill: {
       type: "gradient",
       gradientType: "linear",
       rotation: 180,
       colors: [
         { color: "#ffffff2b", position: 0 },
         { color: "#0a11224d", position: 0.5 },
         { color: "#ffffff14", position: 1 }
       ]
     },
     stroke: "#ffffff4d",
     strokeWidth: 1.5,
     cornerRadius: 36, // generous curve for organic glass feeling
     effect: [
       { type: "background_blur", radius: 50 },
       { type: "shadow", shadowType: "inner", color: "#ffffff38", offset: { x: 0, y: 1.5 }, blur: 2 },
       { type: "shadow", shadowType: "outer", color: "#0000008c", offset: { x: 0, y: 20 }, blur: 44 }
     ]
     ```
   * **Active / 10-Foot Focus State (Apple TV / visionOS)**:
     Capsule pill with glowing bloom shadow and high contrast:
     ```javascript
     cornerRadius: 22, // full capsule for height 44
     fill: {
       type: "gradient",
       gradientType: "linear",
       rotation: 180,
       colors: [{ color: "#ffffff47", position: 0 }, { color: "#ffffff26", position: 1 }]
     },
     stroke: "#ffffff8c",
     strokeWidth: 1.5,
     effect: {
       type: "shadow",
       shadowType: "outer",
       color: "#38bdf84d", // cyan/amber focus bloom
       offset: { x: 0, y: 4 },
       blur: 16
     }
     ```
   * **Ambient Ambilight / Glows**:
     Always apply Gaussian blur to avoid harsh geometric edges:
     `effect: [{ type: "blur", radius: 90 }]`

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
