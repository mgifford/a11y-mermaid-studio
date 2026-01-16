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
  examplesManifest: './examples/manifest.json',
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
  setupSplitter();
  initializeThemeToggle();
  
  // Load any previously saved diagram from localStorage
  restoreLastDiagram();

  // If editor is empty after restore, load a random example automatically
  const sourceInput = document.getElementById('mermaid-source');
  if (sourceInput && !sourceInput.value.trim()) {
    try {
      await loadRandomExampleIntoEditor();
      // Auto-render after loading example
      await validateAndRender();
    } catch (e) {
      console.warn('Could not load example:', e);
    }
  } else {
    // Render whatever we restored so the previews are in sync
    await validateAndRender();
  }
  
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
  const exportButton = document.getElementById('export-btn');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const randomBtn = document.getElementById('random-btn');
  const svgCode = document.getElementById('svg-code');
  const copySvgBtn = document.getElementById('copy-svg-btn');
  const editSvgToggle = document.getElementById('edit-svg-toggle');
  
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
      try {
        await loadRandomExampleIntoEditor();
        await validateAndRender();
        showToast('Loaded a random example.', 'success');
      } catch (e) {
        showToast('Could not load example.', 'error');
      }
    });
  }

  if (copySvgBtn && svgCode) {
    copySvgBtn.addEventListener('click', () => copyToClipboard(svgCode.value));
  }

  if (editSvgToggle && svgCode) {
    editSvgToggle.addEventListener('change', (e) => {
      const enabled = e.target.checked;
      svgCode.readOnly = !enabled;
      if (enabled) {
        showToast('SVG editing enabled. Changes here update the preview but will not sync back to Mermaid source.', 'info');
      }
    });
    // Live update preview when editing is enabled
    svgCode.addEventListener('input', () => {
      if (!editSvgToggle.checked) return;
      const code = svgCode.value;
      const parsed = parseSvgSafely(code);
      if (parsed.ok) {
        displayPreview(code);
      } else {
        showError('Invalid SVG code. Please fix errors or disable editing.');
      }
    });
  }
}

/** Load examples manifest */
async function loadExamplesManifest() {
  const res = await fetch(CONFIG.examplesManifest, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load examples manifest');
  return res.json();
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
  const res = await fetch(`./examples/${file}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load example: ${file}`);
  return res.text();
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
  
  if (!sourceInput) return;
  
  let mermaidSource = sourceInput.value.trim();
  
  if (!mermaidSource) {
    // Empty editor: clear previews and error
    editorError.textContent = '';
    editorError.classList.remove('show');
    displayPreview('');
    return;
  }
  
  try {
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
    const svg = await renderMermaidDiagram(mermaidSource);
    
    // Apply accessibility transformations
    const accessibleSvg = applyAccessibilityTransformations(svg, metadata);
    
    // Display preview
    displayPreview(accessibleSvg);
    
    // Store current state
    saveDiagramToStorage(mermaidSource);
    
    // Clear any previous error
    editorError.textContent = '';
    editorError.classList.remove('show');
  } catch (error) {
    // Show subtle error in editor area
    editorError.textContent = error.message;
    editorError.classList.add('show');
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

  // Reflect latest SVG code into the code viewer if available and not in edit mode
  const svgCode = document.getElementById('svg-code');
  const editToggle = document.getElementById('edit-svg-toggle');
  if (svgCode && (!editToggle || !editToggle.checked)) {
    svgCode.value = svgString;
  }
}

/**
 * Handle export button click
 */
function handleExport() {
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
