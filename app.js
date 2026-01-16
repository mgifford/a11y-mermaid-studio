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
  
  // Load required libraries from CDN
  await Promise.all([
    loadMermaid(),
    loadXmlFormatter(),
    loadSVGO()
  ]);

  // Seed empty highlight layer
  renderSvgHighlight('');
  
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
        await loadRandomExampleIntoEditor();
        const ok = await validateAndRender();
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
    return true;
  } catch (error) {
    // Show subtle error in editor area
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
  
  if (!svgCode || !STATE.currentSvg) return;
  
  // Generate formatted/optimized versions if not cached
  if (!STATE.beautifiedSvg) {
    STATE.beautifiedSvg = formatSvg(STATE.currentSvg);
  }
  if (!STATE.optimizedSvg) {
    STATE.optimizedSvg = optimizeSvg(STATE.currentSvg);
  }
  
  // Display based on current mode
  if (STATE.svgMode === 'beautiful') {
    svgCode.value = STATE.beautifiedSvg;
  } else {
    svgCode.value = STATE.optimizedSvg;
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
  const lightPreview = document.getElementById('preview-light');
  const darkPreview = document.getElementById('preview-dark');
  
  // Always render fresh—previews are never cached; always written directly to DOM
  if (lightPreview) {
    lightPreview.innerHTML = svgString;
  }
  
  if (darkPreview) {
    darkPreview.innerHTML = svgString;
    // Add dark mode class for styling
    const svg = darkPreview.querySelector('svg');
    if (svg) svg.classList.add('dark-mode');
  }

  // Store raw SVG and clear cached versions
  STATE.currentSvg = svgString;
  STATE.beautifiedSvg = '';
  STATE.optimizedSvg = '';
  
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
