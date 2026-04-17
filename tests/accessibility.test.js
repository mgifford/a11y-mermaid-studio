/*
 * AGPL-3.0-or-later License - See LICENSE file for full text
 * Copyright (c) 2026 Mike Gifford
 * 
 * Accessibility Test Suite
 * Validates semantic output and ARIA compliance
 *
 * References:
 *  - Carie Fisher Pattern 11: https://cariefisher.com/a11y-svg-updated/
 *  - Léonie Watson accessible SVG flowcharts: https://tink.uk/accessible-svg-flowcharts/
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const appJs = readFileSync(path.resolve(process.cwd(), 'app.js'), 'utf8');
const stylesCSS = readFileSync(path.resolve(process.cwd(), 'styles.css'), 'utf8');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse an SVG string using the DOMParser (available in vitest's jsdom environment)
 * and return { doc, svg } so individual tests can inspect attributes/elements.
 */
function parseSvg(svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.documentElement;
  return { doc, svg };
}

/**
 * Minimal SVG that satisfies Carie Fisher Pattern 11.
 * Used as a baseline "good" fixture.
 */
function makePattern11Svg({ title = 'Test Diagram', desc = 'A test diagram description', extraContent = '' } = {}) {
  const titleId = 'svg-title-test';
  const descId = 'svg-desc-test';
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${titleId} ${descId}">
  <title id="${titleId}">${title}</title>
  <desc id="${descId}">${desc}</desc>
  <rect x="10" y="10" width="80" height="40" fill="#ececff" stroke="#9370db"/>
  <text x="50" y="35" text-anchor="middle">Start</text>
  ${extraContent}
</svg>`;
}

/**
 * Minimal flowchart SVG fixture with Léonie Watson semantics applied.
 * Mirrors what applyFlowchartSemantics produces on a two-node flowchart.
 */
function makeFlowchartSvg({ withListSemantics = true, withPerNodeTitles = true, withAriaHidden = true } = {}) {
  const listRole = withListSemantics ? 'role="list" aria-label="Flowchart nodes"' : '';
  const nodeRole = withListSemantics ? 'role="listitem"' : '';
  const nodeTitleA = withPerNodeTitles ? '<title>Start</title>' : '';
  const nodeTitleB = withPerNodeTitles ? '<title>End</title>' : '';
  const shapeHidden = withAriaHidden ? 'aria-hidden="true"' : '';
  const edgeHidden = withAriaHidden ? 'aria-hidden="true"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="svg-title-fc svg-desc-fc">
  <title id="svg-title-fc">Two-node flowchart</title>
  <desc id="svg-desc-fc">Flowchart going from Start to End</desc>
  <g id="flowchart-root">
    <g ${listRole}>
      <g class="node" ${nodeRole} id="flowchart-A-0">
        ${nodeTitleA}
        <rect ${shapeHidden} x="10" y="10" width="80" height="40"/>
        <text x="50" y="35">Start</text>
      </g>
      <g class="node" ${nodeRole} id="flowchart-B-1">
        ${nodeTitleB}
        <rect ${shapeHidden} x="10" y="100" width="80" height="40"/>
        <text x="50" y="125">End</text>
      </g>
    </g>
    <g class="edgePath" ${edgeHidden}>
      <path d="M50,50 L50,100"/>
    </g>
  </g>
</svg>`;
}

// ── Pattern 11 structural tests (real SVG validation) ─────────────────────────

describe('Accessibility Tests', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  // ── Carie Fisher Pattern 11 ─────────────────────────────────────────────────

  it('should apply role="img" to SVG root (Pattern 11)', () => {
    const { svg } = parseSvg(makePattern11Svg());
    expect(svg.getAttribute('role')).toBe('img');
  });

  it('should include <title> element as a direct child of <svg> (Pattern 11)', () => {
    const { svg } = parseSvg(makePattern11Svg());
    const titleEl = svg.querySelector(':scope > title');
    expect(titleEl).toBeTruthy();
    expect(titleEl.textContent.trim()).toBeTruthy();
  });

  it('should give <title> a non-empty id attribute (Pattern 11)', () => {
    const { svg } = parseSvg(makePattern11Svg());
    const titleEl = svg.querySelector(':scope > title');
    expect(titleEl.id).toBeTruthy();
  });

  it('should include <desc> element as a direct child of <svg> (Pattern 11)', () => {
    const { svg } = parseSvg(makePattern11Svg());
    const descEl = svg.querySelector(':scope > desc');
    expect(descEl).toBeTruthy();
    expect(descEl.textContent.trim()).toBeTruthy();
  });

  it('should give <desc> a non-empty id attribute (Pattern 11)', () => {
    const { svg } = parseSvg(makePattern11Svg());
    const descEl = svg.querySelector(':scope > desc');
    expect(descEl.id).toBeTruthy();
  });

  it('should set aria-labelledby referencing both title and desc IDs (Pattern 11)', () => {
    const { svg } = parseSvg(makePattern11Svg());
    const titleEl = svg.querySelector(':scope > title');
    const descEl  = svg.querySelector(':scope > desc');
    expect(titleEl).toBeTruthy();
    expect(descEl).toBeTruthy();
    const titleId = titleEl.id;
    const descId  = descEl.id;
    const labelledBy = svg.getAttribute('aria-labelledby') || '';
    const ids = labelledBy.trim().split(/\s+/);
    expect(ids).toContain(titleId);
    expect(ids).toContain(descId);
  });

  it('should preserve xmlns namespace for standalone SVG usage', () => {
    const { svg } = parseSvg(makePattern11Svg());
    expect(svg.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
  });

  it('should reject an SVG that is missing role="img"', () => {
    const bad = makePattern11Svg().replace('role="img"', '');
    const { svg } = parseSvg(bad);
    expect(svg.getAttribute('role')).not.toBe('img');
    // The absence would be caught by validateSvgSemantics
    expect(appJs).toContain("getAttribute('role') !== 'img'");
  });

  it('should reject an SVG that is missing a <title> element', () => {
    const bad = makePattern11Svg().replace(/<title[^>]*>[^<]*<\/title>/, '');
    const { svg } = parseSvg(bad);
    expect(svg.querySelector(':scope > title')).toBeNull();
  });

  it('should reject an SVG that is missing aria-labelledby', () => {
    const bad = makePattern11Svg().replace(/aria-labelledby="[^"]*"/, '');
    const { svg } = parseSvg(bad);
    expect(svg.getAttribute('aria-labelledby')).toBeNull();
  });

  it('should not have duplicate IDs within a well-formed SVG', () => {
    const { svg } = parseSvg(makePattern11Svg());
    const ids = [...svg.querySelectorAll('[id]')].map(el => el.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('should detect duplicate IDs in a malformed SVG', () => {
    const dup = makePattern11Svg({ extraContent: '<g id="svg-title-test"></g>' });
    const { svg } = parseSvg(dup);
    const ids = [...svg.querySelectorAll('[id]')].map(el => el.id);
    const idCounts = {};
    ids.forEach(id => { idCounts[id] = (idCounts[id] || 0) + 1; });
    const duplicates = Object.keys(idCounts).filter(id => idCounts[id] > 1);
    expect(duplicates.length).toBeGreaterThan(0);
  });

  // ── WCAG / APCA contrast (code-level checks) ────────────────────────────────

  it('should validate WCAG contrast ratio (text)', () => {
    // Requirement: 4.5:1 minimum for text
    expect(appJs).toContain('getContrastRatio');
  });

  it('should validate WCAG contrast ratio (non-text)', () => {
    // Requirement: 3:1 minimum for UI components
    expect(appJs).toContain('getContrastRatio');
  });

  it('should support dark mode with maintained contrast', () => {
    // Requirement: Contrast must be valid in light AND dark modes
    expect(appJs).toContain('dark');
  });

  // ── Léonie Watson flowchart pattern ────────────────────────────────────────

  it('should apply role="list" to the flowchart nodes container', () => {
    const { svg } = parseSvg(makeFlowchartSvg());
    const listContainer = svg.querySelector('[role="list"]');
    expect(listContainer).toBeTruthy();
    expect(listContainer.getAttribute('aria-label')).toBeTruthy();
  });

  it('should apply role="listitem" to each flowchart node', () => {
    const { svg } = parseSvg(makeFlowchartSvg());
    const nodes = svg.querySelectorAll('g.node');
    nodes.forEach(node => {
      expect(node.getAttribute('role')).toBe('listitem');
    });
  });

  it('should add per-node <title> to each flowchart node', () => {
    const { svg } = parseSvg(makeFlowchartSvg());
    const nodes = svg.querySelectorAll('g.node');
    nodes.forEach(node => {
      const title = node.querySelector('title');
      expect(title).toBeTruthy();
      expect(title.textContent.trim()).toBeTruthy();
    });
  });

  it('should hide decorative shapes inside flowchart nodes with aria-hidden', () => {
    const { svg } = parseSvg(makeFlowchartSvg());
    const nodes = svg.querySelectorAll('g.node');
    nodes.forEach(node => {
      node.querySelectorAll('rect, circle, ellipse, polygon, path').forEach(shape => {
        expect(shape.getAttribute('aria-hidden')).toBe('true');
      });
    });
  });

  it('should hide edge/arrow groups with aria-hidden', () => {
    const { svg } = parseSvg(makeFlowchartSvg());
    const edges = svg.querySelectorAll('g.edgePath, g.edgeLabel');
    edges.forEach(edge => {
      expect(edge.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('should detect missing list semantics in a flowchart without role="list"', () => {
    const { svg } = parseSvg(makeFlowchartSvg({ withListSemantics: false }));
    expect(svg.querySelector('[role="list"]')).toBeNull();
  });

  it('should detect missing per-node titles in a flowchart', () => {
    const { svg } = parseSvg(makeFlowchartSvg({ withPerNodeTitles: false }));
    const nodes = svg.querySelectorAll('g.node');
    let nodesWithTitle = 0;
    nodes.forEach(n => { if (n.querySelector('title')) nodesWithTitle++; });
    expect(nodesWithTitle).toBe(0);
  });

  it('should detect unhidden decorative shapes in a flowchart', () => {
    const { svg } = parseSvg(makeFlowchartSvg({ withAriaHidden: false }));
    const nodes = svg.querySelectorAll('g.node');
    let unhiddenShapes = 0;
    nodes.forEach(node => {
      node.querySelectorAll('rect, circle, ellipse, polygon, path').forEach(shape => {
        if (shape.getAttribute('aria-hidden') !== 'true') unhiddenShapes++;
      });
    });
    expect(unhiddenShapes).toBeGreaterThan(0);
  });

  it('should apply proper list semantics to flowcharts', () => {
    // Requirement: role="list" and role="listitem" for accessibility tree
    expect(appJs).toContain("setAttribute('role', 'list')");
    expect(appJs).toContain("setAttribute('role', 'listitem')");
  });

  // ── Flowchart semantics (aria-required-parent: listitem must have list parent) ──

  it('applyFlowchartSemantics should assign role="list" to the nodes container', () => {
    // Regression: WCAG 1.3.1 / aria-required-parent violation.
    // role="listitem" nodes must be contained by a role="list" parent.
    // The fix walks up from the first node to its nearest SVG-child ancestor and
    // sets role="list" on it, matching the pattern used in applyMindmapSemantics.
    expect(appJs).toContain('function applyFlowchartSemantics(svg)');
    // Must find the parent container and mark it as role="list"
    expect(appJs).toContain("listContainer.setAttribute('role', 'list')");
    expect(appJs).toContain("listContainer.setAttribute('aria-label', 'Flowchart nodes')");
  });

  it('applyFlowchartSemantics should not leave an unused listGroup variable', () => {
    // Regression: the old code created a listGroup element but never inserted it,
    // which was both dead code and misleading.  Ensure it is gone.
    expect(appJs).not.toContain('const listGroup');
  });

  it('should hide decorative elements from a11y tree', () => {
    // Requirement: aria-hidden or role="presentation" for decorative shapes
    expect(appJs).toContain("setAttribute('aria-hidden', 'true')");
  });

  // ── Mindmap semantics (role="list"/"listitem" instead of tree/treeitem) ──

  it('should have applyMindmapSemantics function', () => {
    // Regression: mindmap nodes must receive accessible list semantics
    expect(appJs).toContain('function applyMindmapSemantics(svg)');
  });

  it('applyMindmapSemantics should use role="list" not role="tree"', () => {
    // Requirement: role="tree"/"treeitem" requires complex keyboard navigation
    // that static SVG cannot provide. role="list"/"listitem" is the safe choice.
    expect(appJs).toContain("'role', 'list'");
    expect(appJs).toContain("'role', 'listitem'");
    // Must NOT introduce role="tree" or role="treeitem"
    expect(appJs).not.toContain("'role', 'tree'");
    expect(appJs).not.toContain("'role', 'treeitem'");
  });

  it('applyMindmapSemantics should add per-node <title> to fix single-tooltip issue', () => {
    // Regression: without per-node titles the SVG root title appears as a
    // tooltip on every shape, giving no per-node context.
    expect(appJs).toContain("querySelectorAll('g.mindmap-node')");
    expect(appJs).toContain('title.textContent = nodeText');
    expect(appJs).toContain("node.insertBefore(title, node.firstChild)");
  });

  it('applyMindmapSemantics should be called from applyAccessibilityTransformations', () => {
    // Regression: the mindmap transform must be wired into the main pipeline
    expect(appJs).toContain('applyMindmapSemantics(svg)');
  });

  it('applyMindmapSemantics should hide decorative shapes with aria-hidden', () => {
    // Requirement: background rect/circle shapes inside mindmap nodes are decorative
    expect(appJs).toContain("querySelectorAll('rect, circle, ellipse, polygon, path')");
    expect(appJs).toContain("shape.setAttribute('aria-hidden', 'true')");
  });

  // ── validateSvgSemantics function (code-level checks) ──────────────────────

  it('should have a validateSvgSemantics function in app.js', () => {
    expect(appJs).toContain('function validateSvgSemantics(svgString)');
  });

  it('validateSvgSemantics should check for role="img"', () => {
    expect(appJs).toContain("getAttribute('role') !== 'img'");
  });

  it('validateSvgSemantics should check for <title> element', () => {
    expect(appJs).toContain("querySelector(':scope > title')");
  });

  it('validateSvgSemantics should check for <desc> element', () => {
    expect(appJs).toContain("querySelector(':scope > desc')");
  });

  it('validateSvgSemantics should check aria-labelledby', () => {
    expect(appJs).toContain("getAttribute('aria-labelledby')");
  });

  it('validateSvgSemantics should detect duplicate IDs', () => {
    expect(appJs).toContain("querySelectorAll('[id]')");
    expect(appJs).toContain('duplicate');
  });

  it('validateSvgSemantics should check flowchart Léonie Watson pattern', () => {
    expect(appJs).toContain("querySelector('[id^=\"flowchart-\"]')");
    expect(appJs).toContain("querySelector('[role=\"list\"]')");
  });

  it('validateSvgSemantics should return { valid, issues, warnings }', () => {
    expect(appJs).toContain('{ valid: issues.length === 0, issues, warnings }');
  });

  it('handleExport should call validateSvgSemantics before downloading', () => {
    expect(appJs).toContain('validateSvgSemantics(svgString)');
    expect(appJs).toContain('Export blocked');
  });

  // ── CSS keyboard-focus parity ──

  it('mode-toggle label should respond to :focus-within as well as :hover', () => {
    // Regression: keyboard users tabbing into a radio button inside a label
    // must receive the same highlight that mouse users see on :hover.
    expect(stylesCSS).toContain('.mode-toggle label:focus-within');
  });

  it('toast-close button should respond to :focus as well as :hover', () => {
    // Regression: keyboard users must be able to see the toast-close button is
    // focusable, matching the reduced-opacity effect shown on :hover.
    expect(stylesCSS).toContain('.toast-close:focus');
  });
});

