# A11y Mermaid Studio

Transform Mermaid diagrams into WCAG 2.2 AA-compliant, meaningfully accessible SVGs.

## What This Is

This is a browser-native tool that post-processes Mermaid-generated SVGs to:
- Apply proper accessibility semantics per [Carie Fisher's Pattern 11](https://cariefisher.com/a11y-svg-updated/) (`<svg>` + `role="img"` + `<title>` + `<desc>` + `aria-labelledby`)
- Enforce required metadata (title and description)
- Validate contrast ratios in both light and dark modes
- Support direct SVG export for standalone use

**This is not a Mermaid fork.** It's an accessibility layer on top of Mermaid's standard output.

## Getting Started

### Online (No Installation)

Visit the live site: https://mgifford.github.io/a11y-mermaid-studio/

### Local Development

```bash
# Clone the repository
git clone https://github.com/mgifford/a11y-mermaid-studio.git
cd a11y-mermaid-studio

# Start local server
python3 -m http.server 8008

# Open http://localhost:8008 in your browser
```

## How to Use

1. **Write Mermaid code** with required accessibility annotations:
   ```mermaid
   graph TD
       A[Start] --> B[Process] --> C[End]
   
   %%accTitle My Workflow
   %%accDescr A simple three-step workflow diagram
   ```

2. **Click "Render Diagram"** to generate an accessible SVG
3. **Preview in light/dark modes** to validate contrast
4. **Click "Export SVG"** to download the accessible diagram

## Required Annotations

Every diagram **must** have:

```
%%accTitle Brief title (max 100 chars)
%%accDescr Detailed description explaining the diagram content and purpose
```

These are injected into the SVG as `<title>` and `<desc>` elements, which are essential for screen reader users.

## Technical Stack

- **Zero build step:** Runs entirely in the browser via ES Modules and CDNs
- **Mermaid:** Loaded from CDN (pinned version)
- **Accessibility:** Based on normative specifications (Watson, Fisher, W3C)
- **Theme support:** Light/dark mode with contrast validation
- **AI Enhancement:** Optional local AI (Chrome's Gemini Nano) for narrative improvement
- **Testing:** Vitest + Axe + Pa11y for quality assurance

## Narrative Generation Support

The tool automatically generates accessible prose narratives for diagram types:

### AI-Enhanced Narratives (Optional) 🤖

If you're using **Chrome 128+**, the app can optionally use Chrome's built-in AI (Gemini Nano) to:
- Review narrative accuracy
- Improve clarity for your target audience
- Adapt technical detail level
- **100% private—all processing happens locally in your browser**

See [AI_ENHANCED_NARRATIVES.md](./AI_ENHANCED_NARRATIVES.md) for details.

#### Diagnose Local AI Availability

If the inline "Enhance with AI" controls do not appear:
1. Open DevTools → Console and run `checkBrowserAIStatus()` to see whether `window.ai` exists, if the language model is ready, or if Chrome/Edge flags/OS requirements are missing.
2. Run `A11yMermaidAI.getAvailability()` to confirm detection state, and `A11yMermaidAI.getUsage()` after triggering an enhancement to verify responses are recorded.
3. Use `A11yMermaidAI.enable()` / `A11yMermaidAI.disable()` to toggle preferences without touching localStorage directly.
4. Include the logged output when filing AI-related bugs so maintainers can reproduce the environment.

### Fully Implemented (8 types)

| Type | Narrative | Example Output |
|------|-----------|-----------------|
| **Flowchart** | Describes nodes and flow paths | "Flow path: [Start] → [Process] → [End]" |
| **Gantt** | Projects phases, tasks, and status tags | "Project timeline with 3 phases: Planning (2 tasks), Development (3 tasks), Deploy (1 critical task)" |
| **User Journey** | Steps with satisfaction tracking | "User journey: 5 steps from Awareness → Purchase with overall satisfaction: 😊" |
| **Pie Chart** | Data breakdown with percentages | "Data distribution: Item A (50%), Item B (30%), Item C (20%)" |
| **Class Diagram** | Classes, methods, and relationships | "System classes: Customer, Order, Product with inheritance and associations" |
| **Mind Map** | Hierarchical structure | "Central concept with 3 main branches and 12 sub-topics" |
| **Timeline** | Chronological events | "Timeline spanning 2020-2025 with 8 major milestones" |
| **XY Chart** | Data series and axes | "Chart showing 3 data series across 10 data points" |

### Generic Fallback (15 types)

All other MermaidJS diagram types receive a **structural description** including:
- Element count (nodes/entities/participants)
- Connection count (edges/relationships/arrows)
- Section count (subgraphs/phases)
- Total content lines

**Types with generic fallback**: Sequence, State, ER Diagram, Git Graph, C4, Quadrant, Requirement, ZenUML, Sankey, Block, Packet, Kanban, Architecture, Radar, Treemap

**SVG Accessibility**: All 23 diagram types include proper semantic structure (`role="img"`, `<title>`, `<desc>`, `aria-labelledby`) regardless of narrative depth.

See [MERMAID_DIAGRAM_TYPES.md](./MERMAID_DIAGRAM_TYPES.md) for complete reference and [GENERIC_NARRATIVE_FALLBACK.md](./GENERIC_NARRATIVE_FALLBACK.md) for fallback implementation details.

## Architecture

### Core Files
- `index.html` — Semantic HTML structure
- `app.js` — Application logic (ES modules)
- `styles.css` — Light/dark mode styling

### Test Suite
```bash
npm test                  # Run all tests
npm run test:regression   # Regression tests
npm run test:features     # Feature integration tests
npm run test:accessibility # Accessibility validation
npm run qa                # Full QA suite (tests + axe + pa11y)
```

### QA Commands
```bash
npm run axe    # WCAG 2.2 Level AA automated checks
npm run pa11y  # Additional accessibility validation
```

## Documentation

**Key Reference Documents:**

- [MERMAID_DIAGRAM_TYPES.md](./MERMAID_DIAGRAM_TYPES.md) — Complete reference for all 23 Mermaid diagram types, narrative generation strategies, and implementation guidance
- [MERMAID_DIAGRAM_TYPES.json](./MERMAID_DIAGRAM_TYPES.json) — Machine-readable reference with syntax details, narrative readiness assessment, and organization by category/complexity
- [AGENTS.md](./AGENTS.md) — Detailed agent instructions, development guidelines, and normative references

**Normative References:**
- [Léonie Watson's "Accessible SVG flowcharts"](https://tink.uk/accessible-svg-flowcharts/)
- [Carie Fisher's "Accessible SVGs: Perfect Patterns For Screen Reader Users"](https://cariefisher.com/a11y-svg-updated/)

**Project Specifications** (to be created):
- `MERMAID_ACCESSIBILITY_BEST_PRACTICES.md`
- `MERMAID_TRANSFORMATION_BEST_PRACTICES.md`

## Sample Diagrams

The `samples/` directory contains examples of properly annotated Mermaid diagrams:
- Flowcharts
- State diagrams
- Sequence diagrams
- Gantt charts

Each sample is tracked in `samples/manifest.json` for regression testing.

## Development Workflow

1. Run `npm test` before making changes (establish baseline)
2. Make changes to `app.js`, `styles.css`, or `index.html`
3. Run `npm test` after each significant change
4. Test manually in browser
5. Run `npm run qa` for full accessibility validation
6. Commit only when all tests pass

## Deployment to GitHub Pages

The site automatically deploys to GitHub Pages when you push to `main`:

1. Repository must be named `a11y-mermaid-studio`
2. Enable Pages in repository Settings
3. Source: `Deploy from branch` → `main` / root
4. Site will be live at: `https://mgifford.github.io/a11y-mermaid-studio/`

## License

AGPL-3.0-or-later — See LICENSE file for full text.

This project uses the GNU Affero General Public License (AGPL-3.0) to ensure that improvements and modifications remain accessible to all users. When using this software as part of a web service or application, you must make your modified source code available to users of that service.

## Contributing

See `AGENTS.md` for contribution expectations. All accessibility regressions are treated as bugs.

---

**Built with principles from:**
- Léonie Watson (accessibility patterns)
- Carie Fisher (pattern testing)
- Ashley Sheridan (flowchart semantics)
- W3C WAI (ARIA and WCAG standards)
