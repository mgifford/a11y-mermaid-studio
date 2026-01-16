# Contributing to A11y Mermaid Studio

Thank you for your interest in making Mermaid diagrams more accessible!

## Code of Conduct

This project follows the Contributor Covenant. Be respectful, inclusive, and constructive.

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/mgifford/a11y-mermaid-studio.git
   cd a11y-mermaid-studio
   ```

2. **No build step required** — the site runs entirely in the browser
   ```bash
   npm install  # Optional: only for development/testing
   ```

3. **Start local development server**
   ```bash
   python3 -m http.server 8008
   ```

4. **Open in browser**
   ```
   http://localhost:8008
   ```

## Development Workflow

**Before making changes:**
```bash
npm test  # Establish baseline (if npm installed)
```

**After making changes:**
```bash
npm test              # Run all tests
npm run test:accessibility  # Run a11y tests
npm run qa            # Full suite (tests + axe + pa11y)
```

## What to Contribute

### High Priority
- Sample Mermaid diagrams with proper annotations
- Regression tests for specific bugs
- Documentation improvements
- Accessibility audit findings

### Before Starting
1. Check [AGENTS.md](AGENTS.md) for architectural guidelines
2. Review [MERMAID_ACCESSIBILITY_BEST_PRACTICES.md](MERMAID_ACCESSIBILITY_BEST_PRACTICES.md)
3. Review [MERMAID_TRANSFORMATION_BEST_PRACTICES.md](MERMAID_TRANSFORMATION_BEST_PRACTICES.md)

## Code Style

- **ES modules only** — Use `import`/`export`
- **No bundler** — All code runs in browser as-is
- **Semantic HTML** — Use proper heading hierarchy, ARIA labels, live regions
- **Accessibility first** — Test with screen readers, keyboard navigation
- **Comment normative refs** — Reference Watson, Fisher, WCAG when adding a11y logic

### License Headers

Every JavaScript/HTML file must include:
```javascript
/*
 * AGPL-3.0-or-later License - See LICENSE file for full text
 * Copyright (c) 2026 Mark Gifford
 */
```

## Testing Requirements

All code changes must pass:
```bash
npm test  # 100% pass rate required
```

Each test documents the specific bug it prevents. If you need to update a test:
1. Document **why** the change is necessary
2. Include the justification in the commit message
3. Ensure the change doesn't mask a real accessibility issue

## Adding Sample Diagrams

1. Create a file in `samples/` (e.g., `my-diagram.mmd`)
2. Include proper annotations:
   ```mermaid
   graph TD
       A[Start] --> B[End]
   
   %%accTitle Your diagram title
   %%accDescr Detailed description
   ```
3. Add metadata to `samples/manifest.json`
4. Run `npm test` to ensure no regressions

## Normative References

All features and changes should align with:
- **Léonie Watson's accessible SVG patterns** (https://tink.uk/accessible-svg-flowcharts/)
- **Carie Fisher's Pattern 11** (https://cariefisher.com/a11y-svg-updated/)
- **WCAG 2.2 Level AA**
- **W3C ARIA specifications**
- **Project's own best practices documents**

If your change conflicts with these references, the references win.

## Submitting Changes

1. **Create a branch** from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make focused, atomic commits**
   ```bash
   git commit -m "Fix: [specific issue]"
   ```

3. **Include tests** for any new functionality

4. **Document changes** in commit messages
   - What changed?
   - Why did it need to change?
   - What normative spec does it follow?

5. **Run full QA before pushing**
   ```bash
   npm test && npm run qa
   ```

6. **Push to your fork and create a Pull Request**

## Pull Request Guidelines

- **Title:** Descriptive and concise
- **Description:** 
  - Link to related issues
  - Explain what you changed and why
  - Reference normative specs
  - Mention any accessibility impacts
- **Tests:** All tests passing
- **No breaking changes** without discussion

## Accessibility Regressions

**These are treated as bugs, not enhancements.**

If a change:
- Removes meaningful accessibility attributes
- Breaks screen reader compatibility
- Degrades contrast ratios
- Violates WCAG AA

It will be **reverted**, regardless of other benefits.

## Questions?

- Check [AGENTS.md](AGENTS.md) for architecture questions
- Review normative specs for accessibility questions
- Open an issue for clarification

---

**Thank you for contributing to accessible diagrams!** 🎉

Last Updated: January 16, 2026
