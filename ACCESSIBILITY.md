# Accessibility Commitment (ACCESSIBILITY.md)

AGPL-3.0-or-later License — See LICENSE file for full text  
Copyright (c) 2026 Mike Gifford

> This file follows the [ACCESSIBILITY.md open standard](https://mgifford.github.io/ACCESSIBILITY.md/) for project accessibility transparency, governance, and AI-assisted inclusion.

---

## 1. Our Commitment

Accessibility is a core feature of this project, not an afterthought. **A11y Mermaid Studio exists specifically to make Mermaid diagrams usable by people who rely on screen readers and other assistive technologies.**

This project commits to **WCAG 2.2 Level AA** conformance across:
- The web application UI at https://mgifford.github.io/a11y-mermaid-studio/
- All exported SVG output
- All documentation and sample files

Accessibility regressions are treated as **bugs**, not enhancement requests. Every PR must pass automated accessibility checks before merge.

---

## 2. Real-Time Health Metrics

| Metric | Status / Source |
| :--- | :--- |
| **Open A11y Issues** | [Open accessibility issues](https://github.com/mgifford/a11y-mermaid-studio/issues?q=is%3Aissue+is%3Aopen+label%3Aaccessibility) |
| **Automated Test Pass Rate** | `npm test` — must be 100% |
| **CI/CD Enforcement** | Tests run on every commit; PRs must pass all checks |
| **WCAG Target** | 2.2 Level AA |
| **Contrast Target (text)** | ≥ 4.5:1 (WCAG AA) |
| **Contrast Target (non-text)** | ≥ 3:1 (WCAG AA) |
| **Screen Reader Validated** | Flowchart list-navigation pattern (Léonie Watson) |

---

## 3. Scope

### What This Project Covers

- **Mermaid diagram rendering** — All 23 diagram types are rendered with semantic SVG structure (`role="img"`, `<title>`, `<desc>`, `aria-labelledby`)
- **Flowchart accessibility** — Full semantic list navigation following [Léonie Watson's accessible SVG flowcharts](https://tink.uk/accessible-svg-flowcharts/)
- **Pattern 11 implementation** — Per [Carie Fisher's "Accessible SVGs"](https://cariefisher.com/a11y-svg-updated/): `<svg role="img">` + `<title>` + `<desc>` + `aria-labelledby`
- **Contrast validation** — WCAG 2.x and APCA checks in both light and dark modes
- **Narrative generation** — Prose descriptions for 8 diagram types (see below)
- **Application UI** — Keyboard navigation, ARIA live regions, semantic HTML5, high-contrast focus rings

### Diagram Type Support Status

| Type | Narrative Support | Accessibility Level |
|------|-------------------|---------------------|
| Flowchart | ✅ Full | Full list semantics (Watson pattern) |
| Gantt Chart | ✅ Full | Pattern 11 |
| User Journey | ✅ Full | Pattern 11 |
| Pie Chart | ✅ Full | Pattern 11 |
| Class Diagram | ✅ Full | Pattern 11 |
| Mind Map | ✅ Full | Pattern 11 |
| Timeline | ✅ Full | Pattern 11 |
| XY Chart | ✅ Full | Pattern 11 |
| Sequence, State, ER, Git Graph, C4, and 10 more | 🔄 Generic fallback | Pattern 11 |

All 23 diagram types include `role="img"`, `<title>`, `<desc>`, and `aria-labelledby` regardless of narrative depth.

---

## 4. Required Annotations

Every diagram exported from this tool **must** include:

```mermaid
%%accTitle Brief, descriptive title (max 100 characters)
%%accDescr Full prose description of diagram purpose, key elements, and relationships
```

**Export is blocked** when either annotation is missing. These annotations are injected into the SVG as `<title>` and `<desc>` elements, which are essential for screen reader users.

See [MERMAID_ACCESSIBILITY_BEST_PRACTICES.md](./MERMAID_ACCESSIBILITY_BEST_PRACTICES.md) for the full authoring specification.

---

## 5. Contributor Requirements (The Guardrails)

To contribute to this project, you must follow these requirements:

### Testing
- All UI changes must pass `npm test` (100% pass rate required)
- All changes must pass `npm run qa` (full QA suite including axe and pa11y)
- Accessibility regressions cause PR failure and require immediate revert

### Annotations
- All sample diagrams must include `%%accTitle` and `%%accDescr`
- New diagram type handlers must produce valid Pattern 11 SVG output

### Code Style
- Every JavaScript/HTML file must include the AGPL-3.0 license header
- Use semantic HTML5 elements for all UI components
- Include ARIA labels and live regions for dynamic content
- Comment complex accessibility transformations with references to normative specs

### Documentation
- Document known accessibility limitations honestly
- Reference normative specifications when describing accessibility features
- Update `samples/manifest.json` when adding or changing sample diagrams

### Definition of Done
A PR is only mergeable when:
1. `npm test` passes at 100%
2. `npm run axe` reports no violations
3. `npm run pa11y` reports no errors
4. All exported SVGs pass manual screen reader spot-check
5. Contrast ratios validated in both light and dark modes

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the complete guide.

---

## 6. Reporting Accessibility Issues

Please [open a GitHub issue](https://github.com/mgifford/a11y-mermaid-studio/issues/new) and apply the `accessibility` label.

### Severity Taxonomy

| Severity | Definition | Example |
|----------|------------|---------|
| **Critical** | Prevents a user from completing a core task | SVG exported without `role="img"`; screen reader cannot identify the diagram |
| **High** | Significant barrier but a workaround exists | Contrast fails in dark mode; user can switch to light mode |
| **Medium** | Degraded or inconsistent experience | Narrative description incomplete for one diagram type |
| **Low** | Minor annoyance; does not block access | Missing punctuation in a generated prose description |

### Helpful Information to Include

When reporting, please include:
- Browser and version
- Assistive technology used (screen reader, magnification, switch access)
- Operating system
- Steps to reproduce
- What you expected vs. what happened
- Screenshot or screen recording if possible

---

## 7. Automated Check Coverage

### CI/CD Commands

```bash
npm test                   # All test suites (regression, features, accessibility, UI)
npm run test:regression    # Regression tests for known bugs
npm run test:features      # Feature integration tests
npm run test:accessibility # Semantic output and ARIA compliance validation
npm run test:ui            # DOM structure and component validation
npm run axe                # WCAG 2.2 Level AA automated checks (requires local server)
npm run pa11y              # Additional accessibility validation
npm run qa                 # Full QA suite: tests + axe + pa11y
```

### What Is Automatically Checked

| Check | Tool | Scope |
|-------|------|-------|
| `role="img"` on SVG root | Vitest (accessibility suite) | All rendered diagrams |
| `<title>` and `<desc>` elements | Vitest | All rendered diagrams |
| `aria-labelledby` references | Vitest | All rendered diagrams |
| `role="list"` / `role="listitem"` on flowcharts | Vitest | Flowchart type |
| Contrast ratio (WCAG AA) | `npm run axe` | Application UI |
| Keyboard navigation | `npm run pa11y` | Application UI |
| Required annotation enforcement | Vitest (regression suite) | Export workflow |
| SVG namespace preservation | Vitest | All rendered diagrams |

### Known Gaps in Automation

- **Screen reader testing** requires manual verification with NVDA, JAWS, VoiceOver, and TalkBack
- **Forced-colors mode** is not yet fully automated
- **Cognitive accessibility** (plain language, reading level) is partially addressed by narrative generation but requires human review

See [TESTING_GAPS.md](./TESTING_GAPS.md) for the full list of known testing limitations.

---

## 8. AI Agent Instructions

This section provides explicit guidance for AI coding assistants (GitHub Copilot, Cursor, Claude, ChatGPT, etc.) working in this repository.

### Core Rules for AI Agents

1. **Accessibility is non-negotiable.** Never remove, weaken, or bypass accessibility attributes (`role`, `aria-*`, `<title>`, `<desc>`). When in doubt, preserve them.

2. **Pattern 11 is the standard.** All SVG output must implement Carie Fisher's Pattern 11:
   ```html
   <svg role="img" aria-labelledby="title-id desc-id" xmlns="http://www.w3.org/2000/svg">
     <title id="title-id">...</title>
     <desc id="desc-id">...</desc>
   </svg>
   ```

3. **Semantic list structure for flowcharts.** Flowchart rendering must follow Léonie Watson's patterns: a `role="list"` wrapper group, each node as `role="listitem"` with a `<title>`, decorative shapes hidden from the accessibility tree.

4. **Titles and descriptions are mandatory.** If a diagram lacks `%%accTitle` or `%%accDescr`, block export. Do not silently generate them without user confirmation.

5. **Contrast must be validated in both themes.** Never ship a color change without checking WCAG AA contrast ratios in both light and dark modes.

6. **No silent removal of semantics.** Post-processing steps must not strip `aria-*` attributes, `role` values, or `<title>`/`<desc>` elements. Reference [MERMAID_TRANSFORMATION_BEST_PRACTICES.md](./MERMAID_TRANSFORMATION_BEST_PRACTICES.md) before modifying SVG post-processing.

7. **Zero build step.** Do not introduce bundlers, transpilers, or build pipelines. All code must run as ES modules directly in the browser.

8. **License headers required.** Every new JavaScript or HTML file must include:
   ```javascript
   /*
    * AGPL-3.0-or-later License - See LICENSE file for full text
    * Copyright (c) 2026 Mike Gifford
    */
   ```

9. **Tests must pass.** Run `npm test` after any change. A PR is incomplete if tests fail.

10. **Document normative references.** When writing accessibility logic, add a comment citing the relevant specification (Watson, Fisher, WCAG 2.2, W3C ARIA).

### What AI Agents Must Not Do

- Do not add server-side rendering, Node-based build pipelines, or backend services
- Do not infer accessibility semantics without user confirmation
- Do not generate `accTitle` or `accDescr` without displaying the generated text to the user for review
- Do not modify test expectations to make failing tests pass without fixing the underlying issue
- Do not use `innerHTML` with unsanitized SVG content
- Do not strip `xmlns` namespaces from SVG (required for standalone SVG download)

### Normative References for AI

AI agents must treat these as authoritative:

| Reference | Use When |
|-----------|----------|
| [Léonie Watson — Accessible SVG flowcharts](https://tink.uk/accessible-svg-flowcharts/) | All flowchart rendering decisions |
| [Carie Fisher — Accessible SVG Patterns](https://cariefisher.com/a11y-svg-updated/) | All SVG accessibility patterns |
| [Deque — Creating Accessible SVGs](https://www.deque.com/blog/creating-accessible-svgs/) | Choosing the right pattern for inline, img, object, or background-image deployment |
| [Smashing Magazine — Accessible SVGs: Inclusiveness Beyond Patterns](https://www.smashingmagazine.com/2020/03/accessible-svgs-inclusiveness-beyond-patterns/) | Animated SVG, interactive SVG, and context-dependent decisions |
| [Deque University — svg-img-alt axe rule](https://dequeuniversity.com/rules/axe/4.11/svg-img-alt) | Ensuring SVG `role="img"` elements always have a text alternative |
| [Accesify — SVG Accessibility: Icons & Graphics](https://www.accesify.io/blog/svg-accessibility-icons-graphics-screen-reader-friendly/) | SVG icons, `<use>` sprite patterns, decorative vs informative classification |
| [iamvector — 9 Ways to Enhance Accessibility in SVG Icon Design](https://iamvector.com/blog/9-ways-to-enhance-accessibility-in-svg-icon-design/) | Icon-specific accessibility enhancements |
| [dev.to/accessibly_speaking — How to Make SVGs Accessible](https://dev.to/accessibly_speaking/how-to-make-svgs-accessible-a-short-guide-1ope) | Introductory reference for title/desc/role patterns |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | All contrast, keyboard, and semantic decisions |
| [W3C ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) | All ARIA attribute decisions |
| [MERMAID_ACCESSIBILITY_BEST_PRACTICES.md](./MERMAID_ACCESSIBILITY_BEST_PRACTICES.md) | Mermaid-specific authoring rules |
| [MERMAID_TRANSFORMATION_BEST_PRACTICES.md](./MERMAID_TRANSFORMATION_BEST_PRACTICES.md) | SVG post-processing rules |
| [AGENTS.md](./AGENTS.md) | Architecture, scope, and project philosophy |

---

## 9. Known Limitations and Current Gaps

| Gap | Severity | Status |
|-----|----------|--------|
| Sequence, State, ER, Git Graph, C4 diagrams lack rich narrative generation | Medium | Planned |
| Generic fallback narrative for 15 diagram types is structural, not semantic | Medium | Planned |
| Forced-colors (Windows High Contrast) mode not fully validated | Medium | Under investigation |
| Screen reader testing limited to NVDA + Firefox; JAWS, VoiceOver not systematically tested | High | Needs volunteers |
| Cognitive accessibility (reading level, plain language) not formally audited | Medium | Future |
| Touch/mobile screen reader testing (TalkBack, VoiceOver iOS) not validated | High | Future |
| AI narrative enhancement (Chrome Gemini Nano) only works in Chrome 128+ with English (US) | Low | By design (optional feature) |

---

## 10. Accessibility Conformance Statement

| Item | Detail |
|------|--------|
| **Standard** | WCAG 2.2 Level AA |
| **Evaluation Method** | Automated (axe-core, pa11y) + Manual |
| **Application URL** | https://mgifford.github.io/a11y-mermaid-studio/ |
| **Date** | 2026-01 |
| **Evaluator** | Mike Gifford |
| **Contact** | [Open a GitHub issue](https://github.com/mgifford/a11y-mermaid-studio/issues) |

This is a living document. It will be updated as the project's accessibility posture changes.

---

## References

- [ACCESSIBILITY.md open standard](https://mgifford.github.io/ACCESSIBILITY.md/) — template and framework this file follows
- [MERMAID_ACCESSIBILITY_BEST_PRACTICES.md](./MERMAID_ACCESSIBILITY_BEST_PRACTICES.md) — authoring and annotation specification
- [MERMAID_TRANSFORMATION_BEST_PRACTICES.md](./MERMAID_TRANSFORMATION_BEST_PRACTICES.md) — SVG post-processing specification
- [AGENTS.md](./AGENTS.md) — project architecture and accessibility model
- [CONTRIBUTING.md](./CONTRIBUTING.md) — contributor requirements
- [TESTING_GAPS.md](./TESTING_GAPS.md) — known testing limitations
- [Léonie Watson's "Accessible SVG flowcharts"](https://tink.uk/accessible-svg-flowcharts/)
- [Carie Fisher's "Accessible SVGs: Perfect Patterns For Screen Reader Users"](https://cariefisher.com/a11y-svg-updated/)
- [Deque's "Creating Accessible SVGs"](https://www.deque.com/blog/creating-accessible-svgs/)
- [Smashing Magazine's "Accessible SVGs: Inclusiveness Beyond Patterns"](https://www.smashingmagazine.com/2020/03/accessible-svgs-inclusiveness-beyond-patterns/)
- [Deque University's svg-img-alt axe rule](https://dequeuniversity.com/rules/axe/4.11/svg-img-alt)
- [Accesify's "SVG Accessibility: Icons, Graphics & Screen Reader Friendly"](https://www.accesify.io/blog/svg-accessibility-icons-graphics-screen-reader-friendly/)
- [iamvector's "9 Ways to Enhance Accessibility in SVG Icon Design"](https://iamvector.com/blog/9-ways-to-enhance-accessibility-in-svg-icon-design/)
- [dev.to/accessibly_speaking's "How to Make SVGs Accessible: A Short Guide"](https://dev.to/accessibly_speaking/how-to-make-svgs-accessible-a-short-guide-1ope)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
