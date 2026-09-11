---
name: designing-with-pencil
description: Use when creating, viewing, or modifying .pen design files and UI mockups via Pencil CLI (preferred) or Pencil MCP
---

# Designing with Pencil

Comprehensive guide for creating, inspecting, and modifying `.pen` vector design files for Web and Mobile interfaces without trial-and-error.

---

## 1. Runtime Selection (Dual-Mode)

Always check CLI availability first:

```bash
which pen 2>/dev/null
```

* **Mode A: Pencil CLI (Preferred)**: Run if `pen` is found. Works 100% headless, zero GUI required, no external AI API key needed, zero disk pollution.
* **Mode B: Pencil MCP (Fallback)**: Use only if `pen` is not installed. Requires an active editor tab open in Antigravity IDE / VS Code.

---

## 2. Mode A: Pencil CLI Execution (Zero-File Inline Pattern)

> **Critical Note**: Do NOT use `pen --prompt "..."` because it delegates to Claude Code and requires extra AI API keys (`Not logged in` error). Always use **`pen interactive`** via the Python one-liner below to run directly on the local vector engine in RAM.

```bash
# Execute design snippet directly in RAM (handles multi-line JS & escaping safely)
python3 -c "
import subprocess, json

design_code = '''
const pos = FindEmptySpace({ width: 1440, height: 900, padding: 40 });
const screen = Insert(document, {
  type: 'frame', name: 'App Canvas', x: pos.x, y: pos.y, width: 1440, height: 900,
  fill: '#0B0F19', layout: 'vertical', padding: 32, gap: 24, placeholder: true
});

Insert(screen, {
  type: 'text', name: 'Title', fontFamily: 'Inter', fontSize: 32, fontWeight: 'bold',
  fill: '#FFFFFF', content: 'Design Title'
});

Update(screen, { placeholder: false });
'''

# Ensure .design directory exists
import os; os.makedirs('.design', exist_ok=True)

p = subprocess.Popen(['pen', 'interactive', '-o', '.design/screen.pen'], stdin=subprocess.PIPE, text=True)
p.communicate('execute({ input: ' + json.dumps(design_code) + ' })\\nsave()\\nexit()\\n')
"

# Auto-export PNG and visually inspect
pen --in .design/screen.pen --export .design/screen.png
```

> **Visual Self-Verification**: Always call `view_file` on the exported `.png` to evaluate contrast, visual balance, blur realism, and focus states.

### Editing / Appending to Existing Files:
To edit or add screens side-by-side without recreating from scratch:
```bash
python3 -c "
import subprocess, json
edit_code = '''
// Add adjacent screen to the right
const pos = FindEmptySpace({ width: 1440, height: 900, padding: 80, direction: 'right' });
const detailScreen = Insert(document, { type: 'frame', name: 'Detail View', x: pos.x, y: pos.y, width: 1440, height: 900, fill: '#0F172A', placeholder: true });
Update(detailScreen, { placeholder: false });
'''
p = subprocess.Popen(['pen', 'interactive', '-i', '.design/screen.pen', '-o', '.design/screen.pen'], stdin=subprocess.PIPE, text=True)
p.communicate('execute({ input: ' + json.dumps(edit_code) + ' })\\nsave()\\nexit()\\n')
"
```

---

## 3. Mode B: Pencil MCP Execution (Fallback)

```bash
mkdir -p .design
touch .design/screen.pen
"/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide" .design/screen.pen
```
Call MCP tool `execute`:
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
