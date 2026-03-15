/*
 * AGPL-3.0-or-later License - See LICENSE file for full text
 * Copyright (c) 2026 Mike Gifford
 *
 * Sa11y Initialization
 * Loads Sa11y accessibility quality assurance tool from CDN and configures it
 * for use within A11y Mermaid Studio.
 * See: https://sa11y.netlify.app/
 */

import { Sa11y, Lang } from 'https://cdn.jsdelivr.net/npm/sa11y@4.4.1/dist/js/sa11y.esm.min.js';
import Sa11yLangEn from 'https://cdn.jsdelivr.net/npm/sa11y@4.4.1/dist/js/lang/en.js';

// Set language to English
Lang.addI18n(Sa11yLangEn.strings);

// Initialise Sa11y, scoping checks to the full page body
// eslint-disable-next-line no-new
new Sa11y({
  checkRoot: 'body',
  readabilityRoot: 'main',
  contrastPlugin: true,
  formLabelsPlugin: true,
  readabilityPlugin: false,
  colourFilterPlugin: false,
  linksAdvancedPlugin: true,
  exportResultsPlugin: false,
  panelPosition: 'right',
  dismissAnnotations: true,
  detectSPArouting: true,
});
