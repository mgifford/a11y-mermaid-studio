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
  
  if (navigator.userAgent.includes('Mac OS X 10_15_7')) {
     console.log('ℹ️ Note: User Agent reports macOS 10.15.7. This is standard privacy freezing by Chrome.');
     console.log('   Ensure your actual OS is macOS 15.1+ (Sequoia) for built-in AI support.');
  }

  // Check 1: window.ai exists
  console.log('\nCheck 1: window.ai available?', 'ai' in window);
  if ('ai' in window) {
    console.log('  ✅ window.ai object found');
    console.log('  window.ai keys:', Object.keys(window.ai));
  } else {
    // Note: User Agent is often frozen at 10_15_7 on macOS, so we can't reliably detect OS version from it.
    console.log('  ❌ window.ai NOT found');
    console.log('  POSSIBLE CAUSES:');
    console.log('  1. Flag enabled but browser NOT restarted (click "Relaunch" at bottom of flags page)');
    console.log('  2. "Optimization Guide On Device Model" flag is missing or disabled');
    console.log('  3. Not logged into Chrome (Primary account often required for model download)');
    console.log('  4. Enterprise/Organization policy blocking "GenAI" or "Optimization Guide" features');
    console.log('  5. Browser is too old (Need Chrome 128+ or Edge 133+)');
    console.log('  6. Not running in a secure context (HTTPS or localhost)');
    console.log('  7. Insufficient disk space for model (~2.5GB required)');
    console.log('\n  DEBUG TIP: If optimization-guide-internals says "disabled", go to chrome://chrome-urls');
    console.log('  and click "enable debug pages" to see the logs.');
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
  console.log('6. Find "Optimization Guide On Device Model" in the components list');
  console.log('   If this component is MISSING entirely, the feature may not be available in your Chrome build/region.');
  console.log('7. If found, click "Check for update" to ensure model is downloaded (version shouldn\'t be 0.0.0.0)');
  console.log('\nADDITIONAL CHECKS:');
  console.log('- Ensure you are signed into Chrome with a Google account');
  console.log('- Check chrome://settings/languages - English (US) should be primary language');
  console.log('- Some builds/regions may not have this feature enabled yet');
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
