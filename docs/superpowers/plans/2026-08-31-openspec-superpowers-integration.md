# OpenSpec (Fission-AI) & Superpowers Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate OpenSpec's living spec lifecycle (`changes/`, `archive/`, delta specs, `openspec-explore`) into `open-power` while retaining Superpowers' TDD, subagents, and verification discipline across Cline, Antigravity, Claude Code, and Codex.

**Architecture:** Extend `.opow/` workspace scaffolding to support Living Specs (`.opow/specs/`), Active Changes (`.opow/changes/<id>/`), and History (`.opow/archive/`). Introduce `openspec-explore` skill and 6 unified slash commands (`/explore`, `/spec`, `/plan`, `/implement`, `/verify`, `/archive`) mapped to platform wrappers.

**Tech Stack:** Node.js (CommonJS, `node:test`, `node:assert/strict`, `node:fs`), Markdown Specification standards.

**Spec:** [`docs/superpowers/specs/2026-08-31-openspec-superpowers-integration-design.md`](file:///Volumes/KIOXIA/Projects/open-power/docs/superpowers/specs/2026-08-31-openspec-superpowers-integration-design.md)

## Global Constraints

- Node >= 16 compatibility, no external npm runtime dependencies (pure Node.js built-ins).
- Preserve existing custom user skills and specs using manifest tracking (`superpowers-manifest.json`).
- Ensure all 4 platforms (Cline, Antigravity, Claude Code, Codex) receive identical skills and workflow mappings.
- All automated unit tests must pass using `npm test` (`node --test`).

---

### Task 1: OpenSpec Templates Suite

**Files:**
- Create: `src/templates/openspec/templates/proposal.md`
- Create: `src/templates/openspec/templates/design.md`
- Create: `src/templates/openspec/templates/tasks.md`
- Create: `src/templates/openspec/templates/delta.spec.md`
- Create: `src/templates/openspec/templates/living.spec.md`
- Test: `test/templates/openspec-templates.test.js`

**Interfaces:**
- Consumes: None
- Produces: Standardized markdown templates for change proposals, designs, tasks, delta specs, and living specs used by `/spec`, `/plan`, and `syncOpenSpec`.

- [ ] **Step 1: Write the failing test**

```javascript
// test/templates/openspec-templates.test.js
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("templates / openspec", () => {
    const templatesDir = path.join(__dirname, "../../src/templates/openspec/templates");

    it("contains all required OpenSpec template files", () => {
        const requiredFiles = [
            "proposal.md",
            "design.md",
            "tasks.md",
            "delta.spec.md",
            "living.spec.md"
        ];
        for (const file of requiredFiles) {
            const filePath = path.join(templatesDir, file);
            assert.ok(fs.existsSync(filePath), `Missing template: ${file}`);
            const content = fs.readFileSync(filePath, "utf8");
            assert.ok(content.length > 50, `Template ${file} is too short`);
        }
    });

    it("delta.spec.md contains ADDED, MODIFIED, and REMOVED sections", () => {
        const content = fs.readFileSync(path.join(templatesDir, "delta.spec.md"), "utf8");
        assert.ok(content.includes("### ADDED Requirements"));
        assert.ok(content.includes("### MODIFIED Requirements"));
        assert.ok(content.includes("### REMOVED Requirements"));
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/templates/openspec-templates.test.js`
Expected: FAIL with missing template files.

- [ ] **Step 3: Write minimal implementation**

Create the 5 template files with standard OpenSpec formatting in `src/templates/openspec/templates/`:
- `proposal.md`: Why, Problem, Scope, Alternatives.
- `design.md`: Context, Architecture Decisions, Component Breakdown, Risks.
- `tasks.md`: Trackable checklist with `- [ ]` format grouped by phase.
- `delta.spec.md`: ADDED, MODIFIED, REMOVED requirements with *Given-When-Then* scenarios.
- `living.spec.md`: Domain overview, Current capabilities, Scenarios.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/templates/openspec-templates.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/templates/openspec/templates/ test/templates/openspec-templates.test.js
git commit -m "feat(templates): add OpenSpec templates suite"
```

---

### Task 2: Skills Suite (`openspec-explore` & `spec-driven-development`)

**Files:**
- Create: `src/skills/openspec-explore/SKILL.md`
- Modify: `src/skills/spec-driven-development/SKILL.md`
- Test: `test/skills/skills-content.test.js`

**Interfaces:**
- Consumes: Template structure from Task 1
- Produces: `openspec-explore` skill and updated `spec-driven-development` skill instructing agents on Delta Specs and the Propose ➔ Apply ➔ Archive lifecycle.

- [ ] **Step 1: Write the failing test**

```javascript
// test/skills/skills-content.test.js
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("skills / content validation", () => {
    it("validates openspec-explore skill exists and has correct metadata", () => {
        const skillPath = path.join(__dirname, "../../src/skills/openspec-explore/SKILL.md");
        assert.ok(fs.existsSync(skillPath));
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes("name: openspec-explore"));
        assert.ok(content.includes("codebase"));
        assert.ok(content.includes("Delta Spec"));
    });

    it("validates spec-driven-development skill includes lifecycle & delta specs", () => {
        const skillPath = path.join(__dirname, "../../src/skills/spec-driven-development/SKILL.md");
        const content = fs.readFileSync(skillPath, "utf8");
        assert.ok(content.includes(".opow/changes/"));
        assert.ok(content.includes(".opow/archive/"));
        assert.ok(content.includes("ADDED"));
        assert.ok(content.includes("MODIFIED"));
        assert.ok(content.includes("REMOVED"));
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/skills/skills-content.test.js`
Expected: FAIL (missing `openspec-explore/SKILL.md`).

- [ ] **Step 3: Write minimal implementation**

- Create `src/skills/openspec-explore/SKILL.md`: Guides agents in codebase auditing, dependency mapping, detecting breaking changes, and preparing Delta Spec inputs.
- Update `src/skills/spec-driven-development/SKILL.md`: Document `.opow/specs/`, `.opow/changes/`, `.opow/archive/`, Delta Spec rules, and integration with `brainstorming`, `writing-plans`, TDD, and `/archive`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/skills/skills-content.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/skills/ test/skills/skills-content.test.js
git commit -m "feat(skills): add openspec-explore and update spec-driven-development"
```

---

### Task 3: Slash Commands & Workflows Suite

**Files:**
- Create: `src/templates/workflows/explore.md`
- Create: `src/templates/workflows/archive.md`
- Modify: `src/templates/workflows/spec.md`
- Modify: `src/templates/workflows/plan.md`
- Modify: `src/templates/workflows/implement.md`
- Modify: `src/templates/workflows/verify.md`
- Test: `test/workflows/workflows-content.test.js`

**Interfaces:**
- Consumes: Skills from Task 2 and Templates from Task 1
- Produces: 6 standardized workflows (`explore.md`, `spec.md`, `plan.md`, `implement.md`, `verify.md`, `archive.md`) distributed to all AI assistants.

- [ ] **Step 1: Write the failing test**

```javascript
// test/workflows/workflows-content.test.js
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("workflows / slash commands", () => {
    const workflowsDir = path.join(__dirname, "../../src/templates/workflows");

    it("contains all 6 standard workflows", () => {
        const requiredWorkflows = [
            "explore.md",
            "spec.md",
            "plan.md",
            "implement.md",
            "verify.md",
            "archive.md"
        ];
        for (const wf of requiredWorkflows) {
            const wfPath = path.join(workflowsDir, wf);
            assert.ok(fs.existsSync(wfPath), `Missing workflow: ${wf}`);
        }
    });

    it("archive workflow describes merging delta specs to living specs", () => {
        const content = fs.readFileSync(path.join(workflowsDir, "archive.md"), "utf8");
        assert.ok(content.includes(".opow/archive/"));
        assert.ok(content.includes(".opow/specs/"));
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/workflows/workflows-content.test.js`
Expected: FAIL (missing `explore.md` and `archive.md`).

- [ ] **Step 3: Write minimal implementation**

- Create `src/templates/workflows/explore.md`: Triggers `openspec-explore`.
- Create `src/templates/workflows/archive.md`: Verifies AC & tests are 100% green, merges delta specs into `.opow/specs/`, moves `.opow/changes/<id>/` to `.opow/archive/<id>/`.
- Update `src/templates/workflows/spec.md`: Instructs creating `.opow/changes/<change-name>/` with proposal, design, tasks, and delta specs.
- Update `src/templates/workflows/plan.md`: Aligns `.opow/plans/<name>.plan.md` with `tasks.md`.
- Update `src/templates/workflows/implement.md`: TDD cycle ticking off `tasks.md`.
- Update `src/templates/workflows/verify.md`: Full verification gate before archive.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/workflows/workflows-content.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/templates/workflows/ test/workflows/workflows-content.test.js
git commit -m "feat(workflows): add explore, archive and update spec, plan, implement, verify workflows"
```

---

### Task 4: Scaffolding & Sync Engine Update

**Files:**
- Modify: `src/lib/sync.js`
- Modify: `src/commands/install.js`
- Test: `test/commands/install.test.js`
- Test: `test/lib/sync.test.js`

**Interfaces:**
- Consumes: Templates and workflows from Tasks 1-3
- Produces: `syncOpenSpec()` initializing `.opow/specs/`, `.opow/changes/`, `.opow/archive/`, `.opow/templates/`.

- [ ] **Step 1: Write the failing test**

```javascript
// Add test in test/commands/install.test.js verifying .opow/changes and .opow/archive creation
assert.ok(fs.existsSync(path.join(tempDir, ".opow", "changes")));
assert.ok(fs.existsSync(path.join(tempDir, ".opow", "archive")));
assert.ok(fs.existsSync(path.join(tempDir, ".opow", "templates")));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/commands/install.test.js`
Expected: FAIL (`.opow/changes` and `.opow/archive` not found).

- [ ] **Step 3: Write minimal implementation**

- Update `syncOpenSpec()` in `src/lib/sync.js` to create:
  - `.opow/specs/`
  - `.opow/changes/`
  - `.opow/archive/`
  - `.opow/templates/` (copied from `src/templates/openspec/templates/`)
- Update `install.js` logging to show status of Changes, Archive, and Templates directories.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/commands/install.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/sync.js src/commands/install.js test/commands/install.test.js
git commit -m "feat(sync): scaffold living specs, changes, archive, and templates in .opow"
```

---

### Task 5: Platform Wrappers Update (`using-superpowers`)

**Files:**
- Modify: `src/wrapper/antigravity/using-superpowers/SKILL.md`
- Modify: `src/wrapper/cline/using-superpowers/SKILL.md`
- Modify: `src/wrapper/claude/using-superpowers/SKILL.md`
- Modify: `src/wrapper/codex/using-superpowers/SKILL.md`
- Test: `test/wrapper/wrapper-skills.test.js`

**Interfaces:**
- Consumes: Workflow and skill names from Tasks 2-3
- Produces: Platform-specific wrappers aware of `openspec-explore`, `.opow/changes/`, and `/archive`.

- [ ] **Step 1: Write the failing test**

```javascript
// test/wrapper/wrapper-skills.test.js
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("wrapper / platform skills", () => {
    const platforms = ["antigravity", "cline", "claude", "codex"];

    for (const p of platforms) {
        it(`wrapper for ${p} mentions openspec-explore and .opow/changes`, () => {
            const skillFile = path.join(__dirname, `../../src/wrapper/${p}/using-superpowers/SKILL.md`);
            assert.ok(fs.existsSync(skillFile));
            const content = fs.readFileSync(skillFile, "utf8");
            assert.ok(content.includes("openspec-explore"));
            assert.ok(content.includes(".opow/changes/"));
        });
    }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/wrapper/wrapper-skills.test.js`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Update `SKILL.md` in all 4 wrapper directories (`src/wrapper/antigravity/`, `src/wrapper/cline/`, `src/wrapper/claude/`, `src/wrapper/codex/`) to include `openspec-explore` in the priority list and reference `.opow/changes/`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/wrapper/wrapper-skills.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wrapper/ test/wrapper/wrapper-skills.test.js
git commit -m "feat(wrapper): update platform wrappers with openspec-explore and changes directory"
```

---

### Task 6: Documentation & Full Test Suite Verification

**Files:**
- Modify: `README.md`
- Test: `npm test`

**Interfaces:**
- Consumes: All completed tasks
- Produces: Updated documentation and 100% passing test suite across all modules.

- [ ] **Step 1: Update README.md**
Update `README.md` with:
- The 6-step lifecycle diagram and commands (`/explore`, `/spec`, `/plan`, `/implement`, `/verify`, `/archive`).
- The new `.opow/` structure (`specs/`, `changes/`, `archive/`, `templates/`).
- Delta spec format explanation (`ADDED`, `MODIFIED`, `REMOVED`).

- [ ] **Step 2: Run full test suite**
Run: `npm test`
Expected: All tests pass with zero failures.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README with OpenSpec lifecycle and slash commands"
```
