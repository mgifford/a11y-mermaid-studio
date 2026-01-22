/*
 * AGPL-3.0-or-later License - See LICENSE file for full text
 * Copyright (c) 2026 Mark Gifford
 */

/**
 * AI Availability Diagnostics Helper
 * 
 * This file provides debugging help for browser AI availability issues.
 * If the AI controls don't appear in the app, open the browser console
 * and run: checkBrowserAIStatus()
 */

window.checkBrowserAIStatus = async function() {
  console.log('=== Browser AI Status Diagnostic ===\n');
  
  // Check 1: window.ai exists
  console.log('Check 1: window.ai available?', 'ai' in window);
  if ('ai' in window) {
    console.log('  ✅ window.ai object found');
    console.log('  window.ai keys:', Object.keys(window.ai));
  } else {
    console.log('  ❌ window.ai NOT found');
    console.log('  This means: Chrome/Edge AI flag might not be enabled');
    return;
  }
  
  // Check 2: languageModel available
  console.log('\nCheck 2: window.ai.languageModel available?', 'languageModel' in window.ai);
  if ('languageModel' in window.ai) {
    console.log('  ✅ window.ai.languageModel object found');
  } else {
    console.log('  ❌ window.ai.languageModel NOT found');
    return;
  }
  
  // Check 3: capabilities
  console.log('\nCheck 3: Checking model capabilities...');
  try {
    const capabilities = await window.ai.languageModel.capabilities();
    console.log('  Capabilities:', capabilities);
    
    if (capabilities.available === 'readily') {
      console.log('  ✅ Model READY TO USE');
    } else if (capabilities.available === 'after-download') {
      console.log('  ⏳ Model needs download (~2.5 GB) - will auto-download on first use');
    } else {
      console.log('  ❌ Model not available:', capabilities.available);
    }
  } catch (error) {
    console.log('  ❌ Error getting capabilities:', error.message);
  }
  
  console.log('\n=== Fix Steps ===');
  console.log('If AI not detected:');
  console.log('1. Chrome/Edge: Go to chrome://flags/#prompt-api-for-ai');
  console.log('2. Set to "Enabled"');
  console.log('3. Restart browser completely');
  console.log('4. Refresh this page');
  console.log('\nIf still not working:');
  console.log('5. Check: Are you using Chrome 128+ or Edge 133+?');
  console.log('6. Check: Is your OS supported? (Windows 11 24H2+, macOS 15.1+)');
};

// Run on page load to show AI status
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof STATE !== 'undefined' && STATE.aiAvailable) {
      console.log('✅ [AI] Browser AI detected and ready!');
    } else if (typeof STATE !== 'undefined') {
      console.log('⚠️ [AI] Browser AI not detected. Run: checkBrowserAIStatus()');
    }
  });
} else {
  if (typeof STATE !== 'undefined' && STATE.aiAvailable) {
    console.log('✅ [AI] Browser AI detected and ready!');
  } else if (typeof STATE !== 'undefined') {
    console.log('⚠️ [AI] Browser AI not detected. Run: checkBrowserAIStatus()');
  }
}
