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

const CONFIG = {
  mermaidVersion: '10.6.1',
  mermaidCDN: 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js',
};

/**
 * Initialize the application
 */
async function initializeApp() {
  console.log('A11y Mermaid Studio initializing...');
  
  // Load Mermaid from CDN
  await loadMermaid();
  
  // Set up event listeners
  attachEventListeners();
  
  // Load any previously saved diagram from localStorage
  restoreLastDiagram();
  
  console.log('Application ready');
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
      });
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Mermaid'));
    document.head.appendChild(script);
  });
}

/**
 * Render Mermaid source to SVG
 */
async function renderMermaidDiagram(mermaidSource) {
  try {
    const { svg } = await window.mermaid.render('mermaid-diagram', mermaidSource);
    return svg;
  } catch (error) {
    console.error('Mermaid render error:', error);
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
  
  // Preserve xmlns namespace for standalone SVG usage
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  
  return new XMLSerializer().serializeToString(doc);
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
  const renderButton = document.getElementById('render-btn');
  const exportButton = document.getElementById('export-btn');
  const themeToggle = document.getElementById('theme-toggle');
  
  if (renderButton) {
    renderButton.addEventListener('click', handleRender);
  }
  
  if (sourceInput) {
    sourceInput.addEventListener('change', () => {
      saveDiagramToStorage(sourceInput.value);
    });
  }
  
  if (exportButton) {
    exportButton.addEventListener('click', handleExport);
  }
  
  if (themeToggle) {
    themeToggle.addEventListener('change', (e) => {
      document.documentElement.setAttribute('data-theme', e.target.checked ? 'dark' : 'light');
    });
  }
}

/**
 * Handle render button click
 */
async function handleRender() {
  const sourceInput = document.getElementById('mermaid-source');
  const mermaidSource = sourceInput.value.trim();
  
  if (!mermaidSource) {
    showError('Please enter Mermaid source code');
    return;
  }
  
  try {
    // Parse metadata
    const metadata = parseMermaidMetadata(mermaidSource);
    
    // Validate required metadata
    if (!metadata.title) {
      showError('Diagram must have a title. Add: %%accTitle Your Title');
      return;
    }
    
    if (!metadata.description) {
      showError('Diagram must have a description. Add: %%accDescr Your description');
      return;
    }
    
    // Render Mermaid
    const svg = await renderMermaidDiagram(mermaidSource);
    
    // Apply accessibility transformations
    const accessibleSvg = applyAccessibilityTransformations(svg, metadata);
    
    // Display preview
    displayPreview(accessibleSvg);
    
    // Store current state
    saveDiagramToStorage(mermaidSource);
    
    showSuccess('Diagram rendered successfully');
  } catch (error) {
    showError(`Error: ${error.message}`);
  }
}

/**
 * Display SVG preview in light and dark modes
 */
function displayPreview(svgString) {
  const lightPreview = document.getElementById('preview-light');
  const darkPreview = document.getElementById('preview-dark');
  
  if (lightPreview) {
    lightPreview.innerHTML = svgString;
  }
  
  if (darkPreview) {
    darkPreview.innerHTML = svgString;
    // Add dark mode class for styling
    const svg = darkPreview.querySelector('svg');
    if (svg) svg.classList.add('dark-mode');
  }
}

/**
 * Handle export button click
 */
function handleExport() {
  const lightPreview = document.getElementById('preview-light');
  const svg = lightPreview?.querySelector('svg');
  
  if (!svg) {
    showError('No diagram to export. Render a diagram first.');
    return;
  }
  
  const svgString = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'diagram-accessible.svg';
  a.click();
  URL.revokeObjectURL(url);
  
  showSuccess('SVG exported successfully');
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
  const lastDiagram = localStorage.getItem('lastDiagram');
  const sourceInput = document.getElementById('mermaid-source');
  
  if (lastDiagram && sourceInput) {
    sourceInput.value = lastDiagram;
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
