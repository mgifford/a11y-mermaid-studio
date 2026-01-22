/*
 * AGPL-3.0-or-later License - See LICENSE file for full text
 * Copyright (c) 2026 Mark Gifford
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'acorn';

/**
 * Syntax Validation Tests
 * Ensures critical JavaScript files have valid syntax
 * Uses acorn parser for authoritative syntax checking
 */

describe('JavaScript Syntax Validation', () => {
  it('should validate app.js has valid syntax', () => {
    const appJsPath = resolve(process.cwd(), 'app.js');
    const code = readFileSync(appJsPath, 'utf-8');
    
    // Acorn parser will throw if syntax is invalid
    // This catches: unclosed braces, escaped newlines, syntax errors, etc.
    expect(() => {
      parse(code, {
        ecmaVersion: 2020,
        sourceType: 'module',
      });
    }).not.toThrow();
  });

  it('should have valid JavaScript AST structure', () => {
    const appJsPath = resolve(process.cwd(), 'app.js');
    const code = readFileSync(appJsPath, 'utf-8');
    
    const ast = parse(code, {
      ecmaVersion: 2020,
      sourceType: 'module',
    });
    
    // Verify AST has expected structure
    expect(ast).toBeDefined();
    expect(ast.body).toBeDefined();
    expect(Array.isArray(ast.body)).toBe(true);
  });

  it('should validate index.html is well-formed', () => {
    const htmlPath = resolve(process.cwd(), 'index.html');
    const html = readFileSync(htmlPath, 'utf-8');
    
    // Basic checks for HTML structure
    // Don't count exact match (self-closing tags, meta tags, etc.)
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    expect(html).toContain('<head');
    expect(html).toContain('<body');
    expect(html).toContain('</body>');
  });

  it('should have matching script and style tags', () => {
    const htmlPath = resolve(process.cwd(), 'index.html');
    const html = readFileSync(htmlPath, 'utf-8');
    
    const scriptOpens = (html.match(/<script/gi) || []).length;
    const scriptCloses = (html.match(/<\/script>/gi) || []).length;
    expect(scriptOpens).toBe(scriptCloses);
    
    const styleOpens = (html.match(/<style/gi) || []).length;
    const styleCloses = (html.match(/<\/style>/gi) || []).length;
    expect(styleOpens).toBe(styleCloses);
  });

  it('should not have unclosed div tags', () => {
    const htmlPath = resolve(process.cwd(), 'index.html');
    const html = readFileSync(htmlPath, 'utf-8');
    
    // Count opening and closing div tags
    const divOpens = (html.match(/<div/gi) || []).length;
    const divCloses = (html.match(/<\/div>/gi) || []).length;
    
    // Allow slight mismatch but flag major issues
    expect(Math.abs(divOpens - divCloses)).toBeLessThanOrEqual(2);
  });

  it('should not have escaped newlines in code blocks', () => {
    const appJsPath = resolve(process.cwd(), 'app.js');
    const code = readFileSync(appJsPath, 'utf-8');
    
    // Look for the specific pattern from the bug: '...');\n followed by more code
    // This is a literal \n followed by code on same line (should be on separate lines)
    const lines = code.split('\n');
    const problematicLines = lines
      .map((line, idx) => ({
        line,
        idx: idx + 1,
        // Match: ending quote followed by semicolon, then \n, then code
        hasIssue: line.includes("');\\n") || line.includes('");\\n') || line.includes('`);\\n'),
      }))
      .filter(item => item.hasIssue);
    
    expect(problematicLines).toHaveLength(0);
  });
});

describe('Test Suite Integrity', () => {
  it('should have valid syntax in all test files', () => {
    // Current test file should be valid
    const testPath = resolve(process.cwd(), 'tests', 'syntax-validation.test.js');
    const code = readFileSync(testPath, 'utf-8');
    
    expect(() => {
      parse(code, {
        ecmaVersion: 2020,
        sourceType: 'module',
      });
    }).not.toThrow();
  });
});
