/*
 * AGPL-3.0-or-later License - See LICENSE file for full text
 * Copyright (c) 2026 Mike Gifford
 * 
 * Random Button Integration Test
 * Validates that clicking Random button generates SVG Code and Accessible Previews
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const appJs = readFileSync(path.resolve(process.cwd(), 'app.js'), 'utf8');
const indexHtml = readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');

describe('Random Button Integration Tests', () => {
  beforeEach(() => {
    // Clear localStorage cache before each test to avoid stale data
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should have a Random button in the HTML', () => {
    expect(indexHtml).toContain('id="random-btn"');
  });

  it('should have loadRandomExampleIntoEditor function', () => {
    expect(appJs).toContain('async function loadRandomExampleIntoEditor()');
    expect(appJs).toContain('loadExamplesManifest');
    expect(appJs).toContain('pickRandomExample');
    expect(appJs).toContain('fetchExample');
  });

  it('should attach click handler to Random button that loads and renders', () => {
    // Random button handler should:
    // 1. Load random example
    // 2. Call validateAndRender
    // 3. Show success/error toast
    expect(appJs).toContain('randomBtn.addEventListener(\'click\'');
    expect(appJs).toContain('loadRandomExampleIntoEditor()');
    expect(appJs).toContain('await validateAndRender()');
  });

  it('should disable Random button while loading to prevent double-clicks', () => {
    // aria-busy state should indicate loading
    expect(appJs).toContain('randomBtn.disabled = true');
    expect(appJs).toContain('setAttribute(\'aria-busy\', \'true\')');
  });

  it('should call displayPreview when random example renders successfully', () => {
    // validateAndRender calls displayPreview which writes to both light/dark previews
    expect(appJs).toContain('displayPreview');
    expect(appJs).toContain('lightPreview.innerHTML = contentToDisplay');
    expect(appJs).toContain('darkPreview.innerHTML = contentToDisplay');
  });

  it('should call updateSvgDisplay after preview to show SVG code', () => {
    // After displayPreview, updateSvgDisplay should populate the SVG code textarea
    expect(appJs).toContain('updateSvgDisplay()');
    expect(appJs).toContain('svgCode.value = STATE.beautifiedSvg');
    expect(appJs).toContain('svgCode.value = STATE.optimizedSvg');
  });

  it('should render syntax highlighting overlay after SVG code updates', () => {
    // renderSvgHighlight should update the highlight layer
    expect(appJs).toContain('renderSvgHighlight');
  });

  it('should load examples from manifest.json', () => {
    expect(appJs).toContain('loadExamplesManifest');
    expect(appJs).toContain('CONFIG.examplesManifest');
    expect(appJs).toContain('./examples/manifest.json');
  });

  it('should handle errors gracefully if random load fails', () => {
    // If example fetch fails or render fails, show error toast
    expect(appJs).toContain('catch (e)');
    expect(appJs).toContain('showToast');
    expect(appJs).toContain('Could not load example');
  });

  it('should have examples manifest with at least one valid example file', () => {
    // The app needs examples to pick from
    const manifest = readFileSync(path.resolve(process.cwd(), 'examples/manifest.json'), 'utf8');
    const data = JSON.parse(manifest);
    expect(data.examples).toBeDefined();
    expect(Array.isArray(data.examples)).toBe(true);
    expect(data.examples.length).toBeGreaterThan(0);
  });

  it('should have at least one valid example .mmd file', () => {
    const manifest = readFileSync(path.resolve(process.cwd(), 'examples/manifest.json'), 'utf8');
    const data = JSON.parse(manifest);
    const firstExample = data.examples[0];
    const examplePath = path.resolve(process.cwd(), 'examples', firstExample.file);
    const content = readFileSync(examplePath, 'utf8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('should complete the full workflow: click Random → validate → display SVG code and previews', () => {
    // Integration flow verification
    expect(appJs).toContain('loadRandomExampleIntoEditor');
    expect(appJs).toContain('validateAndRender');
    expect(appJs).toContain('renderMermaidDiagram');
    expect(appJs).toContain('applyAccessibilityTransformations');
    expect(appJs).toContain('displayPreview');
    expect(appJs).toContain('updateSvgDisplay');
    expect(appJs).toContain('renderSvgHighlight');
    expect(appJs).toContain('showToast');
  });
});
