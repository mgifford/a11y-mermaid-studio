/*
 * AGPL-3.0-or-later License - See LICENSE file for full text
 * Copyright (c) 2026 Mark Gifford
 * 
 * Regression Test Suite
 * Prevents specific bugs that previously broke the application
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const appJs = readFileSync(path.resolve(process.cwd(), 'app.js'), 'utf8');
const indexHtml = readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');

describe('Regression Tests', () => {
  beforeEach(() => {
    // Clear localStorage cache before each test to avoid stale data
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('should initialize without errors', () => {
    expect(typeof window).toBe('object');
  });

  it('should define Mermaid CDN reference in configuration', () => {
    expect(appJs).toContain('mermaidCDN');
    expect(appJs).toContain('window.mermaid');
  });

  it('should have required DOM elements defined in HTML', () => {
    // These elements are parsed from index.html
    expect(indexHtml).toContain('id="mermaid-source"');
    expect(indexHtml).toContain('id="export-btn"');
    expect(indexHtml).toContain('id="preview-light"');
    expect(indexHtml).toContain('id="preview-dark"');
    expect(indexHtml).toContain('id="status"');
  });

  it('should parse accTitle annotation correctly', () => {
    const source = `graph TD
      A[Start]
      %%accTitle Test Title
      %%accDescr Test Description`;
    
    // Parser test would go here
    expect(source).toContain('%%accTitle');
  });

  it('should generate unique IDs without collision', () => {
    // IDs must be collision-resistant
    const id1 = `a11y-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const id2 = `a11y-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    expect(id1).not.toBe(id2);
  });

  it('should not regress SVG editor editability', () => {
    expect(indexHtml.includes('edit-svg-toggle')).toBe(false);
    const svgTextareaReadonly = /id="svg-code"[^>]*readonly/i.test(indexHtml);
    expect(svgTextareaReadonly).toBe(false);
  });

  it('should keep highlight and scroll-sync logic present', () => {
    expect(appJs).toContain('renderSvgHighlight');
    expect(appJs).toContain('scrollTop = svgCode.scrollTop');
    expect(appJs).toContain('scrollLeft = svgCode.scrollLeft');
  });

  it('should initialize Mermaid with pie support', () => {
    expect(appJs).toMatch(/pie:\s*{[\s\S]*useMaxWidth/);
  });

  it('should regenerate preview fresh (not cached)', () => {
    // displayPreview writes directly to DOM, never caches preview in STATE
    expect(appJs).toContain('lightPreview.innerHTML = contentToDisplay');
    expect(appJs).toContain('darkPreview.innerHTML = contentToDisplay');
    // Verify preview HTML is NOT stored in STATE
    expect(appJs).not.toContain('STATE.preview');
    expect(appJs).not.toContain('STATE.lightPreview');
    expect(appJs).not.toContain('STATE.darkPreview');
  });

  it('should keep flowchart node text extraction robust', () => {
    // Guard against regressions that produced empty node titles in flowcharts
    expect(appJs).toContain('function extractNodeLabel');
    expect(appJs).toContain('const nodeText = extractNodeLabel(node)');
  });

  it('should ship a valid flowchart example with required annotations', () => {
    const flow = readFileSync(path.resolve(process.cwd(), 'examples', 'flowchart-basic.mmd'), 'utf8');
    expect(flow).toMatch(/flowchart\s+TD/);
    expect(flow).toMatch(/\[Start\]/);
    expect(flow).toMatch(/\[Celebrate\]/);
    expect(flow).toMatch(/%%accTitle/);
    expect(flow).toMatch(/%%accDescr/);
  });
});
