# Test Suite Documentation

## Test Files

### `regression.test.js` (6 tests)
Prevents specific bugs that previously broke the application:
- Application initialization
- CDN loading (Mermaid)
- DOM element presence
- Annotation parsing
- ID generation uniqueness

### `features.test.js` (7 tests)
Validates critical user workflows and Mermaid transformations:
- Metadata validation
- Mermaid rendering
- Accessibility transformations
- Light/dark mode preview
- SVG export with semantics
- localStorage persistence
- Error handling

### `accessibility.test.js` (10 tests)
Validates semantic output and ARIA compliance per normative specs:
- Pattern 11 implementation (`role="img"`, `<title>`, `<desc>`, `aria-labelledby`)
- xmlns namespace preservation
- WCAG contrast ratios (text 4.5:1, non-text 3:1)
- Dark mode contrast validation
- Flowchart list semantics (`role="list"`, `role="listitem"`)
- Decorative element hiding

### `ui.test.js` (8 tests)
DOM structure and component validation:
- Semantic HTML structure
- Skip-to-main-content link
- Form input labeling
- Heading hierarchy
- Focus ring contrast
- ARIA live regions
- Theme toggle accessibility
- Keyboard navigation

## Running Tests

```bash
# All tests
npm test

# Individual suites
npm run test:regression
npm run test:features
npm run test:accessibility
npm run test:ui

# QA suite (tests + external validators)
npm run qa
```

## Test Coverage Areas

1. **Annotation parsing** — `%%accTitle` and `%%accDescr` extraction and validation
2. **Node type inference** — Question vs statement detection for future enhancements
3. **Semantic structure** — Proper ARIA roles and attributes
4. **Title/description** — Enforcement and accessibility
5. **Contrast calculation** — WCAG 2.x and APCA validation
6. **Dual-mode theming** — Light/dark mode preservation and contrast
7. **Mermaid round-tripping** — Text edit synchronization
8. **Edge label handling** — Contextual link naming

## Normative References

All tests are based on:
- **Léonie Watson's Accessible SVG Patterns** (flowcharts, tables, line graphs)
- **Carie Fisher's Pattern 11** (svg + role="img" + title + desc + aria-labelledby)
- **WCAG 2.2 Level AA** (contrast, ARIA, semantic HTML)
- **W3C ARIA Authoring Practices Guide**
- **MERMAID_ACCESSIBILITY_BEST_PRACTICES.md** (to be created)

## Development Workflow

Before any commit:
```bash
npm test  # Must pass 100%
npm run qa  # Full suite
```

If a test fails:
1. Check `tests/README.md` for the specific requirement
2. Fix the code or update the test (with justification)
3. Verify locally in browser
4. Commit only when all tests pass

## Future Test Expansion

As features are added, new tests should be created for:
- Line graph accessibility
- State diagram accessibility
- Sequence diagram accessibility
- Gantt chart accessibility
- Custom annotation handling
- SVG optimization with accessibility preservation
- Contrast checking algorithms
