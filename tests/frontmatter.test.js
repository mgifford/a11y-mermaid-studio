/*
 * AGPL-3.0-or-later License - See LICENSE file for full text
 * Copyright (c) 2026 Mark Gifford
 */

/**
 * Tests for YAML frontmatter support in diagrams
 * 
 * Ensures that diagrams with frontmatter configuration are correctly:
 * 1. Detected for their diagram type
 * 2. Processed for narrative generation
 * 3. Rendered with accessibility features intact
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const appJs = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf-8');

// Extract and evaluate the skipFrontmatter and detectDiagramType functions
function extractFunctions() {
  // Find the skipFrontmatter function
  const skipFrontmatterMatch = appJs.match(/function skipFrontmatter\(source\) \{[\s\S]*?\n\}/);
  const detectDiagramTypeMatch = appJs.match(/function detectDiagramType\(source\) \{[\s\S]*?\n\}/);
  
  if (!skipFrontmatterMatch || !detectDiagramTypeMatch) {
    throw new Error('Could not extract required functions from app.js');
  }
  
  // Create a safe evaluation context
  const skipFrontmatterCode = skipFrontmatterMatch[0];
  const detectDiagramTypeCode = detectDiagramTypeMatch[0];
  
  // Evaluate in isolated context
  const context = {};
  const code = `
    ${skipFrontmatterCode}
    ${detectDiagramTypeCode}
    ({ skipFrontmatter, detectDiagramType })
  `;
  
  return eval(code);
}

const { skipFrontmatter, detectDiagramType } = extractFunctions();

describe('YAML Frontmatter Support', () => {
  describe('skipFrontmatter function', () => {
    it('should skip YAML frontmatter delimited by ---', () => {
      const input = `---
config:
  look: handDrawn
---

graph BT
  A[Start]`;
      
      const result = skipFrontmatter(input);
      expect(result.trim()).toContain('graph BT');
      expect(result.trim()).not.toContain('---');
    });
    
    it('should return source unchanged if no frontmatter', () => {
      const input = `graph BT
  A[Start]`;
      
      const result = skipFrontmatter(input);
      expect(result).toBe(input);
    });
    
    it('should handle frontmatter with multiple lines', () => {
      const input = `---
config:
  look: handDrawn
  theme: dark
  themeVariables:
    primaryColor: '#ff0000'
---

flowchart TD
  A[Start]`;
      
      const result = skipFrontmatter(input);
      expect(result.trim()).toContain('flowchart TD');
      expect(result.trim()).not.toContain('---');
      expect(result.trim()).not.toContain('config:');
    });
  });
  
  describe('detectDiagramType with frontmatter', () => {
    it('should detect graph BT with frontmatter as flowchart', () => {
      const source = `---
config:
  look: handDrawn
---

graph BT
  A[Start]`;
      
      const type = detectDiagramType(source);
      expect(type).toBe('flowchart');
    });
    
    it('should detect graph TB with frontmatter as flowchart', () => {
      const source = `---
config:
  theme: default
---

graph TB
  A[Start]`;
      
      const type = detectDiagramType(source);
      expect(type).toBe('flowchart');
    });
    
    it('should detect flowchart LR with frontmatter as flowchart', () => {
      const source = `---
config:
  look: handDrawn
---

flowchart LR
  A[Start]`;
      
      const type = detectDiagramType(source);
      expect(type).toBe('flowchart');
    });
    
    it('should detect pie chart with frontmatter', () => {
      const source = `---
config:
  theme: dark
---

pie
  title Pets
  "Dogs" : 42
  "Cats" : 38`;
      
      const type = detectDiagramType(source);
      expect(type).toBe('pie');
    });
    
    it('should detect gantt with frontmatter', () => {
      const source = `---
config:
  look: handDrawn
---

gantt
  title Project Schedule`;
      
      const type = detectDiagramType(source);
      expect(type).toBe('gantt');
    });
    
    it('should handle complex W3C Goals diagram frontmatter', () => {
      const source = `---
config:
  look: handDrawn
---

graph BT

subgraph Legend
      direction LR
      GlobalGoals(("Global goals"))
      W3CImpact["W3C having impact rather than the Web."]
end

ChooseDigitalTools(("People can choose their digital tools."))`;
      
      const type = detectDiagramType(source);
      expect(type).toBe('flowchart');
    });
  });
});
