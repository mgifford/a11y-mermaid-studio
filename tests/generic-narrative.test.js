/*
 * AGPL-3.0-or-later License - See LICENSE file for full text
 * Copyright (c) 2026 Mike Gifford
 */

/**
 * Tests for generic narrative fallback for unsupported diagram types
 * 
 * Ensures that diagrams without specific narrative generators still receive
 * a meaningful structural description rather than just "This is a X diagram."
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const appJs = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf-8');

// Extract the functions we need
function extractFunctions() {
  const skipFrontmatterMatch = appJs.match(/function skipFrontmatter\(source\) \{[\s\S]*?\n\}/);
  const detectDiagramTypeMatch = appJs.match(/function detectDiagramType\(source\) \{[\s\S]*?(?=\n\nfunction)/);
  const generateGenericNarrativeMatch = appJs.match(/function generateGenericNarrative\(source, diagramType\) \{[\s\S]*?(?=\n\nfunction)/);
  
  if (!skipFrontmatterMatch || !detectDiagramTypeMatch || !generateGenericNarrativeMatch) {
    throw new Error('Could not extract required functions from app.js');
  }
  
  // Helper function for HTML escaping
  const escapeHtmlCode = `
    function escapeHtml(unsafe) {
      return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  `;
  
  const code = `
    ${escapeHtmlCode}
    ${skipFrontmatterMatch[0]}
    ${detectDiagramTypeMatch[0]}
    ${generateGenericNarrativeMatch[0]}
    ({ skipFrontmatter, detectDiagramType, generateGenericNarrative })
  `;
  
  return eval(code);
}

const { detectDiagramType, generateGenericNarrative } = extractFunctions();

describe('Generic Narrative Fallback', () => {
  describe('Diagram type detection for all types', () => {
    it('should detect sequenceDiagram', () => {
      const source = `sequenceDiagram
        Alice->>Bob: Hello`;
      expect(detectDiagramType(source)).toBe('sequenceDiagram');
    });
    
    it('should detect stateDiagram', () => {
      const source = `stateDiagram-v2
        [*] --> State1`;
      expect(detectDiagramType(source)).toBe('stateDiagram');
    });
    
    it('should detect erDiagram', () => {
      const source = `erDiagram
        CUSTOMER ||--o{ ORDER : places`;
      expect(detectDiagramType(source)).toBe('erDiagram');
    });
    
    it('should detect gitGraph', () => {
      const source = `gitGraph
        commit`;
      expect(detectDiagramType(source)).toBe('gitGraph');
    });
    
    it('should detect sankey', () => {
      const source = `sankey-beta
        A,B,10`;
      expect(detectDiagramType(source)).toBe('sankey');
    });
    
    it('should detect kanban', () => {
      const source = `kanban
        Todo
          Task 1`;
      expect(detectDiagramType(source)).toBe('kanban');
    });
    
    it('should detect C4 diagrams', () => {
      expect(detectDiagramType('C4Context\n  title System')).toBe('c4');
      expect(detectDiagramType('C4Container\n  Container(a, "A")')).toBe('c4');
      expect(detectDiagramType('C4Component\n  Component(a, "A")')).toBe('c4');
    });
  });
  
  describe('Generic narrative generation', () => {
    it('should generate structural narrative for sequence diagrams', () => {
      const source = `sequenceDiagram
        participant Alice
        participant Bob
        Alice->>Bob: Hello Bob
        Bob-->>Alice: Hello Alice`;
      
      const narrative = generateGenericNarrative(source, 'sequenceDiagram');
      
      expect(narrative).toContain('sequenceDiagram');
      expect(narrative).toContain('Structure:');
      expect(narrative).toContain('does not yet have a detailed narrative generator');
    });
    
    it('should count nodes in generic narrative', () => {
      const source = `stateDiagram-v2
        State1
        State2
        State3`;
      
      const narrative = generateGenericNarrative(source, 'stateDiagram');
      
      // Should detect lines of content
      expect(narrative).toContain('line');
    });
    
    it('should count connections in generic narrative', () => {
      const source = `stateDiagram-v2
        [*] --> State1
        State1 --> State2
        State2 --> [*]`;
      
      const narrative = generateGenericNarrative(source, 'stateDiagram');
      
      expect(narrative).toContain('connection');
    });
    
    it('should handle diagrams with sections', () => {
      const source = `kanban
        section Todo
          Task 1
        section In Progress
          Task 2`;
      
      const narrative = generateGenericNarrative(source, 'kanban');
      
      expect(narrative).toContain('section');
    });
    
    it('should provide helpful accessibility note', () => {
      const source = `gitGraph
        commit
        branch develop
        commit`;
      
      const narrative = generateGenericNarrative(source, 'gitGraph');
      
      expect(narrative).toContain('accessibility attributes');
      expect(narrative).toContain('title, description, role');
    });
    
    it('should handle unknown diagram types gracefully', () => {
      const source = `unknownType
        some content
        more content`;
      
      const narrative = generateGenericNarrative(source, 'unknown');
      
      expect(narrative).toContain('unknown');
      expect(narrative).toContain('Structure:');
    });
    
    it('should skip frontmatter in generic narratives', () => {
      const source = `---
config:
  theme: dark
---

sequenceDiagram
  Alice->>Bob: Test`;
      
      const narrative = generateGenericNarrative(source, 'sequenceDiagram');
      
      expect(narrative).not.toContain('config');
      expect(narrative).not.toContain('theme');
    });
  });
});
