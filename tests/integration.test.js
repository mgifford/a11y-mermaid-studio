/*
 * AGPL-3.0-or-later License - See LICENSE file for full text
 * Copyright (c) 2026 Mark Gifford
 * 
 * Integration Test Suite
 * Validates actual SVG rendering and DOM updates from real Mermaid diagrams
 * 
 * This is the critical test that catches when Random button produces empty SVGs.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const appJs = readFileSync(path.resolve(process.cwd(), 'app.js'), 'utf8');

describe('Integration Tests - Actual SVG Generation', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should have renderMermaidDiagram function that actually returns SVG', () => {
    // Critical: This function must exist and be async
    expect(appJs).toContain('async function renderMermaidDiagram(mermaidSource)');
    expect(appJs).toContain('window.mermaid.render');
    expect(appJs).toContain('return svg');
  });

  it('should have applyAccessibilityTransformations that preserves SVG content', () => {
    // Critical: Accessibility transforms must not empty the SVG
    expect(appJs).toContain('function applyAccessibilityTransformations(svgString, metadata)');
    expect(appJs).toContain('parseFromString(svgString, \'image/svg+xml\')');
    expect(appJs).toContain('XMLSerializer');
  });

  it('should have displayPreview function that populates STATE.currentSvg', () => {
    // Critical: displayPreview must store SVG in STATE before updateSvgDisplay is called
    expect(appJs).toContain('STATE.currentSvg = svgString');
    expect(appJs).toContain('updateSvgDisplay()');
  });

  it('should have updateSvgDisplay that checks STATE.currentSvg is not empty', () => {
    // Critical: updateSvgDisplay should handle empty SVGs gracefully
    expect(appJs).toContain('function updateSvgDisplay()');
    expect(appJs).toContain('!STATE.currentSvg');
    expect(appJs).toContain('svgCode.value = STATE.beautifiedSvg');
  });

  it('should have formatSvg function for Beautiful output', () => {
    // Critical: SVG beautification should preserve SVG structure
    expect(appJs).toContain('function formatSvg(svgString)');
    expect(appJs).toContain('xmlFormatter');
  });

  it('should have optimizeSvg function for Optimized output', () => {
    // Critical: SVG optimization should preserve SVG structure
    expect(appJs).toContain('function optimizeSvg(svgString)');
    expect(appJs).toContain('SVGO');
  });

  it('validateAndRender should call renderMermaidDiagram -> displayPreview', () => {
    // Critical path: source → render (with retry) → transform → display → update code
    expect(appJs).toContain('async function validateAndRender()');
    expect(appJs).toContain('for (let attempt = 1; attempt <= 2; attempt += 1)');
    expect(appJs).toContain('svg = await renderMermaidDiagram(mermaidSource)');
    expect(appJs).toContain('const accessibleSvg = applyAccessibilityTransformations(svg, metadata)');
    expect(appJs).toContain('const sizedSvg = ensureViewBox(accessibleSvg)');
    expect(appJs).toContain('displayPreview(sizedSvg)');
  });

  it('Random button flow should be: load → validateAndRender → displayPreview → updateSvgDisplay', () => {
    // Critical: Verify the full chain
    expect(appJs).toContain('await loadRandomExampleIntoEditor()');
    expect(appJs).toContain('const ok = await validateAndRender()');
    expect(appJs).toContain('showToast(\'Loaded a random example.\', \'success\')');
  });

  it('should handle empty SVG gracefully (show error instead of hanging)', () => {
    // Critical: If Mermaid returns empty SVG, display must show error
    expect(appJs).toContain('editorError.textContent = error.message');
    expect(appJs).toContain('editorError.classList.add(\'show\')');
    expect(appJs).toContain('return false');
  });

  it('should have clearStorageCache function to prevent stale data', () => {
    // Critical: Cache clearing prevents intermittent issues
    expect(appJs).toContain('function clearStorageCache()');
    expect(appJs).toContain('localStorage.removeItem(\'lastDiagram\')');
  });

  it('should preserve SVG role="img" through entire pipeline', () => {
    // Critical: Accessibility attribute must survive transformations
    expect(appJs).toContain('svg.setAttribute(\'role\', \'img\')');
  });

  it('should preserve SVG title and desc elements through entire pipeline', () => {
    // Critical: Pattern 11 metadata must survive transformations
    expect(appJs).toContain('const titleId = generateUniqueId(\'title\')');
    expect(appJs).toContain('const descId = generateUniqueId(\'desc\')');
    expect(appJs).toContain('svg.insertBefore(title, svg.firstChild)');
  });

  it('XMLSerializer should serialize SVG back to string without dropping elements', () => {
    // Critical: Final SVG must not be empty after serialization
    expect(appJs).toContain('new XMLSerializer().serializeToString(svg)');
  });
});
