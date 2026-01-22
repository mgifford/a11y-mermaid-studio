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
  console.log('User Agent:', navigator.userAgent);
  console.log('Location:', window.location.href);
  console.log('Is Secure Context?', window.isSecureContext);
  
  // Check 1: window.ai exists
  console.log('\nCheck 1: window.ai available?', 'ai' in window);
  if ('ai' in window) {
    console.log('  ✅ window.ai object found');
    console.log('  window.ai keys:', Object.keys(window.ai));
  } else {
    console.log('  ❌ window.ai NOT found');
    console.log('  POSSIBLE CAUSES:');
    console.log('  1. Flag enabled but browser NOT restarted (click "Relaunch" at bottom of flags page)');
    console.log('  2. "Optimization Guide On Device Model" flag is missing or disabled');
    console.log('  3. Browser is too old (Need Chrome 128+ or Edge 133+)');
    console.log('  4. Not running in a secure context (HTTPS or localhost)');
  }
  
  // Check 2: languageModel available
  if ('ai' in window) {
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
      console.log('  Capabilities state:', capabilities.available);
      
      if (capabilities.available === 'readily') {
        console.log('  ✅ Model READY TO USE');
      } else if (capabilities.available === 'after-download') {
        console.log('  ⏳ Model needs download (~2.5 GB)');
        console.log('     Triggering download now...');
        try {
          // Attempt to wake up the model
          const session = await window.ai.languageModel.create();
          console.log('     Download triggered. Monitor progress in chrome://components > Optimization Guide On Device Model');
          session.destroy();
        } catch (e) {
          console.log('     Could not trigger download:', e.message);
        }
      } else {
        console.log('  ❌ Model not available:', capabilities.available);
      }
    } catch (error) {
      console.log('  ❌ Error getting capabilities:', error.message);
    }
  }
  
  console.log('\n=== COMPLETE SETUP STEPS ===');
  console.log('1. Go to chrome://flags (or edge://flags)');
  console.log('2. Enable "Prompt API for Gemini Nano" (Chrome) or "Prompt API for Phi mini" (Edge)');
  console.log('3. IMPORTANT: Search for "Optimization Guide On Device Model" and set to "Enabled BypassPrefRequirement"');
  console.log('4. Click "Relaunch" button at the bottom (closing window is not enough)');
  console.log('5. Go to chrome://components (or edge://components)');
  console.log('6. Find "Optimization Guide On Device Model"');
  console.log('7. Click "Check for update" to ensure model is downloaded (version shouldn\'t be 0.0.0.0)');
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
