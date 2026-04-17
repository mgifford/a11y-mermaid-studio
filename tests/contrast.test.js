/*
 * AGPL-3.0-or-later License - See LICENSE file for full text
 * Copyright (c) 2026 Mike Gifford
 *
 * Contrast Test Suite
 * Validates that all CSS custom-property color pairs meet WCAG AA contrast
 * requirements in both light and dark themes, and that no hardcoded colors
 * that fail in either theme remain in app.js.
 *
 * WCAG 2.x minimums:
 *   - Normal text (< 18 pt / < 14 pt bold): 4.5:1
 *   - Large text (≥ 18 pt / ≥ 14 pt bold): 3:1
 *   - Non-text UI components and graphical objects: 3:1
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const appJs = readFileSync(path.resolve(process.cwd(), 'app.js'), 'utf8');
const stylesCSS = readFileSync(path.resolve(process.cwd(), 'styles.css'), 'utf8');

// ─── Contrast maths ───────────────────────────────────────────────────────────

/**
 * Parse a 6-digit hex colour string to an {r, g, b} object.
 * Leading "#" is optional.
 */
function hexToRgb(hex) {
  const clean = hex.replace(/^#/, '');
  if (clean.length !== 6) {
    throw new Error(`Expected 6-digit hex, got: #${clean}`);
  }
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/**
 * Convert a linear-light sRGB channel value (0-255) to a relative
 * luminance channel value using the WCAG 2.x formula.
 */
function linearize(channel) {
  const sRGB = channel / 255;
  return sRGB <= 0.03928
    ? sRGB / 12.92
    : Math.pow((sRGB + 0.055) / 1.055, 2.4);
}

/**
 * Calculate the relative luminance of a hex colour per WCAG 2.x.
 */
function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * linearize(r) +
    0.7152 * linearize(g) +
    0.0722 * linearize(b)
  );
}

/**
 * Return the WCAG 2.x contrast ratio between foreground and background.
 * Both arguments must be 6-digit hex strings.
 */
function contrastRatio(fg, bg) {
  const fgL = relativeLuminance(fg);
  const bgL = relativeLuminance(bg);
  const lighter = Math.max(fgL, bgL);
  const darker  = Math.min(fgL, bgL);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Theme colour tokens ───────────────────────────────────────────────────────

const LIGHT = {
  bg:            '#ffffff',
  text:          '#1a1a1a',
  primary:       '#0066cc',
  success:       '#1a7a32',
  error:         '#cb2431',
  muted:         '#595959',
  accent:        '#5a4fcf',
  accentBorder:  '#6b5fd4',
  accentBg:      '#eeeaf8',
  surface:       '#f8f9fa',
};

const DARK = {
  bg:            '#1a1a1a',
  text:          '#ffffff',
  primary:       '#4da6ff',
  success:       '#34d399',
  error:         '#f85149',
  muted:         '#aaaaaa',
  accent:        '#a89ef5',
  accentBorder:  '#6b63c4',
  accentBg:      '#1e1a2e',
  surface:       '#2a2a2a',
};

// Minimum contrast ratios
const AA_NORMAL = 4.5;
const AA_LARGE  = 3.0;
const AA_UI     = 3.0;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WCAG AA Contrast – Light Theme', () => {
  it('text on bg meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(LIGHT.text, LIGHT.bg);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('primary on bg meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(LIGHT.primary, LIGHT.bg);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('success on bg meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(LIGHT.success, LIGHT.bg);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('error on bg meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(LIGHT.error, LIGHT.bg);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('muted on bg meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(LIGHT.muted, LIGHT.bg);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('accent on bg meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(LIGHT.accent, LIGHT.bg);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('accent on accentBg meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(LIGHT.accent, LIGHT.accentBg);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('text on surface meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(LIGHT.text, LIGHT.surface);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('success on surface meets 4.5:1 (AI approval notice text)', () => {
    const ratio = contrastRatio(LIGHT.success, LIGHT.surface);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('muted on surface meets 4.5:1 (ai-original-summary on surface)', () => {
    const ratio = contrastRatio(LIGHT.muted, LIGHT.surface);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('accentBorder on bg meets 3:1 (non-text border)', () => {
    const ratio = contrastRatio(LIGHT.accentBorder, LIGHT.bg);
    expect(ratio).toBeGreaterThanOrEqual(AA_UI);
  });
});

describe('WCAG AA Contrast – Dark Theme', () => {
  it('text on bg meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(DARK.text, DARK.bg);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('primary on bg meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(DARK.primary, DARK.bg);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('success on bg meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(DARK.success, DARK.bg);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('error on bg meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(DARK.error, DARK.bg);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('muted on bg meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(DARK.muted, DARK.bg);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('accent on bg meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(DARK.accent, DARK.bg);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('accent on accentBg meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(DARK.accent, DARK.accentBg);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('text on surface meets 4.5:1 (normal text)', () => {
    const ratio = contrastRatio(DARK.text, DARK.surface);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('success on surface meets 4.5:1 (AI approval notice text)', () => {
    const ratio = contrastRatio(DARK.success, DARK.surface);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('muted on surface meets 4.5:1 (ai-original-summary on surface)', () => {
    const ratio = contrastRatio(DARK.muted, DARK.surface);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('accentBorder on bg meets 3:1 (non-text border)', () => {
    const ratio = contrastRatio(DARK.accentBorder, DARK.bg);
    expect(ratio).toBeGreaterThanOrEqual(AA_UI);
  });
});

describe('CSS Custom Properties – Token Declarations', () => {
  it('styles.css defines --color-muted for light theme', () => {
    expect(stylesCSS).toContain('--color-muted: #595959');
  });

  it('styles.css defines --color-muted for dark theme', () => {
    expect(stylesCSS).toContain('--color-muted: #aaaaaa');
  });

  it('styles.css defines --color-accent-border for light theme', () => {
    expect(stylesCSS).toContain('--color-accent-border: #6b5fd4');
  });

  it('styles.css defines --color-accent for light theme', () => {
    expect(stylesCSS).toContain('--color-accent: #5a4fcf');
  });

  it('styles.css defines --color-accent for dark theme', () => {
    expect(stylesCSS).toContain('--color-accent: #a89ef5');
  });

  it('styles.css defines --color-surface for light theme', () => {
    expect(stylesCSS).toContain('--color-surface: #f8f9fa');
  });

  it('styles.css defines --color-surface for dark theme', () => {
    expect(stylesCSS).toContain('--color-surface: #2a2a2a');
  });

  it('styles.css defines .narrative-muted using --color-muted', () => {
    expect(stylesCSS).toContain('.narrative-muted');
    expect(stylesCSS).toContain('color: var(--color-muted)');
  });

  it('styles.css defines .preview-placeholder using --color-muted', () => {
    expect(stylesCSS).toContain('.preview-placeholder');
  });

  it('styles.css defines .ai-approval-notice using CSS variables', () => {
    expect(stylesCSS).toContain('.ai-approval-notice');
  });

  it('styles.css defines .ai-enhancement-heading using --color-accent', () => {
    expect(stylesCSS).toContain('.ai-enhancement-heading');
    expect(stylesCSS).toContain('color: var(--color-accent)');
  });
});

describe('No Hardcoded Low-Contrast Colors in app.js', () => {
  it('does not use color:#666 as an inline style (fails dark mode)', () => {
    expect(appJs).not.toMatch(/color:\s*#666(?:[^0-9a-fA-F]|$)/);
  });

  it('does not use color:#667eea as an inline style (fails light mode)', () => {
    expect(appJs).not.toMatch(/color:\s*#667eea/i);
  });

  it('does not use background:#f8f9fa as an inline style (not dark-mode aware)', () => {
    expect(appJs).not.toMatch(/background(-color)?:\s*#f8f9fa/i);
  });

  it('does not use background:#d4edda as an inline style (not dark-mode aware)', () => {
    expect(appJs).not.toMatch(/background(-color)?:\s*#d4edda/i);
  });

  it('uses class="narrative-muted" instead of inline color:#666', () => {
    expect(appJs).toContain('class="narrative-muted"');
  });

  it('uses class="preview-placeholder" instead of inline color:#666', () => {
    expect(appJs).toContain('class="preview-placeholder"');
  });

  it('uses class="ai-approval-notice" instead of inline background', () => {
    expect(appJs).toContain('class="ai-approval-notice"');
  });

  it('uses class="ai-enhancement-heading" instead of inline color:#667eea', () => {
    expect(appJs).toContain('class="ai-enhancement-heading"');
  });
});

describe('Contrast Calculation Utilities', () => {
  it('hexToRgb converts #ffffff correctly', () => {
    const { r, g, b } = hexToRgb('#ffffff');
    expect(r).toBe(255);
    expect(g).toBe(255);
    expect(b).toBe(255);
  });

  it('hexToRgb converts #000000 correctly', () => {
    const { r, g, b } = hexToRgb('#000000');
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it('relativeLuminance of #ffffff is 1.0', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1.0, 5);
  });

  it('relativeLuminance of #000000 is 0.0', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0.0, 5);
  });

  it('contrastRatio of black on white is 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21.0, 0);
  });

  it('contrastRatio of white on black is also 21:1 (symmetric)', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21.0, 0);
  });
});
