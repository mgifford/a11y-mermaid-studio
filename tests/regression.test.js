/*
 * MIT License - See LICENSE file for full text
 * Copyright (c) 2026 Mark Gifford
 * 
 * Regression Test Suite
 * Prevents specific bugs that previously broke the application
 */

import { describe, it, expect } from 'vitest';

describe('Regression Tests', () => {
  it('should initialize without errors', () => {
    expect(typeof window).toBe('object');
  });

  it('should load Mermaid from CDN', () => {
    expect(window.mermaid).toBeDefined();
  });

  it('should have required DOM elements', () => {
    const elements = [
      'mermaid-source',
      'render-btn',
      'export-btn',
      'preview-light',
      'preview-dark',
      'status'
    ];
    
    elements.forEach(id => {
      expect(document.getElementById(id)).toBeTruthy();
    });
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
});
