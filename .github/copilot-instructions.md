# GitHub Copilot Instructions

## Start Here

Before making any changes to this repository, read the following files in order:

1. **[AGENTS.md](../AGENTS.md)** — The primary onboarding document for AI coding agents. It describes the project's purpose, scope, non-goals, core principles, technical guardrails, accessibility model, test-driven architecture, code style guidelines, and contribution expectations. This is the authoritative reference for all development work.

2. **[ACCESSIBILITY.md](../ACCESSIBILITY.md)** — Detailed accessibility requirements, patterns (Carie Fisher Pattern 11 baseline), WCAG/APCA contrast rules, and guidance for SVG accessibility post-processing.

## Key Normative References (also in root directory)

| File | Purpose |
|------|---------|
| `MERMAID_ACCESSIBILITY_BEST_PRACTICES.md` | Normative spec for authoring, annotation, linting, and the "Generate prompt to improve this diagram" workflow |
| `MERMAID_TRANSFORMATION_BEST_PRACTICES.md` | Normative transformation spec governing post-processing rules, semantic preservation, and verification checklists |
| `MERMAID_DIAGRAM_TYPES.md` | Guide to all 23 MermaidJS diagram types, implementation strategy, and narrative generation readiness |
| `MERMAID_DIAGRAM_TYPES.json` | Machine-readable reference for diagram types, syntax details, and narrative support status |
| `CONTRIBUTING.md` | Contribution guidelines and development workflow |
| `TESTING_GAPS.md` | Known gaps in test coverage and areas requiring additional tests |

## Quick-Start Checklist

- **Zero build step:** The site runs entirely in the browser via ES Modules and CDN imports. Do not introduce Webpack, Vite, npm install requirements, or server-side rendering.
- **Run tests first:** `npm test` must pass before and after any changes.
- **Full QA:** `npm run qa` runs tests + linting + accessibility validation.
- **Accessibility is non-negotiable:** Treat accessibility regressions as bugs.
- **License headers:** Every JavaScript/HTML file must include the license header.
- **Static hosting only:** Everything must work on GitHub Pages with no backend.

## Errors and Workarounds

_Document any errors encountered and workarounds applied here so future agents can avoid repeating them._
