# AGENTS.md

## Purpose and Scope

This repository exists to demonstrate how Mermaid diagrams can be rendered as SVGs that are meaningfully accessible, not merely technically valid. Mermaid’s native accessibility support is limited and incomplete. This project intentionally post-processes Mermaid-generated SVGs to preserve and enhance semantics, especially for flowcharts.

This is not a general-purpose Mermaid renderer, not a Mermaid fork, and not a replacement for Mermaid’s own accessibility work. It is an opinionated, educational, and practical tool for producing accessible SVG output from Mermaid source.

The site runs entirely in the browser and is designed to be published via GitHub Pages.

## Non-Goals (Do Not Add These)

Do not add:
- Server-side rendering
- Node-based build pipelines
- GitHub Actions required to run the site
- Backend services, APIs, or databases
- Full SVG-to-Mermaid round-tripping
- Automatic inference of complex semantics without user confirmation
- Diagram editing via drag-and-drop or geometry manipulation

If a feature requires a server, a build step, or guessing user intent without confirmation, it is out of scope.

## Core Principles

1. **Mermaid source is the primary artifact**  
   Mermaid text is the authoritative source. SVGs are generated artifacts. When conflicts arise, the Mermaid source wins.

2. **Accessibility over visual convenience**  
   If a visual feature degrades accessibility, accessibility wins. Visual parity matters, but comprehension for assistive technology users matters more.

3. **Explicit is better than implicit**  
   Where semantics are unclear, the interface must ask the user. Silent guessing is not acceptable.

4. **Best-effort by default, excellence by guidance**  
   The tool must produce a usable accessible SVG with no annotations. The tool must also clearly prompt users to improve semantics when it detects ambiguity.

5. **Static-first**  
   Everything must run in a static hosting environment such as GitHub Pages. The app must work offline once loaded.

6. **Teaching tool as much as production tool**  
   The sample library, prompts, and warnings exist to help people learn how accessible diagrams work, not just to produce files.

7. **License compliance**  
   Every JavaScript/HTML file must include the chosen license header.

## Technical Guardrails

- **Zero build step:** All logic must run via ES Modules (ESM) and CDNs. Do not introduce Webpack, Vite, or end-user `npm install` requirements for site functionality.
- **A11y first:** The UI must be keyboard-navigable and screen-reader friendly, using semantic HTML5 elements.
- **Mermaid standards:** Follow Ashley Sheridan's accessible flowchart patterns. Preserve `xmlns` namespaces for standalone SVG usage.
- **Semantic integrity:** Don't remove meaningful semantics; defer to the normative references when deciding whether to strip or rewrite structure.
- **Preserve metadata:** Metadata required by normative accessibility specifications must be preserved exactly; defer to automated helpers only when they satisfy those requirements.

## Normative References

- **Léonie Watson's "Accessible SVG flowcharts"** (https://tink.uk/accessible-svg-flowcharts/) — normative specification for flowchart accessibility, including list-based semantics, node structure, and link handling. Also see companion articles on [accessible SVG line graphs](https://tink.uk/accessible-svg-line-graphs/) and [accessible SVG tables](https://tink.uk/accessible-svg-tables/).
- **Carie Fisher's "Accessible SVGs: Perfect Patterns For Screen Reader Users"** (https://cariefisher.com/a11y-svg-updated/) — normative specification for SVG accessibility patterns. This project implements **Pattern 11** (`<svg>` + `role="img"` + `<title>` + `<desc>` + `aria-labelledby="[ID]"`) as the baseline for complex diagrams, with fallback to Pattern 5 or Pattern 8 for simpler cases.
- **MERMAID_DIAGRAM_TYPES.md** — Comprehensive guide to all 23 MermaidJS diagram types, organized by purpose, complexity, and narrative generation readiness. Includes implementation strategy for new narrative generators and common syntax patterns across all diagram types.
- **MERMAID_DIAGRAM_TYPES.json** — Machine-readable reference documenting syntax details, primary elements, narrative support status (implemented: 5, planned: 5, future: 13), and organization schemes for all 23 diagram types.
- **MERMAID_ACCESSIBILITY_BEST_PRACTICES.md** — (to be created) normative accessibility specification for authoring, annotation, linting, and the "Generate prompt to improve this diagram" workflow.
- **MERMAID_TRANSFORMATION_BEST_PRACTICES.md** — (to be created) normative transformation specification governing post-processing rules, semantic preservation, and verification checklists.

All documents supply authoritative requirements. Treat them as source-of-truth for any feature, regression test, or AI-assist prompt. The future "Generate prompt to improve this diagram" flow MUST quote the relevant clauses from these references when proposing changes.

## Accessibility Model

### Diagram-Level Requirements

Every diagram must have:
- A title
- A description

These are mandatory. If missing, export is blocked and the UI must prompt the user to supply them. Titles and descriptions are injected into the Mermaid source using Mermaid's `accTitle` and `accDescr` support.

**SVG root requirements (Carie Fisher Pattern 11):**
- `role="img"` (required for consistent screen reader support)
- `<title>` element with unique ID
- `<desc>` element with unique ID
- `aria-labelledby` referencing both title and description IDs (more reliable than `aria-describedby` across screen readers)

**Pattern rationale:** Pattern 11 is Carie Fisher's "best-in-show" for complex images, tested across multiple screen reader/browser combinations. While it may repeat content in some configurations, it never ignores accessibility elements.

### Diagram Type Support

**Currently Implemented (5 types):**
- Flowchart: Follows Léonie Watson's "Accessible SVG flowcharts" patterns with semantic list structure
- Gantt Chart: Narrative describes project phases, tasks, dates, and status tags
- User Journey: Narrative tracks journey steps and satisfaction scores (1-5) mapped to emotional indicators
- Pie Chart: Narrative calculates and describes proportional breakdown and percentages
- Class Diagram: Narrative describes classes, methods, and relationships

**Ready for Implementation (5 types):**
- Sequence Diagram: Participants, message types, control structures (loop, alt, par, critical)
- State Diagram: States, transitions, composite/concurrent states, special states (choice, fork, join)
- Entity Relationship: Entities, relationships, cardinality notation
- Git Graph: Commits, branches, merges, cherry-picks as timeline
- C4 Model: Context, Container, Component, Code levels with descriptions

**Future diagram type support:**
- Line graphs: Follow Léonie Watson's ["Accessible SVG line graphs"](https://tink.uk/accessible-svg-line-graphs/) patterns
- Tables/matrices: Follow Léonie Watson's ["Accessible SVG tables"](https://tink.uk/accessible-svg-tables/) patterns
- Remaining 8 types (Quadrant, Mind Map, Sankey, Timeline, Architecture, Radar, Treemap, Requirement, Packet, Kanban, ZenUML, Block): See [MERMAID_DIAGRAM_TYPES.md](./MERMAID_DIAGRAM_TYPES.md) for analysis and implementation guidance

**Key requirements:**
- A wrapper group with `role="list"`
- Each logical node represented as `role="listitem"`
- Each node has a single accessible name via a `<title>` element
- Decorative shapes and fragmented text are hidden from the accessibility tree
- Arrows and connectors are hidden unless converted into meaningful navigation
- Choice links must have unique, contextual names where possible

This repository treats Ashley Sheridan’s article as normative guidance for flowcharts.

### Handling Uncertainty

Mermaid output frequently lacks enough information to infer:
- Question vs statement nodes
- Decision semantics
- Meaningful link labels

The tool must:
- Apply simple heuristics first
- Detect when confidence is low
- Prompt the user with direct questions
- Store answers as Mermaid comments so they persist

User prompts are a feature, not a failure.

### Annotation Strategy

Accessibility annotations are stored in Mermaid comments so Mermaid rendering is unaffected.

**Example:**
```mermaid
%%a11y: title="Example flow"
%%a11y: desc="Demonstrates decision logic"
%%a11y-node A type=question
%%a11y-edge A->B ariaLabel="Yes, continue"
```

**Rules:**
- Annotations may be auto-generated by the UI
- Annotations may be edited by users
- Annotations must never break Mermaid rendering
- Removing annotations must not break baseline accessibility

### Two-Way Editing Rules

Round-tripping is limited by design.

**Allowed:**
- Editing node and edge text through the UI
- Synchronizing those text changes back into Mermaid source

**Not allowed:**
- Inferring structure from SVG geometry
- Writing layout or styling changes back to Mermaid
- Treating SVG as a primary source of truth

## Contrast and Color Rules

Contrast requirements are enforced, not advisory.

**Text:**
- WCAG 2.x contrast ratio minimum 4.5:1
- APCA values must be displayed for reference
- APCA checks applied only to text elements to avoid false positives on decorative fills

**Non-text:**
- WCAG 2.x contrast ratio minimum 3:1

If contrast fails, the UI must:
- Identify the failing elements
- Offer adjustments
- Re-run checks live

Dark mode is not optional. Contrast must be validated in both light and dark themes.

**UI/UX Requirements:**
- Split-view preview: Show the SVG on light and dark backgrounds simultaneously to test theme-awareness
- Benchmark-level accessibility: semantic HTML, high-contrast focus rings, and ARIA live regions for status changes

## Sample Library Philosophy

The sample Mermaid files are not demos only. They are:
- Educational examples
- Regression tests for narrative generation
- Documentation of supported patterns and syntax variations
- Test cases for diagram type detection and semantics

Samples must:
- Cover a wide range of Mermaid diagram types (currently 11+ types)
- Include both annotated and unannotated examples
- Include known limitations where applicable
- Be tracked in a manifest file (`examples/manifest.json`) with metadata and narrative support status
- Demonstrate narrative output for types with generated prose

Breaking a sample's accessibility output or narrative generation is a regression. All samples are regression-tested via `npm test`.

## Implementation Constraints

- ES modules only
- Mermaid loaded from a pinned CDN version
- SVG post-processing via `DOMParser` and `XMLSerializer`
- No dependency that strips accessibility attributes
- `LocalStorage` for persistence only

## Test-Driven Architecture

This project follows a test-driven development approach to prevent regressions. All code changes MUST pass the test suite before being committed or deployed.

**Test Suite Structure:**
- `tests/regression.test.js` — Prevents specific bugs that previously broke the application
- `tests/features.test.js` — Validates critical user workflows and Mermaid transformations
- `tests/accessibility.test.js` — Validates semantic output and ARIA compliance
- `tests/ui.test.js` — DOM structure and component validation

**Required Before Every Commit:**
```bash
npm test  # Must pass 100%
```

**Test Coverage Areas:**
1. **Annotation parsing** — Ensures `%%a11y:` comments are correctly parsed and applied
2. **Node type inference** — Validates question vs statement detection
3. **Semantic structure** — Ensures `role="list"` and `role="listitem"` are correctly applied
4. **Title/description** — Validates required metadata enforcement
5. **Contrast calculation** — Verifies WCAG 2.x and APCA calculations
6. **Dual-mode theming** — Validates light/dark mode preservation
7. **Mermaid round-tripping** — Ensures text edits sync correctly
8. **Edge label handling** — Validates contextual link naming

**Development Cycle:**
1. Before making changes, run `npm test` to establish baseline
2. Make changes to core files
3. Run `npm test` after each significant change
4. If tests fail, fix code or update tests (with clear justification)
5. Test manually in browser
6. Run `npm run qa` for full accessibility validation
7. Commit only when all tests pass

**When Tests Fail:**
- Check `tests/README.md` for failure explanations
- Each test documents the specific bug it prevents
- If legitimate change requires test updates, document why in commit message

## QA & Tooling Expectations

**QA Scripts:**
- `npm test` — Runs all test suites (regression, features, accessibility, UI)
- `npm run test:regression` — Quick smoke test for known issues
- `npm run test:features` — Validates feature integrations
- `npm run test:accessibility` — Validates semantic output
- `npm run axe` — WCAG 2.2 Level AA automated accessibility testing
- `npm run pa11y` — Additional accessibility validation
- `npm run qa` — Full suite: tests + linting + accessibility

**Linting Checklist:**
1. **Accessible naming:** `role="img"`, `aria-labelledby`, `<title>`, `<desc>` as per normative spec
2. **Structural integrity:** IDs, namespaces, and semantics preserved during transformation
3. **Theming guarantees:** Dark-mode overrides and forced-colors resilience validated
4. **Contrast verification:** WCAG AA/AAA thresholds for both light and dark backgrounds plus APCA thresholds for text
5. **Post-transformation verification:** Run verification checklist before accepting output

**Manual Verification:**

The following must be manually verifiable with assistive technology:
- Screen reader output for flowcharts (list navigation)
- Keyboard navigation where links are present
- Contrast compliance in light and dark modes
- Stability of annotations across reloads

If a change cannot be verified with assistive technology, it is not complete.

### AI Diagnostics Helpers

Local AI is optional but, when enabled, must include debugging affordances:
- `ai-diagnostics.js` exposes `checkBrowserAIStatus()` for quick console checks (verifies `window.ai`, model readiness, OS/flag requirements).
- `window.A11yMermaidAI` provides `getAvailability()`, `getUsage()`, `diagnostics()`, `enable()`, and `disable()` helpers plus read-only state snapshots.
- When AI UI controls are missing, maintainers must reproduce with Chrome/Edge 128+ and capture console output from the helpers before filing issues.
- Document any AI-related regressions with the helper output to ensure deterministic reproduction steps.

## File Organization Rules

- **Core application:** `index.html`, `app.js`, `styles.css` form the single-page application
- **Configuration:** Mermaid configuration must preserve accessibility attributes
- **Test assets:** Sample Mermaid files go in `samples/` with metadata tracked in `samples/manifest.json`
- **Scripts:** Utility scripts (sample collection, manifest updates) belong in `scripts/`
- **Tests:** All test files belong in `tests/` directory
- **Documentation:** Normative specifications belong in root directory
- **Every JavaScript/HTML file must include the license header**

## Development Workflow

**Test-First Approach:**

1. Before making changes, run `npm test` to establish baseline
2. Make changes to `app.js`, `styles.css`, or `index.html`
3. Run `npm test` after each significant change
4. If tests fail, fix code or update tests (with clear justification)
5. Test manually in browser at local server
6. Run `npm run qa` for full accessibility validation
7. Commit only when all tests pass

**When Tests Fail:**
- Check `tests/README.md` for failure explanations
- Use diagnostic scripts for quick debugging
- Each test documents the specific bug it prevents
- If legitimate change requires test updates, document why in commit message

## Code Style Guidelines

- Use ES modules with CDN imports (no bundler for runtime)
- Prefer functional components and modern JavaScript patterns
- Use semantic HTML5 elements
- Include ARIA labels and live regions for dynamic content
- Comment complex accessibility transformations with references to normative specs
- Keep functions focused and testable
- Preserve readability over cleverness

## Documentation Expectations

- Keep README.md aligned with these guardrails: zero-build runtime, license headers, and the current QA pipeline
- Reference normative specifications when documenting features or prompting AI-assisted changes
- Note any new QA coverage (tests or scripts) in README.md so maintainers understand which checks protect a change
- Document known limitations honestly
- Include examples for complex transformations

## Contribution Expectations

Contributors are expected to:
- Understand the accessibility goals before adding features
- Preserve semantic output
- Avoid clever abstractions that hide accessibility logic
- Add or update sample files when changing behavior
- Document limitations honestly

Accessibility regressions are treated as bugs, not enhancements.
