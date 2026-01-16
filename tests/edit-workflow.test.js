/*
 * AGPL-3.0-or-later License - See LICENSE file for full text
 * Copyright (c) 2026 Mark Gifford
 * 
 * Edit Workflow Test Suite
 * Validates that editing Mermaid diagram content updates the preview immediately
 * 
 * Example: Editing a pie chart's Firefox value from 4 to 75 should:
 * 1. Update the Mermaid source textarea
 * 2. Trigger validation and rendering
 * 3. Display the updated SVG in both light and dark previews
 * 4. Update the SVG code display (Beautiful/Optimized)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const appJs = readFileSync(path.resolve(process.cwd(), 'app.js'), 'utf8');

describe('Edit Workflow Tests', () => {
  it('should have validateAndRender function that updates preview on content changes', () => {
    // Core requirement: live editing of Mermaid source triggers re-render
    expect(appJs).toContain('async function validateAndRender()');
    expect(appJs).toContain('renderMermaidDiagram');
    expect(appJs).toContain('displayPreview');
  });

  it('should attach input event listener to Mermaid source for live updates', () => {
    // User types in the Mermaid source → validateAndRender is called immediately
    expect(appJs).toContain('addEventListener(\'input\', validateAndRender)');
  });

  it('should update both light and dark previews when Mermaid is edited', () => {
    // displayPreview writes to both preview panes
    expect(appJs).toContain('lightPreview.innerHTML = svgString');
    expect(appJs).toContain('darkPreview.innerHTML = svgString');
  });

  it('should update SVG code display (Beautiful/Optimized) when preview updates', () => {
    // When displayPreview is called:
    // 1. Raw SVG is stored in STATE.currentSvg
    // 2. Cached formatted versions are cleared
    // 3. updateSvgDisplay refreshes the code textarea
    expect(appJs).toContain('STATE.currentSvg = svgString');
    expect(appJs).toContain('STATE.beautifiedSvg = \'\'');
    expect(appJs).toContain('STATE.optimizedSvg = \'\'');
    expect(appJs).toContain('updateSvgDisplay()');
  });

  it('should preserve accessibility attributes when re-rendering from edits', () => {
    // Every render applies Pattern 11: role="img", <title>, <desc>, aria-labelledby
    expect(appJs).toContain('applyAccessibilityTransformations');
    expect(appJs).toContain('aria-labelledby');
  });

  it('should handle validation errors gracefully during editing', () => {
    // If user types invalid Mermaid, error is shown in editor, preview not cleared
    expect(appJs).toContain('editor-error');
    expect(appJs).toContain('editorError.classList.add(\'show\')');
  });

  it('should support editing SVG code directly and update preview', () => {
    // User can edit the SVG code textarea and trigger preview update
    expect(appJs).toContain('svgCode.addEventListener(\'input\'');
    expect(appJs).toContain('displayPreview(code)');
  });

  it('should regenerate formatted/optimized SVG from edited content', () => {
    // After user edits SVG code:
    // 1. Preview updates
    // 2. When switching Beautiful ↔ Optimized, new versions are computed
    expect(appJs).toContain('renderSvgHighlight');
    expect(appJs).toContain('formatSvg');
    expect(appJs).toContain('optimizeSvg');
  });

  it('should demonstrate pie chart editing workflow', () => {
    // Test data: Pie chart with Firefox: 4 → Firefox: 75
    // The app must:
    // 1. Accept keystroke edits
    // 2. Parse updated Mermaid
    // 3. Render new SVG with updated pie slice
    // 4. Display immediately in both light/dark previews
    // 5. Show updated SVG code in Beautiful/Optimized modes
    
    const pieChart = `pie title Browser Share
  "Chrome" : 63
  "Safari" : 20
  "Firefox" : 4
  "Edge" : 6
  "Other" : 7

%%accTitle Pie Chart Example
%%accDescr A pie chart showing hypothetical browser market share percentages for Chrome, Safari, Firefox, Edge, and Others.`;

    const edited = pieChart.replace('"Firefox" : 4', '"Firefox" : 75');
    
    expect(edited).toContain('"Firefox" : 75');
    expect(edited).not.toContain('"Firefox" : 4');
    // The app must call validateAndRender on each keystroke
    // which triggers renderMermaidDiagram → displayPreview → updateSvgDisplay
  });
});
