/*
 * AGPL-3.0-or-later License - See LICENSE file for full text
 * Copyright (c) 2026 Mark Gifford
 */

/**
 * A11y Mermaid Studio
 * Transforms Mermaid diagrams into WCAG 2.2 AA-compliant, accessible SVGs
 * 
 * Core responsibilities:
 * - Load Mermaid source from user input
 * - Render Mermaid diagram as SVG via CDN
 * - Apply accessibility transformations per normative specs
 * - Validate contrast ratios (WCAG + APCA)
 * - Support light/dark mode preview
 * - Export final accessible SVG
 */

// Import xml-formatter for beautification
let xmlFormatter = null;

// Import SVGO for optimization
let SVGO = null;

const CONFIG = {
  mermaidVersion: '10.6.1',
  mermaidCDN: 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js',
  xmlFormatterCDN: 'https://esm.sh/xml-formatter@3.6.0',
  svgoCDN: 'https://esm.sh/svgo@3.2.0/dist/svgo.browser.js',
  examplesManifest: './examples/manifest.json',
};

const STATE = {
  svgMode: 'beautiful', // 'beautiful' or 'optimized'
  currentSvg: '', // Raw SVG from Mermaid
  beautifiedSvg: '', // Formatted version
  optimizedSvg: '', // Optimized version
};

/**
 * Initialize the application
 */
async function initializeApp() {
  console.log('A11y Mermaid Studio initializing...');
  
  try {
    // Load required libraries from CDN
    await Promise.all([
      loadMermaid(),
      loadXmlFormatter(),
      loadSVGO()
    ]);
    console.log('[Init] Libraries loaded successfully');

    // Seed empty highlight layer
    renderSvgHighlight('');
    
    // Set up event listeners
    attachEventListeners();
    setupSplitter();
    initializeThemeToggle();
    console.log('[Init] Event listeners and theme initialized');
    
    // Load any previously saved diagram from localStorage
    restoreLastDiagram();

    // If editor is empty after restore, load a random example automatically
    const sourceInput = document.getElementById('mermaid-source');
    if (sourceInput && !sourceInput.value.trim()) {
      console.log('[Init] Editor empty, loading random example...');
      try {
        await loadRandomExampleIntoEditor();
        console.log('[Init] Example loaded, rendering...');
        // Auto-render after loading example
        const renderOk = await validateAndRender();
        console.log('[Init] validateAndRender returned:', renderOk);
      } catch (e) {
        console.error('[Init] Error loading example:', e);
        showError(`Failed to load example: ${e.message}`);
      }
    } else {
      // Render whatever we restored so the previews are in sync
      console.log('[Init] Content restored, rendering...');
      const renderOk = await validateAndRender();
      console.log('[Init] validateAndRender returned:', renderOk);
    }
    
    console.log('Application ready');
  } catch (error) {
    console.error('[Init] Fatal initialization error:', error);
    showError(`Initialization failed: ${error.message}`);
  }
}

/**
 * Dynamically load Mermaid from CDN
 */
async function loadMermaid() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CONFIG.mermaidCDN;
    script.async = true;
    script.onload = () => {
      // Initialize Mermaid with accessibility-preserving defaults
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        pie: {
          showData: true,
          useMaxWidth: true
        }
      });
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Mermaid'));
    document.head.appendChild(script);
  });
}

/**
 * Dynamically load xml-formatter from CDN
 */
async function loadXmlFormatter() {
  try {
    const module = await import(CONFIG.xmlFormatterCDN);
    xmlFormatter = module.default;
    console.log('xml-formatter loaded');
  } catch (e) {
    console.warn('Failed to load xml-formatter, using fallback:', e);
  }
}

/**
 * Dynamically load SVGO from CDN
 */
async function loadSVGO() {
  try {
    const module = await import(CONFIG.svgoCDN);
    SVGO = module;
    console.log('SVGO loaded');
  } catch (e) {
    console.warn('Failed to load SVGO, using fallback:', e);
  }
}

/**
 * Render Mermaid source to SVG
 */
async function renderMermaidDiagram(mermaidSource) {
  try {
    console.log('[renderMermaid] Starting render, source length:', mermaidSource.length);
    console.log('[renderMermaid] First 100 chars:', mermaidSource.substring(0, 100));
    
    if (!window.mermaid) {
      throw new Error('Mermaid library not loaded');
    }
    
    const { svg } = await window.mermaid.render('mermaid-diagram', mermaidSource);
    console.log('[renderMermaid] Success! SVG length:', svg.length);
    console.log('[renderMermaid] SVG preview:', svg.substring(0, 150) + '...');
    return svg;
  } catch (error) {
    console.error('[renderMermaid] Error:', error);
    throw new Error(`Invalid Mermaid syntax: ${error.message}`);
  }
}

/**
 * Parse and validate Mermaid metadata
 */
function parseMermaidMetadata(mermaidSource) {
  const titleMatch = mermaidSource.match(/%%\s*accTitle\s*(.+)/);
  const descMatch = mermaidSource.match(/%%\s*accDescr\s*(.+)/);
  
  return {
    title: titleMatch ? titleMatch[1].trim() : null,
    description: descMatch ? descMatch[1].trim() : null,
  };
}

/**
 * Generate unique IDs for accessibility elements
 */
function generateUniqueId(prefix = 'a11y') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Apply accessibility transformations to SVG
 * Implements Carie Fisher Pattern 11: <svg> + role="img" + <title> + <desc> + aria-labelledby
 */
function applyAccessibilityTransformations(svgString, metadata) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.documentElement;
  
  // Ensure required root attributes
  svg.setAttribute('role', 'img');
  
  // Generate IDs if not present
  const titleId = generateUniqueId('title');
  const descId = generateUniqueId('desc');
  
  // Remove existing title/desc if present
  const existingTitle = svg.querySelector('title');
  const existingDesc = svg.querySelector('desc');
  if (existingTitle) existingTitle.remove();
  if (existingDesc) existingDesc.remove();
  
  // Create and prepend title element (required by Pattern 11)
  if (metadata.title) {
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.id = titleId;
    title.textContent = metadata.title;
    svg.insertBefore(title, svg.firstChild);
  }
  
  // Create and prepend desc element (required by Pattern 11)
  if (metadata.description) {
    const desc = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
    desc.id = descId;
    desc.textContent = metadata.description;
    svg.insertBefore(desc, svg.querySelector('title')?.nextSibling || svg.firstChild);
  }
  
  // Set aria-labelledby to both title and description (Pattern 11 recommendation)
  if (metadata.title && metadata.description) {
    svg.setAttribute('aria-labelledby', `${titleId} ${descId}`);
  } else if (metadata.title) {
    svg.setAttribute('aria-labelledby', titleId);
  }
  
  // Apply flowchart-specific transformations (Léonie Watson / Ashley Sheridan pattern)
  applyFlowchartSemantics(svg);
  
  // Preserve xmlns namespace for standalone SVG usage
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  
  return new XMLSerializer().serializeToString(doc);
}

/**
 * Ensure the SVG has a viewBox so it renders with visible dimensions
 */
function ensureViewBox(svgString) {
  if (!svgString) return svgString;

  const temp = document.createElement('div');
  temp.style.position = 'absolute';
  temp.style.left = '-9999px';
  temp.style.top = '-9999px';
  temp.innerHTML = svgString;

  const svg = temp.querySelector('svg');
  if (!svg) return svgString;
  if (svg.hasAttribute('viewBox')) return svgString;

  let appended = false;
  try {
    document.body.appendChild(temp);
    appended = true;
    const bbox = svg.getBBox();
    const width = parseFloat(svg.getAttribute('width')) || bbox.width || 300;
    const height = parseFloat(svg.getAttribute('height')) || bbox.height || 150;
    if (width > 0 && height > 0) {
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.removeAttribute('height');
      svg.style.width = '100%';
    }
    return svg.outerHTML;
  } catch (e) {
    console.warn('[ensureViewBox] Failed, returning original SVG', e);
    return svgString;
  } finally {
    if (appended && temp.parentNode) temp.parentNode.removeChild(temp);
  }
}

/**
 * Apply flowchart-specific accessibility semantics
 * Implements Léonie Watson's accessible flowchart pattern:
 * https://tink.uk/accessible-svg-flowcharts/
 * 
 * Key transformations:
 * - Wrap flowchart nodes in role="list" group
 * - Mark each node as role="listitem"
 * - Add <title> to each node with its text content
 * - Hide decorative shapes with aria-hidden="true"
 * - Hide arrows/connectors with aria-hidden="true"
 */
function applyFlowchartSemantics(svg) {
  // Detect if this is a flowchart by checking for Mermaid's flowchart structure
  const flowchartRoot = svg.querySelector('[id^="flowchart-"]');
  if (!flowchartRoot) {
    console.log('[Flowchart] Not a flowchart diagram, skipping flowchart semantics');
    return; // Not a flowchart
  }
  
  console.log('[Flowchart] Detected flowchart, applying semantic transformations');
  
  // Find all node groups (Mermaid uses class "node" for flowchart nodes)
  const nodeGroups = svg.querySelectorAll('g.node');
  
  if (nodeGroups.length === 0) {
    console.log('[Flowchart] No nodes found');
    return;
  }
  
  console.log(`[Flowchart] Found ${nodeGroups.length} nodes`);
  
  // Create a wrapper group with role="list"
  const listGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  listGroup.setAttribute('role', 'list');
  listGroup.setAttribute('aria-label', 'Flowchart nodes');
  
  // Process each node
  nodeGroups.forEach((node, index) => {
    // Add role="listitem" to the node group
    node.setAttribute('role', 'listitem');
    
    // Extract text content from the node
    const textElements = node.querySelectorAll('text');
    let nodeText = '';
    textElements.forEach(textEl => {
      nodeText += textEl.textContent.trim() + ' ';
    });
    nodeText = nodeText.trim();
    
    console.log(`[Flowchart] Node ${index + 1}: "${nodeText}"`);
    
    // Add a <title> element to the node for accessibility
    const existingTitle = node.querySelector('title');
    if (existingTitle) {
      existingTitle.remove();
    }
    
    if (nodeText) {
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = nodeText;
      node.insertBefore(title, node.firstChild);
    }
    
    // Hide decorative shapes (rect, circle, polygon, path within node)
    const shapes = node.querySelectorAll('rect, circle, ellipse, polygon, path');
    shapes.forEach(shape => {
      shape.setAttribute('aria-hidden', 'true');
    });
    
    // Text elements are kept visible to AT unless they're fragmented
    // If text is fragmented across multiple <text> elements, keep only one visible
    if (textElements.length > 1) {
      textElements.forEach((textEl, i) => {
        if (i > 0) {
          textEl.setAttribute('aria-hidden', 'true');
        }
      });
    }
  });
  
  // Hide edge/arrow groups (Mermaid uses class "edgePath" or "edgeLabel")
  const edges = svg.querySelectorAll('g.edgePath, g.edgeLabel, g.edgePaths');
  console.log(`[Flowchart] Found ${edges.length} edges to hide`);
  edges.forEach(edge => {
    edge.setAttribute('aria-hidden', 'true');
  });
  
  // Hide arrow markers
  const markers = svg.querySelectorAll('defs marker');
  markers.forEach(marker => {
    marker.setAttribute('aria-hidden', 'true');
  });
  
  // Note: We're not wrapping nodes in the list group to preserve Mermaid's layout
  // Instead, we're adding role="listitem" directly to existing node groups
  // This is a pragmatic approach that preserves visual layout while adding semantics
}

/**
 * Generate a narrative description of the diagram structure
 * Analyzes Mermaid source and converts it to prose
 */
function generateDiagramNarrative(mermaidSource, metadata) {
  const narrativeDiv = document.getElementById('diagram-narrative');
  if (!narrativeDiv) return;
  
  console.log('[Narrative] Generating narrative for diagram');
  
  // Detect diagram type
  const diagramType = detectDiagramType(mermaidSource);
  console.log('[Narrative] Detected diagram type:', diagramType);
  
  let narrative = '';
  
  // Add title and description if present
  if (metadata.title) {
    narrative += `<h3 style="margin-top: 0;">${escapeHtml(metadata.title)}</h3>\n`;
  }
  if (metadata.description) {
    narrative += `<p><em>${escapeHtml(metadata.description)}</em></p>\n`;
  }
  
  // Generate type-specific narrative
  switch (diagramType) {
    case 'flowchart':
      narrative += generateFlowchartNarrative(mermaidSource);
      break;
    case 'pie':
      narrative += generatePieNarrative(mermaidSource);
      break;
    case 'classDiagram':
      narrative += generateClassDiagramNarrative(mermaidSource);
      break;
    case 'gantt':
      narrative += generateGanttNarrative(mermaidSource);
      break;
    case 'journey':
      narrative += generateUserJourneyNarrative(mermaidSource);
      break;
    case 'mindmap':
      narrative += generateMindmapNarrative(mermaidSource);
      break;
    case 'timeline':
      narrative += generateTimelineNarrative(mermaidSource);
      break;
    case 'xychart':
      narrative += generateXyChartNarrative(mermaidSource);
      break;
    default:
      narrative += `<p>This is a ${diagramType} diagram.</p>`;
  }
  
  narrativeDiv.innerHTML = narrative;
}

/**
 * Detect Mermaid diagram type from source
 */
function detectDiagramType(source) {
  const lines = source.trim().split('\n');
  const firstLine = lines[0].trim();
  
  if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) {
    return 'flowchart';
  } else if (firstLine.startsWith('pie')) {
    return 'pie';
  } else if (firstLine.startsWith('classDiagram')) {
    return 'classDiagram';
  } else if (firstLine.startsWith('sequenceDiagram')) {
    return 'sequenceDiagram';
  } else if (firstLine.startsWith('gantt')) {
    return 'gantt';
  } else if (firstLine.startsWith('journey')) {
    return 'journey';
  } else if (firstLine.startsWith('mindmap')) {
    return 'mindmap';
  } else if (firstLine.startsWith('timeline')) {
    return 'timeline';
  } else if (firstLine.startsWith('xychart')) {
    return 'xychart';
  } else if (firstLine.startsWith('stateDiagram')) {
    return 'stateDiagram';
  }
  
  return 'unknown';
}

/**
 * Generate narrative for flowchart diagrams
 */
function generateFlowchartNarrative(source) {
  let narrative = '<p><strong>Flow:</strong></p>\n<ol>\n';
  
  const lines = source.split('\n')
    .filter(line => !line.trim().startsWith('%%'))
    .filter(line => line.trim().length > 0)
    .slice(1); // Skip first line (flowchart TD)
  
  const nodes = new Map();
  const edges = [];
  
  // Parse nodes and edges
  lines.forEach(line => {
    line = line.trim();
    
    // Node definition: A[Text] or A{Question?}
    const nodeMatch = line.match(/^([A-Z0-9]+)\[([^\]]+)\]|^([A-Z0-9]+)\{([^}]+)\}/);
    if (nodeMatch) {
      const id = nodeMatch[1] || nodeMatch[3];
      const text = nodeMatch[2] || nodeMatch[4];
      nodes.set(id, { text, isQuestion: !!nodeMatch[4] });
    }
    
    // Edge with label: A -->|Yes| B
    const edgeLabelMatch = line.match(/([A-Z0-9]+)\s*-->\s*\|([^|]+)\|\s*([A-Z0-9]+)/);
    if (edgeLabelMatch) {
      edges.push({ from: edgeLabelMatch[1], to: edgeLabelMatch[3], label: edgeLabelMatch[2] });
    } else {
      // Edge without label: A --> B
      const edgeMatch = line.match(/([A-Z0-9]+)\s*-->\s*([A-Z0-9]+)/);
      if (edgeMatch) {
        edges.push({ from: edgeMatch[1], to: edgeMatch[2], label: null });
      }
    }
  });
  
  console.log('[Narrative] Found', nodes.size, 'nodes and', edges.length, 'edges');
  
  // Build narrative
  if (nodes.size > 0) {
    const firstNode = Array.from(nodes.entries())[0];
    narrative += `<li>Start at: <strong>${escapeHtml(firstNode[1].text)}</strong></li>\n`;
    
    edges.forEach(edge => {
      const fromNode = nodes.get(edge.from);
      const toNode = nodes.get(edge.to);
      
      if (fromNode && toNode) {
        if (fromNode.isQuestion) {
          if (edge.label) {
            narrative += `<li>If <em>${escapeHtml(fromNode.text)}</em> is <strong>${escapeHtml(edge.label)}</strong>, then → <strong>${escapeHtml(toNode.text)}</strong></li>\n`;
          } else {
            narrative += `<li>From <em>${escapeHtml(fromNode.text)}</em> → <strong>${escapeHtml(toNode.text)}</strong></li>\n`;
          }
        } else {
          if (edge.label) {
            narrative += `<li>After <strong>${escapeHtml(fromNode.text)}</strong>, <em>${escapeHtml(edge.label)}</em> → <strong>${escapeHtml(toNode.text)}</strong></li>\n`;
          } else {
            narrative += `<li><strong>${escapeHtml(fromNode.text)}</strong> → <strong>${escapeHtml(toNode.text)}</strong></li>\n`;
          }
        }
      }
    });
  } else {
    narrative += '<li>No flowchart steps detected.</li>\n';
  }
  
  narrative += '</ol>\n';
  
  // Add summary stats
  narrative += `<p style="color: #666; font-size: 0.9em; margin-top: 1rem;">`;
  narrative += `<strong>Structure:</strong> ${nodes.size} node${nodes.size !== 1 ? 's' : ''}, `;
  narrative += `${edges.length} connection${edges.length !== 1 ? 's' : ''}`;
  const questions = Array.from(nodes.values()).filter(n => n.isQuestion).length;
  if (questions > 0) {
    narrative += `, ${questions} decision point${questions !== 1 ? 's' : ''}`;
  }
  narrative += `</p>`;
  
  return narrative;
}

/**
 * Generate narrative for pie chart diagrams
 */
function generatePieNarrative(source) {
  let narrative = '<p><strong>Data breakdown:</strong></p>\n<ul>\n';
  
  const lines = source.split('\n')
    .filter(line => !line.trim().startsWith('%%'))
    .filter(line => line.trim().length > 0)
    .slice(1); // Skip title line
  
  const data = [];
  let total = 0;
  
  lines.forEach(line => {
    const match = line.trim().match(/["']?([^"':]+)["']?\s*:\s*(\d+(?:\.\d+)?)/);
    if (match) {
      const label = match[1].trim();
      const value = parseFloat(match[2]);
      data.push({ label, value });
      total += value;
    }
  });
  
  console.log('[Narrative] Found', data.length, 'pie segments, total:', total);
  
  // Sort by value descending
  data.sort((a, b) => b.value - a.value);
  
  data.forEach(item => {
    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
    narrative += `<li><strong>${escapeHtml(item.label)}</strong>: ${item.value} (${percentage}%)</li>\n`;
  });
  
  narrative += '</ul>\n';
  narrative += `<p style="color: #666; font-size: 0.9em;"><strong>Total:</strong> ${total}</p>`;
  
  return narrative;
}

/**
 * Generate narrative for class diagram
 */
function generateClassDiagramNarrative(source) {
  let narrative = '<p><strong>Class structure:</strong></p>\n<ul>\n';
  
  const lines = source.split('\n')
    .filter(line => !line.trim().startsWith('%%'))
    .filter(line => line.trim().length > 0)
    .slice(1);
  
  const classes = new Map();
  const relationships = [];
  
  lines.forEach(line => {
    line = line.trim();
    
    // Class definition
    const classMatch = line.match(/class\s+(\w+)/);
    if (classMatch) {
      const className = classMatch[1];
      if (!classes.has(className)) {
        classes.set(className, { methods: [], properties: [] });
      }
    }
    
    // Methods/properties
    const memberMatch = line.match(/(\w+)\s*:\s*([+\-#~])?(.+)/);
    if (memberMatch) {
      const className = memberMatch[1];
      const member = memberMatch[3];
      if (classes.has(className)) {
        if (member.includes('()')) {
          classes.get(className).methods.push(member);
        } else {
          classes.get(className).properties.push(member);
        }
      }
    }
    
    // Relationships
    const relMatch = line.match(/(\w+)\s*(<\||--\||--|\.\.|<\.\.|o--)\s*(\w+)/);
    if (relMatch) {
      relationships.push({ from: relMatch[1], type: relMatch[2], to: relMatch[3] });
    }
  });
  
  console.log('[Narrative] Found', classes.size, 'classes and', relationships.length, 'relationships');
  
  classes.forEach((classData, className) => {
    narrative += `<li><strong>${escapeHtml(className)}</strong>`;
    if (classData.methods.length > 0) {
      narrative += ` with methods: ${classData.methods.map(m => escapeHtml(m)).join(', ')}`;
    }
    narrative += `</li>\n`;
  });
  
  narrative += '</ul>\n';
  
  if (relationships.length > 0) {
    narrative += '<p><strong>Relationships:</strong></p>\n<ul>\n';
    relationships.forEach(rel => {
      const relType = rel.type === '<|--' ? 'inherits from' : 
                      rel.type === '-->' ? 'uses' : 'relates to';
      narrative += `<li><strong>${escapeHtml(rel.from)}</strong> ${relType} <strong>${escapeHtml(rel.to)}</strong></li>\n`;
    });
    narrative += '</ul>\n';
  }
  
  return narrative;
}

/**
 * Generate narrative for gantt diagrams
 * Based on https://mermaid.js.org/syntax/gantt.html
 */
function generateGanttNarrative(source) {
  let narrative = '<p><strong>Project Timeline:</strong></p>\n';
  
  const lines = source.split('\n')
    .filter(line => !line.trim().startsWith('%%'))
    .filter(line => line.trim().length > 0);
  
  // Extract title
  const titleLine = lines.find(l => l.trim().startsWith('title'));
  if (titleLine) {
    const title = titleLine.replace(/title\s+/, '').trim();
    narrative += `<p><em>${escapeHtml(title)}</em></p>\n`;
  }
  
  // Parse sections and tasks
  const sections = [];
  let currentSection = null;
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Section header
    const sectionMatch = trimmed.match(/^section\s+(.+)$/);
    if (sectionMatch) {
      currentSection = {
        name: sectionMatch[1].trim(),
        tasks: []
      };
      sections.push(currentSection);
      return;
    }
    
    // Task: "Task name : [tags,] [start,] [end/duration]"
    // Skip keywords
    if (trimmed.match(/^(gantt|title|dateFormat|axisFormat|excludes|tickInterval|weekend)/)) {
      return;
    }
    
    const taskMatch = trimmed.match(/^([^:]+)\s*:\s*(.+)$/);
    if (taskMatch && currentSection) {
      const taskName = taskMatch[1].trim();
      const params = taskMatch[2].trim();
      
      // Check for tags
      const tags = [];
      if (params.includes('milestone')) tags.push('milestone');
      if (params.includes('done')) tags.push('completed');
      if (params.includes('active')) tags.push('in progress');
      if (params.includes('crit')) tags.push('critical');
      
      currentSection.tasks.push({
        name: taskName,
        tags: tags
      });
    }
  });
  
  // Generate section narrative
  if (sections.length > 0) {
    narrative += '<ul>\n';
    sections.forEach(section => {
      narrative += `<li><strong>${escapeHtml(section.name)}</strong>`;
      if (section.tasks.length > 0) {
        narrative += '\n<ul>\n';
        section.tasks.forEach(task => {
          const tagText = task.tags.length > 0 ? ` <em>(${task.tags.join(', ')})</em>` : '';
          narrative += `<li>${escapeHtml(task.name)}${tagText}</li>\n`;
        });
        narrative += '</ul>\n';
      }
      narrative += '</li>\n';
    });
    narrative += '</ul>\n';
  }
  
  return narrative;
}

/**
 * Generate narrative for user journey diagrams
 * Based on https://mermaid.js.org/syntax/userJourney.html
 */
function generateUserJourneyNarrative(source) {
  let narrative = '<p><strong>User Journey:</strong></p>\n';
  
  const lines = source.split('\n')
    .filter(line => !line.trim().startsWith('%%'))
    .filter(line => line.trim().length > 0);
  
  // Extract title
  const titleLine = lines.find(l => l.trim().startsWith('title'));
  if (titleLine) {
    const title = titleLine.replace(/title\s+/, '').trim();
    narrative += `<p><em>${escapeHtml(title)}</em></p>\n`;
  }
  
  // Parse sections and tasks
  // Format: "Task name: <score>: <actors>"
  const sections = [];
  let currentSection = null;
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Section header
    const sectionMatch = trimmed.match(/^section\s+(.+)$/);
    if (sectionMatch) {
      currentSection = {
        name: sectionMatch[1].trim(),
        steps: []
      };
      sections.push(currentSection);
      return;
    }
    
    // Task: "Task name: score: actors"
    if (trimmed.match(/^(journey|title)/)) return;
    
    const taskMatch = trimmed.match(/^([^:]+)\s*:\s*(\d+)\s*:\s*(.+)$/);
    if (taskMatch && currentSection) {
      const taskName = taskMatch[1].trim();
      const score = parseInt(taskMatch[2], 10);
      const actors = taskMatch[3].split(',').map(a => a.trim());
      
      currentSection.steps.push({
        name: taskName,
        score: score,
        actors: actors
      });
    }
  });
  
  // Generate section narrative
  if (sections.length > 0) {
    sections.forEach(section => {
      narrative += `<p><strong>${escapeHtml(section.name)}:</strong></p>\n`;
      if (section.steps.length > 0) {
        narrative += '<ol>\n';
        section.steps.forEach(step => {
          // Satisfaction emoji based on score (1-5)
          const satisfaction = step.score >= 4 ? '😊 positive' : 
                             step.score >= 3 ? '😐 neutral' : 
                             '😞 negative';
          const actorText = step.actors.length > 0 ? ` (by ${step.actors.join(', ')})` : '';
          narrative += `<li><strong>${escapeHtml(step.name)}</strong>${escapeHtml(actorText)} — <em>${satisfaction} experience (${step.score}/5)</em></li>\n`;
        });
        narrative += '</ol>\n';
      }
    });
  }
  
  return narrative;
}

/**
 * Generate narrative for mind map diagrams
 * Parses hierarchical structure with indentation levels
 */
function generateMindmapNarrative(source) {
  let narrative = '<p><strong>Mind Map Structure:</strong></p>\n';
  
  const lines = source.split('\n')
    .filter(line => !line.trim().startsWith('%%'))
    .filter(line => line.trim().length > 0)
    .slice(1); // Skip "mindmap" declaration
  
  // Build tree structure
  const tree = [];
  const stack = []; // Stack to track parent nodes at each level
  
  lines.forEach(line => {
    // Count leading spaces/indentation
    const indentMatch = line.match(/^(\s*)/);
    const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0;
    
    const text = line.trim();
    if (!text) return;
    
    // Remove shape markers for display text
    let displayText = text
      .replace(/^\w+\[/, '').replace(/\]$/, '') // Square brackets
      .replace(/^\w+\(/, '').replace(/\)$/, '') // Parentheses
      .replace(/^\w+\{\{/, '').replace(/\}\}$/, '') // Hexagon
      .replace(/^\w+\(\(/, '').replace(/\)\)$/, '') // Circle
      .replace(/^\w+\)\)/, '').replace(/\(\($/, '') // Bang
      .replace(/^\w+\)/, '').replace(/\($/, '') // Cloud
      .replace(/::icon.*$/i, ''); // Remove icon syntax
    
    const node = {
      text: displayText.trim(),
      level: indentLevel,
      children: []
    };
    
    // Find parent at previous level
    while (stack.length > indentLevel) {
      stack.pop();
    }
    
    if (stack.length > 0) {
      stack[stack.length - 1].children.push(node);
    } else {
      tree.push(node);
    }
    
    stack.push(node);
  });
  
  // Render tree as nested list
  function renderNode(node, depth = 0) {
    let html = '';
    if (depth === 0) {
      html += `<p><strong>${escapeHtml(node.text)}</strong></p>\n`;
      if (node.children.length > 0) {
        html += '<ul>\n';
        node.children.forEach(child => {
          html += renderNode(child, depth + 1);
        });
        html += '</ul>\n';
      }
    } else {
      html += `<li>${escapeHtml(node.text)}\n`;
      if (node.children.length > 0) {
        html += '<ul>\n';
        node.children.forEach(child => {
          html += renderNode(child, depth + 1);
        });
        html += '</ul>\n';
      }
      html += '</li>\n';
    }
    return html;
  }
  
  if (tree.length > 0) {
    tree.forEach(rootNode => {
      narrative += renderNode(rootNode);
    });
  } else {
    narrative += '<p><em>Empty mind map structure</em></p>\n';
  }
  
  return narrative;
}

/**
 * Generate narrative for Timeline diagrams
 * Timeline format: {time period} : {event}
 */
function generateTimelineNarrative(source) {
  let narrative = '<p><strong>Timeline Events:</strong></p>\n';
  
  const lines = source.split('\n')
    .filter(line => !line.trim().startsWith('%%') && !line.trim().startsWith('--'))
    .filter(line => line.trim().length > 0)
    .slice(1); // Skip "timeline" declaration
  
  let currentSection = '';
  let events = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Check for section headers (format: "section : section name")
    if (trimmed.includes('section') && trimmed.includes(':')) {
      if (events.length > 0) {
        // Render previous section
        if (currentSection) {
          narrative += `<h4>${escapeHtml(currentSection)}</h4>\n`;
        }
        narrative += '<ul>\n';
        events.forEach(event => {
          narrative += `<li>${escapeHtml(event)}</li>\n`;
        });
        narrative += '</ul>\n';
        events = [];
      }
      currentSection = trimmed.split(':').slice(1).join(':').trim();
    } else if (trimmed.includes(':')) {
      // Parse event: "2026-01 : Event Name"
      const parts = trimmed.split(':');
      const period = parts[0].trim();
      const eventName = parts.slice(1).join(':').trim();
      const displayEvent = eventName ? `${period}: ${eventName}` : period;
      events.push(displayEvent);
    }
  });
  
  // Render final section
  if (events.length > 0) {
    if (currentSection) {
      narrative += `<h4>${escapeHtml(currentSection)}</h4>\n`;
    }
    narrative += '<ul>\n';
    events.forEach(event => {
      narrative += `<li>${escapeHtml(event)}</li>\n`;
    });
    narrative += '</ul>\n';
  }
  
  if (lines.length === 0) {
    narrative += '<p><em>Empty timeline</em></p>\n';
  }
  
  return narrative;
}

/**
 * Generate narrative for XY Chart diagrams
 * XY charts display data with x and y axes
 */
function generateXyChartNarrative(source) {
  let narrative = '<p><strong>Chart Data:</strong></p>\n';
  
  const lines = source.split('\n')
    .filter(line => !line.trim().startsWith('%%'))
    .filter(line => line.trim().length > 0);
  
  let xLabel = 'X-Axis';
  let yLabel = 'Y-Axis';
  let datasets = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Parse x-axis config: "x-axis [val1, val2, ...]" or "x-axis 0 --> 100"
    if (trimmed.startsWith('x-axis')) {
      const rest = trimmed.replace('x-axis', '').trim();
      xLabel = rest || 'X-Axis';
    }
    // Parse y-axis config: "y-axis [val1, val2, ...]" or "y-axis 0 --> 5000"
    else if (trimmed.startsWith('y-axis')) {
      const rest = trimmed.replace('y-axis', '').trim();
      yLabel = rest || 'Y-Axis';
    }
    // Parse data: "line [val1, val2, ...]" or "bar [val1, val2, ...]"
    else if (trimmed.startsWith('line') || trimmed.startsWith('bar')) {
      const match = trimmed.match(/^(line|bar)\s+(.+)$/i);
      if (match) {
        const type = match[1].toLowerCase();
        const dataStr = match[2];
        datasets.push({ type, dataStr });
      }
    }
  });
  
  // Render summary
  narrative += `<p>Axes: ${escapeHtml(xLabel)} vs ${escapeHtml(yLabel)}</p>\n`;
  
  if (datasets.length > 0) {
    narrative += '<p><strong>Datasets:</strong></p>\n<ul>\n';
    datasets.forEach(dataset => {
      const label = dataset.type.charAt(0).toUpperCase() + dataset.type.slice(1);
      narrative += `<li>${label}: ${escapeHtml(dataset.dataStr)}</li>\n`;
    });
    narrative += '</ul>\n';
  }
  
  return narrative;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


/**
 * Calculate WCAG contrast ratio between two colors
 */
function getContrastRatio(foreground, background) {
  const fgLum = getRelativeLuminance(foreground);
  const bgLum = getRelativeLuminance(background);
  
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate relative luminance per WCAG formula
 */
function getRelativeLuminance(color) {
  const rgb = parseColor(color);
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Parse color from hex, rgb, or named color
 */
function parseColor(color) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  
  const imageData = ctx.getImageData(0, 0, 1, 1).data;
  return {
    r: imageData[0],
    g: imageData[1],
    b: imageData[2],
  };
}

/**
 * Attach event listeners to UI elements
 */
function attachEventListeners() {
  const sourceInput = document.getElementById('mermaid-source');
  const exportButton = document.getElementById('export-btn');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const randomBtn = document.getElementById('random-btn');
  const svgCode = document.getElementById('svg-code');
  const copySvgBtn = document.getElementById('copy-svg-btn');
  
  if (sourceInput) {
    // Live validation and rendering on every keystroke
    sourceInput.addEventListener('input', validateAndRender);
    // Save to storage on change
    sourceInput.addEventListener('change', () => {
      saveDiagramToStorage(sourceInput.value);
    });
  }
  
  if (exportButton) {
    exportButton.addEventListener('click', handleExport);
  }
  
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => toggleTheme());
  }

  if (randomBtn) {
    randomBtn.addEventListener('click', async () => {
      if (randomBtn.disabled) return;
      randomBtn.disabled = true;
      randomBtn.setAttribute('aria-busy', 'true');
      try {
        console.log('[Random] Starting random example load...');
        await loadRandomExampleIntoEditor();
        console.log('[Random] Example loaded into editor, validating and rendering...');
        const ok = await validateAndRender();
        console.log('[Random] validateAndRender returned:', ok);
        console.log('[Random] STATE.currentSvg length:', STATE.currentSvg?.length || 0);
        console.log('[Random] STATE.beautifiedSvg length:', STATE.beautifiedSvg?.length || 0);
        if (ok) {
          showToast('Loaded a random example.', 'success');
        } else {
          showToast('Example loaded but failed to render. Please retry.', 'error');
        }
      } catch (e) {
        console.error('Random load failed', e);
        showToast('Could not load example.', 'error');
      } finally {
        randomBtn.disabled = false;
        randomBtn.removeAttribute('aria-busy');
      }
    });
  }

  if (copySvgBtn && svgCode) {
    copySvgBtn.addEventListener('click', () => {
      // Ensure the textarea reflects the currently selected mode before copying
      updateSvgDisplay();
      copyToClipboard(svgCode.value);
    });
  }

  if (svgCode) {
    // Keep highlight scroll in sync with textarea scroll
    const highlight = document.getElementById('svg-code-highlight');
    const syncScroll = () => {
      if (!highlight) return;
      highlight.scrollTop = svgCode.scrollTop;
      highlight.scrollLeft = svgCode.scrollLeft;
    };
    svgCode.addEventListener('scroll', syncScroll);
    window.addEventListener('resize', syncScroll);
    syncScroll();

    // Always allow editing; live update preview and optimized output
    svgCode.addEventListener('input', () => {
      const code = svgCode.value;
      const parsed = parseSvgSafely(code);
      if (parsed.ok) {
        displayPreview(code);
        renderSvgHighlight(code);
      } else {
        showError('Invalid SVG code. Please fix errors.');
      }
    });
  }

  // SVG mode toggle (Beautiful vs Optimized)
  const modeRadios = document.querySelectorAll('input[name="svg-mode"]');
  modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        STATE.svgMode = e.target.value;
        updateSvgDisplay();
      }
    });
  });
}

/** Load examples manifest */
async function loadExamplesManifest() {
  try {
    console.log('[loadExamplesManifest] Fetching manifest from:', CONFIG.examplesManifest);
    const res = await fetch(CONFIG.examplesManifest, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching manifest`);
    }
    const manifest = await res.json();
    console.log('[loadExamplesManifest] Manifest loaded, examples count:', manifest.examples?.length || 0);
    return manifest;
  } catch (error) {
    console.error('[loadExamplesManifest] Failed to load manifest:', error);
    throw error;
  }
}

/** Pick a random example entry */
function pickRandomExample(manifest) {
  const list = manifest.examples || [];
  if (!list.length) throw new Error('No examples available');
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

/** Fetch example content by file */
async function fetchExample(file) {
  try {
    console.log('[fetchExample] Fetching:', `./examples/${file}`);
    const res = await fetch(`./examples/${file}`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${file}`);
    }
    const content = await res.text();
    console.log('[fetchExample] Loaded example, length:', content.length);
    return content;
  } catch (error) {
    console.error('[fetchExample] Failed to load example:', file, error);
    throw error;
  }
}

/** Load a random example into the editor */
async function loadRandomExampleIntoEditor() {
  const manifest = await loadExamplesManifest();
  const example = pickRandomExample(manifest);
  const content = await fetchExample(example.file);
  const sourceInput = document.getElementById('mermaid-source');
  if (sourceInput) {
    sourceInput.value = content.trim();
    saveDiagramToStorage(sourceInput.value);
  }
  return content;
}

/**
 * Live validation and rendering on every keystroke
 * Shows errors subtly in editor; silently updates preview on success
 */
async function validateAndRender() {
  const sourceInput = document.getElementById('mermaid-source');
  const editorError = document.getElementById('editor-error');
  
  if (!sourceInput) {
    console.error('[validateAndRender] sourceInput element not found');
    return false;
  }
  
  let mermaidSource = sourceInput.value.trim();
  console.log('[validateAndRender] Source length:', mermaidSource.length);
  
  if (!mermaidSource) {
    // Empty editor: clear previews and error
    console.log('[validateAndRender] Empty source, clearing preview');
    editorError.textContent = '';
    editorError.classList.remove('show');
    displayPreview('');
    return false;
  }
  
  try {
    console.log('[validateAndRender] Ensuring metadata...');
    // Ensure required metadata; auto-insert if missing
    const ensured = ensureMetadata(mermaidSource);
    mermaidSource = ensured.source;
    const metadata = ensured.metadata;
    if (ensured.added) {
      // Reflect auto-added annotations back into the textarea
      if (sourceInput) sourceInput.value = mermaidSource;
      showToast('Title and description added for accessibility.', 'info');
    }
    
    // Render Mermaid
    console.log('[validateAndRender] Calling renderMermaidDiagram...');
    const svg = await renderMermaidDiagram(mermaidSource);
    console.log('[validateAndRender] Got SVG from Mermaid, length:', svg.length);
    
    // Apply accessibility transformations
    console.log('[validateAndRender] Applying accessibility transformations...');
    const accessibleSvg = applyAccessibilityTransformations(svg, metadata);
    console.log('[validateAndRender] Accessibility transformations complete, SVG length:', accessibleSvg.length);
    
    // Ensure viewBox so the preview has measurable dimensions
    const sizedSvg = ensureViewBox(accessibleSvg);
    
    // Display preview
    console.log('[validateAndRender] Calling displayPreview...');
    displayPreview(sizedSvg);
    
    // Generate and display narrative
    console.log('[validateAndRender] Generating narrative...');
    generateDiagramNarrative(mermaidSource, metadata);
    
    // Store current state
    saveDiagramToStorage(mermaidSource);
    
    // Clear any previous error
    editorError.textContent = '';
    editorError.classList.remove('show');
    console.log('[validateAndRender] Complete, returning true');
    return true;
  } catch (error) {
    // Show subtle error in editor area
    console.error('[validateAndRender] Error during rendering:', error);
    editorError.textContent = error.message;
    editorError.classList.add('show');
    return false;
  }
}

/**
 * Handle render button click (deprecated; use validateAndRender instead)
 */
async function handleRender() {
  return validateAndRender();
}

/**
 * Ensure Mermaid source has required accessibility annotations.
 * If missing, auto-insert defaults and return updated source and metadata.
 */
function ensureMetadata(source) {
  const current = parseMermaidMetadata(source);
  let added = false;
  let updated = source;
  const lines = [];

  if (!current.title) {
    lines.push('%%accTitle Untitled Diagram');
    added = true;
  }
  if (!current.description) {
    lines.push('%%accDescr Auto-generated description for accessibility. Please customize.');
    added = true;
  }

  if (added) {
    // Append annotations at the end to avoid impacting Mermaid parsing
    updated = source + (source.endsWith('\n') ? '' : '\n') + lines.join('\n') + '\n';
  }

  const finalMeta = parseMermaidMetadata(updated);
  return { source: updated, metadata: finalMeta, added };
}

/**
 * Show an accessible modal dialog
 */
function showModal(message, tone = 'info') {
  const overlay = document.getElementById('modal-overlay');
  const dialog = document.getElementById('modal');
  const msgEl = document.getElementById('modal-message');
  const closeBtn = document.getElementById('modal-close');

  if (!overlay || !dialog || !msgEl || !closeBtn) {
    // Fallback to status area if modal not present
    showSuccess(message);
    return;
  }

  msgEl.textContent = message;
  msgEl.classList.remove('info', 'error', 'success');
  if (tone === 'error') msgEl.classList.add('error');
  else if (tone === 'success') msgEl.classList.add('success');
  else msgEl.classList.add('info');

  overlay.removeAttribute('hidden');
  dialog.setAttribute('aria-hidden', 'false');
  closeBtn.focus();

  function closeModal() {
    dialog.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('hidden', '');
    // Return focus to the editor for good UX
    document.getElementById('mermaid-source')?.focus();
    // Cleanup listeners
    overlay.removeEventListener('click', overlayHandler);
    document.removeEventListener('keydown', escHandler);
    closeBtn.removeEventListener('click', closeModal);
  }

  function overlayHandler(e) {
    if (e.target === overlay) closeModal();
  }
  function escHandler(e) {
    if (e.key === 'Escape') closeModal();
  }

  overlay.addEventListener('click', overlayHandler);
  document.addEventListener('keydown', escHandler);
  closeBtn.addEventListener('click', closeModal);
}

/**
 * Show a non-blocking, auto-dismissing accessible toast message
 */
function showToast(message, tone = 'info', timeout = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';

  const msg = document.createElement('div');
  msg.className = 'toast-message ' + tone;
  msg.textContent = message;

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', 'Dismiss notification');
  close.textContent = '×';
  close.addEventListener('click', () => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  });

  toast.appendChild(msg);
  toast.appendChild(close);
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode === container) container.removeChild(toast);
  }, timeout);
}

/**
 * Initialize theme toggle button with prefers-color-scheme fallback
 */
function initializeThemeToggle() {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const existing = document.documentElement.getAttribute('data-theme');
  const startTheme = existing || (prefersDark ? 'dark' : 'light');
  setTheme(startTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function setTheme(mode) {
  const safeMode = mode === 'dark' ? 'dark' : 'light';
  const btn = document.getElementById('theme-toggle-btn');
  document.documentElement.setAttribute('data-theme', safeMode);
  if (btn) {
    btn.setAttribute('aria-pressed', safeMode === 'dark');
    btn.textContent = safeMode === 'dark' ? '☾' : '☀︎';
  }
}

/**
 * Draggable splitter between Mermaid and SVG panes
 */
function setupSplitter() {
  const container = document.querySelector('.code-split');
  const splitter = document.getElementById('splitter');
  if (!container || !splitter) return;

  const min = 20;
  const max = 80;

  const setPosition = (pct) => {
    const clamped = Math.min(max, Math.max(min, pct));
    container.style.setProperty('--split-left', `${clamped}%`);
    container.style.setProperty('--split-right', `${100 - clamped}%`);
    splitter.setAttribute('aria-valuenow', clamped.toFixed(0));
  };

  const handlePointerMove = (clientX) => {
    const rect = container.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(pct);
  };

  const startDrag = (startEvent) => {
    startEvent.preventDefault();
    const move = (ev) => handlePointerMove(ev.clientX);
    const stop = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
  };

  splitter.addEventListener('mousedown', startDrag);

  splitter.addEventListener('keydown', (e) => {
    const step = 4;
    const current = Number(splitter.getAttribute('aria-valuenow')) || 50;
    if (e.key === 'ArrowLeft') {
      setPosition(current - step);
      e.preventDefault();
    }
    if (e.key === 'ArrowRight') {
      setPosition(current + step);
      e.preventDefault();
    }
  });
}

/**
 * Format SVG for readability (Beautiful mode)
 */
function formatSvg(svgString) {
  if (!svgString) return '';
  
  try {
    // Use xml-formatter if available for professional formatting
    if (xmlFormatter) {
      const formatted = xmlFormatter(svgString, { 
        indentation: '  ', 
        lineSeparator: '\n' 
      });
      return formatted.endsWith('\n') ? formatted : `${formatted}\n`;
    }
    
    // Fallback to basic formatting
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    if (doc.querySelector('parsererror')) return svgString;
    
    const serializer = new XMLSerializer();
    let formatted = serializer.serializeToString(doc);
    
    // Add line breaks and basic indentation
    formatted = formatted
      .replace(/></g, '>\n<')
      .split('\n')
      .map(line => line.trim())
      .join('\n');
    
    return formatted.endsWith('\n') ? formatted : `${formatted}\n`;
  } catch (e) {
    console.warn('formatSvg error:', e);
    return svgString;
  }
}

/**
 * Optimize SVG for production (Optimized mode)
 */
function optimizeSvg(svgString) {
  if (!svgString) return '';
  
  try {
    // Use SVGO if available for professional optimization
    if (SVGO && typeof SVGO.optimize === 'function') {
      const result = SVGO.optimize(svgString, {
        multipass: true,
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                removeViewBox: false,
                removeTitle: false,
                removeDesc: false,
                cleanupIds: false
              }
            }
          }
        ]
      });
      return result.data || svgString;
    }
    
    // Fallback to basic minification
    let optimized = svgString
      .replace(/\s+/g, ' ')
      .replace(/> </g, '><')
      .replace(/\s*=\s*/g, '=')
      .trim();
    
    return optimized;
  } catch (e) {
    console.warn('optimizeSvg error:', e);
    return svgString;
  }
}

/**
 * Update SVG code display based on current mode
 */
function updateSvgDisplay() {
  const svgCode = document.getElementById('svg-code');
  
  if (!svgCode || !STATE.currentSvg) {
    console.log('[updateSvgDisplay] Skipping: svgCode=', !!svgCode, 'STATE.currentSvg length=', STATE.currentSvg?.length);
    return;
  }
  
  console.log('[updateSvgDisplay] Updating SVG code display, STATE.currentSvg length:', STATE.currentSvg.length);
  
  // Generate formatted/optimized versions if not cached
  if (!STATE.beautifiedSvg) {
    STATE.beautifiedSvg = formatSvg(STATE.currentSvg);
    console.log('[updateSvgDisplay] Generated beautifiedSvg, length:', STATE.beautifiedSvg.length);
  }
  if (!STATE.optimizedSvg) {
    STATE.optimizedSvg = optimizeSvg(STATE.currentSvg);
    console.log('[updateSvgDisplay] Generated optimizedSvg, length:', STATE.optimizedSvg.length);
  }
  
  // Display based on current mode
  if (STATE.svgMode === 'beautiful') {
    svgCode.value = STATE.beautifiedSvg;
    console.log('[updateSvgDisplay] Set textarea to beautifiedSvg');
  } else {
    svgCode.value = STATE.optimizedSvg;
    console.log('[updateSvgDisplay] Set textarea to optimizedSvg');
  }
  
  // Refresh highlighting
  renderSvgHighlight(svgCode.value);
  
  // Update size metrics
  updateSizeMetrics();
}

/**
 * Update size metrics display
 */
function updateSizeMetrics() {
  const beautifulLabel = document.querySelector('label[for="mode-beautiful"]');
  const optimizedLabel = document.querySelector('label[for="mode-optimized"]');
  
  if (!beautifulLabel || !optimizedLabel) return;
  
  const beautifiedSize = STATE.beautifiedSvg.length;
  const optimizedSize = STATE.optimizedSvg.length;
  
  const formatSize = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
  const formatPercentVsBeautified = (base, current) => {
    if (!base) return '';
    const diff = ((current - base) / base) * 100;
    if (!Number.isFinite(diff)) return '';
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toFixed(0)}% vs Beautiful`;
  };
  
  // Beautiful: size only
  beautifulLabel.innerHTML = `Beautiful <span class="size-hint">• ${formatSize(beautifiedSize)}</span>`;
  
  // Optimized: size plus delta vs Beautiful
  const pct = formatPercentVsBeautified(beautifiedSize, optimizedSize);
  optimizedLabel.innerHTML = pct
    ? `Optimized <span class="size-hint">• ${formatSize(optimizedSize)} (${pct})</span>`
    : `Optimized <span class="size-hint">• ${formatSize(optimizedSize)}</span>`;
}

/**
 * Display SVG preview in light and dark modes
 */
function displayPreview(svgString) {
  console.log('[displayPreview] Called with SVG length:', svgString.length);
  const lightPreview = document.getElementById('preview-light');
  const darkPreview = document.getElementById('preview-dark');
  
  // Always render fresh—previews are never cached; always written directly to DOM
  if (lightPreview) {
    lightPreview.innerHTML = svgString;
    console.log('[displayPreview] Updated light preview');
  }
  
  if (darkPreview) {
    darkPreview.innerHTML = svgString;
    // Add dark mode class for styling
    const svg = darkPreview.querySelector('svg');
    if (svg) svg.classList.add('dark-mode');
    console.log('[displayPreview] Updated dark preview');
  }

  // Store raw SVG and clear cached versions
  STATE.currentSvg = svgString;
  STATE.beautifiedSvg = '';
  STATE.optimizedSvg = '';
  
  console.log('[displayPreview] Stored in STATE, calling updateSvgDisplay');
  // Update the SVG code display based on current mode
  updateSvgDisplay();
}

/**
 * Render syntax highlighting for SVG code
 */
function renderSvgHighlight(svgString) {
  const highlight = document.getElementById('svg-code-highlight');
  const textarea = document.getElementById('svg-code');
  if (!highlight) return;

  const escapeHtml = (str) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let html = escapeHtml(svgString || '');

  // Highlight comments
  html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hl-comment">$1</span>');

  // Highlight tags and attributes
  html = html.replace(/(&lt;\/?)([a-zA-Z0-9:-]+)([^&]*?)(\/?&gt;)/g, (match, open, tag, attrs, close) => {
    const attrHtml = attrs.replace(/([a-zA-Z_:.-]+)(\s*=\s*"[^"]*")/g, (m, name, value) => {
      const lower = name.toLowerCase();
      const cls = lower.startsWith('aria-') || lower === 'role' || lower.startsWith('acc')
        ? 'hl-aria'
        : (lower.includes('style') || lower === 'class' || lower === 'fill' || lower === 'stroke' || lower.startsWith('data-'))
          ? 'hl-style'
          : 'hl-attr';
      return `<span class="${cls}">${name}${value}</span>`;
    });
    return `${open}<span class="hl-tag">${tag}</span>${attrHtml}${close}`;
  });

  // Highlight text nodes between tags
  html = html.replace(/&gt;([^<]+?)&lt;/g, (m, text) => {
    if (!text.trim()) return m;
    return `&gt;<span class="hl-text">${text}</span>&lt;`;
  });

  highlight.innerHTML = html;

  // Keep scroll positions aligned after re-render
  if (textarea) {
    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
  }
}

/**
 * Handle export button click
 */
function handleExport() {
  // Ensure the textarea reflects the current mode before exporting
  updateSvgDisplay();

  // Prefer the SVG code textarea if present (may include edits)
  const svgCode = document.getElementById('svg-code');
  let svgString = svgCode?.value;
  if (!svgString) {
    const lightPreview = document.getElementById('preview-light');
    const svg = lightPreview?.querySelector('svg');
    if (!svg) {
      showError('No diagram to export. Render a diagram first.');
      return;
    }
    svgString = new XMLSerializer().serializeToString(svg);
  }
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'diagram-accessible.svg';
  a.click();
  URL.revokeObjectURL(url);
  
  showSuccess('SVG exported successfully');
}

/** Copy helper */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text || '');
    showSuccess('SVG code copied to clipboard');
  } catch (e) {
    showError('Failed to copy to clipboard');
  }
}

/** Parse SVG safely to validate edits */
function parseSvgSafely(svgString) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const err = doc.querySelector('parsererror');
    if (err) return { ok: false, error: err.textContent };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * Clear all cached data from localStorage
 */
function clearStorageCache() {
  try {
    localStorage.removeItem('lastDiagram');
  } catch (e) {
    console.warn('Could not clear localStorage:', e);
  }
}

/**
 * Save diagram source to localStorage
 */
function saveDiagramToStorage(source) {
  try {
    localStorage.setItem('lastDiagram', source);
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
}

/**
 * Restore last diagram from localStorage
 */
function restoreLastDiagram() {
  try {
    const lastDiagram = localStorage.getItem('lastDiagram');
    const sourceInput = document.getElementById('mermaid-source');
    
    if (lastDiagram && lastDiagram.trim() && sourceInput) {
      console.log('[restoreLastDiagram] Restoring saved diagram, length:', lastDiagram.length);
      sourceInput.value = lastDiagram;
    } else {
      console.log('[restoreLastDiagram] No saved diagram found or storage empty');
    }
  } catch (e) {
    console.warn('[restoreLastDiagram] Could not restore from localStorage:', e);
  }
}

/**
 * Show error message
 */
function showError(message) {
  const status = document.getElementById('status');
  if (status) {
    status.textContent = `❌ ${message}`;
    status.setAttribute('role', 'alert');
    status.setAttribute('aria-live', 'assertive');
    status.classList.add('error');
  }
}

/**
 * Show success message
 */
function showSuccess(message) {
  const status = document.getElementById('status');
  if (status) {
    status.textContent = `✓ ${message}`;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.classList.remove('error');
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
