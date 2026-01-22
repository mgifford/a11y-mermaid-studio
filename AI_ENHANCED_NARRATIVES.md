# AI-Enhanced Narratives Feature

## Overview

A11y Mermaid Studio now includes **optional AI-enhanced narrative generation** using local browser AI (Gemini Nano). This feature provides intelligent improvements to diagram narratives while maintaining complete user privacy—all processing happens locally in the browser.

### Browser Support

| Browser | Support | OS Requirements | Model |
|---------|---------|-----------------|-------|
| **Chrome** | 128+ | Windows 11 24H2+, macOS 15.1+, Linux pending | Gemini Nano |
| **Edge** | 133+ | Windows 11 24H2+, macOS 15.1+, Linux pending | Gemini Nano |
| **Others** | ❌ Not available | N/A | N/A |

**Requirement**: Must enable feature flag at `chrome://flags/#prompt-api-for-ai`

**To explore available features**, open the browser console and run:
```javascript
getBrowserAIDiagnostics()
```
This shows your browser's AI support matrix, OS requirements, and current settings.

## What It Does

The AI enhancement:
1. **Reviews** the automatically generated narrative against the diagram source
2. **Validates** accuracy of the structural description  
3. **Considers visual context** from the generated SVG
4. **Improves** clarity and readability for the target audience
5. **Adapts** technical detail level based on audience settings

**Key Principle**: The AI enhances but never replaces the baseline accessibility. All diagrams receive structural narratives even without AI.

## How It Works

### Detection & Opt-In

When you first load the application:

1. **Availability Check**: The app checks if `window.ai.languageModel` is available
2. **One-Time Prompt**: If available, a friendly prompt appears: "Try Local AI Browser Enhancement?"
3. **User Choice**: Enable or decline—this preference is saved in browser storage
4. **Never Asks Again**: The choice is remembered permanently (can be changed in settings)

### AI Enhancement Process

When enabled and a diagram is rendered:

1. **Baseline Generation**: Standard narrative is created first (always works)
2. **SVG Context Extraction**: Visual elements and accessible structure from the generated SVG
3. **AI Review**: The AI analyzes:
   - Diagram type and structure
   - Current narrative accuracy
   - Visual context and semantic structure
   - Target audience requirements
4. **Response**:
   - **"Narrative is accurate."** → Shows green checkmark, keeps original
   - **Improved narrative** → Shows both AI version and original (in collapsible section)

### Visual Context in AI Analysis

The AI doesn't just read the text—it also considers:
- **Visual Elements**: Text labels and visual components detected in the SVG
- **Semantic Structure**: Whether the SVG has accessible `role="list"` and `role="listitem"` containers
- **Alignment**: Ensures the narrative accurately describes what's visually present

This makes AI improvements more accurate and grounded in actual diagram visuals.

### Privacy & Security

- ✅ **100% Local**: All AI processing happens in your browser
- ✅ **No Network Calls**: Diagram data never leaves your device
- ✅ **No Tracking**: No analytics or data collection
- ✅ **Optional**: Completely opt-in, works fine without AI
- ✅ **Visual-Aware**: AI sees visual structure but performs no external analysis

## User Interface

### Initial Opt-In Prompt

```
┌─────────────────────────────────────────────────┐
│ 🤖 Try Local AI Browser Enhancement?           │
│                                                  │
│ Your browser has built-in AI that can help     │
│ improve diagram narratives. The AI runs         │
│ locally—no data is sent to external servers.   │
│                                                  │
│ [Enable AI Enhancement]  [Not Now]             │
└─────────────────────────────────────────────────┘
```

### AI Settings Modal

Access via the "⚙️ AI Settings" button (visible only when AI is available):

- **Enable/Disable Toggle**: Turn AI enhancement on/off
- **Audience Selector**: Choose narrative style:
  - **General** (mixed backgrounds)
  - **Technical** (developers & engineers)
  - **Non-Technical** (business & stakeholders)
  - **Students** (learning context)
  - **Executives** (high-level insights)

### Narrative Display

**When AI approves**:
```
[Original narrative content]

┌────────────────────────────────┐
│ ✓ AI Review: Narrative is     │
│   accurate.                     │
└────────────────────────────────┘
```

**When AI improves**:
```
[Title and description]

🤖 AI-Enhanced Narrative
[Improved narrative content]

▼ Show original structural narrative
  [Original narrative in collapsible section]
```

## Technical Implementation

### Browser API Requirements

**Chrome/Edge AI API (Gemini Nano)**:
- Chrome 128+, Edge 133+ with AI features enabled
- Check availability: `window.ai?.languageModel?.capabilities()`
- Capabilities statuses: `'readily'`, `'after-download'`, `'no'`
- Model size: ~2.5 GB (downloaded once, cached locally)

**To explore what your browser supports:**
```javascript
// Run in browser console:
getBrowserAIDiagnostics()
```

This displays:
- Browser version and AI API availability
- Operating system and requirements
- Current AI settings (enabled/disabled, audience)
- Support matrix for different browsers
- Model storage and processing details

### State Management

```javascript
STATE = {
  aiAvailable: false,      // Detected at startup
  aiSession: null,         // Created on first use
  aiEnabled: null,         // null = not asked, true/false = user choice
  aiAudience: 'general'    // Target audience setting
}
```

### localStorage Keys

- `a11y-mermaid-ai-enabled`: `"true"` or `"false"`
- `a11y-mermaid-ai-audience`: `"general"`, `"technical"`, `"nontechnical"`, `"students"`, or `"executives"`

### AI Prompt Structure

The AI receives:
1. **Context**: Diagram type, title, description
2. **Visual Context**: SVG elements, semantic structure, detected labels
3. **Current Narrative**: HTML content (stripped to plain text)
4. **Original Source**: Full Mermaid code
5. **Target Audience**: Description of who will read this
6. **Task**: Review for accuracy and visual alignment, suggest improvements if needed

**Response Format**:
- If accurate: Exactly `"Narrative is accurate."`
- If improvements: Plain HTML using `<p>`, `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>` tags

**SVG Context Example**:
```
VISUAL CONTEXT FROM SVG:
The diagram has accessible semantic structure (role="list" containers with role="listitem" elements).
Visual elements detected: Start, Decision Node, Process, End.
```

### Function Flow

```javascript
generateDiagramNarrative(source, metadata)
  ├─> showAIOptInPrompt() // First render only
  ├─> detectDiagramType()
  ├─> generate*Narrative() // Type-specific
  ├─> Display baseline
  └─> if (aiEnabled)
      ├─> extractSVGContext() // Get visual structure
      ├─> enhanceNarrativeWithAI()
      │   ├─> Create AI session (if needed)
      │   ├─> Build prompt with SVG context
      │   ├─> Send prompt to Gemini Nano
      │   ├─> Parse response
      │   └─> Return improved narrative
      └─> Update UI (show AI improvement or checkmark)
```

### New Function: extractSVGContext()

```javascript
/**
 * Extracts visual context from generated SVG
 * Returns text summary of accessible structure and visual elements
 */
function extractSVGContext() {
  // Finds text labels in SVG (limited to 20 labels)
  // Checks for accessible semantic structure (role="list", role="listitem")
  // Returns context string for AI prompt
}
```

This ensures the AI makes improvements grounded in actual visual elements, not just the Mermaid source.

## Configuration

### Audience Descriptions

| Audience | AI Behavior |
|----------|-------------|
| **General** | Mixed technical backgrounds—balanced detail |
| **Technical** | Developers & engineers—preserves technical terms |
| **Non-Technical** | Business users—simplifies jargon |
| **Students** | Learning context—adds educational framing |
| **Executives** | Decision-makers—focuses on high-level insights |

### AI Model Parameters

```javascript
{
  temperature: 0.7,  // Balanced creativity/consistency
  topK: 3           // Limited response variety
}
```

## Graceful Degradation

The feature degrades gracefully across browsers:

| Browser | Behavior |
|---------|----------|
| **Chrome 128+ with AI** | Full AI enhancement available |
| **Chrome without AI** | No prompt shown, standard narratives work |
| **Other browsers** | No prompt shown, standard narratives work |
| **Network offline** | AI works (local model) |
| **AI model downloading** | Prompt shown, works after download |

## User Benefits

### For All Users
- Always get baseline structural narratives
- No degradation if AI unavailable
- Fast, responsive interface

### For AI Users
- Improved narrative clarity
- Audience-specific language
- Validation of accuracy
- Learning opportunity (compare narratives)

### For Privacy-Conscious Users
- Completely optional
- Local processing guarantee
- No tracking or analytics
- Can disable anytime

## Implementation Best Practices

### Progressive Enhancement
```javascript
// Never require AI for core functionality
if (STATE.aiEnabled) {
  await enhanceNarrativeWithAI();
} else {
  // Standard narrative already displayed
}
```

### Error Handling
```javascript
try {
  const enhancement = await enhanceNarrativeWithAI();
  // Use if available
} catch (error) {
  console.error('[AI] Enhancement failed:', error);
  // Keep baseline narrative
}
```

### Performance
- AI session created once, reused
- Baseline narrative shows immediately
- AI runs asynchronously
- No blocking of UI

## Future Enhancements

**Planned**:
1. **Diagram-specific prompts**: Different strategies per diagram type
2. **Multi-language support**: Translate narratives to user's language
3. **Accessibility scoring**: AI suggests accessibility improvements
4. **Custom audiences**: User-defined audience profiles

**Under Consideration**:
1. **Diagram repair**: AI suggests fixes for malformed Mermaid
2. **Annotation generation**: Auto-generate `accTitle`/`accDescr`
3. **Alternative descriptions**: Multiple narrative styles
4. **Voice output**: Integration with speech synthesis

## Testing

### Manual Testing

**Test in Chrome 128+**:
1. Open DevTools → Application → Storage
2. Clear `localStorage`
3. Reload page
4. Render a diagram
5. Verify prompt appears
6. Test both "Enable" and "Not Now"
7. Verify choice persists across reloads

**Test Audience Settings**:
1. Click "⚙️ AI Settings"
2. Change audience selector
3. Save settings
4. Render diagram
5. Verify narrative adapts to audience

### Automated Testing

Currently not automated (requires Chrome AI API mock). Tests verify:
- ✅ Core narratives work without AI
- ✅ Preference storage/retrieval
- ✅ UI elements exist
- ✅ Async narrative generation

## Browser Compatibility

| Feature | Chrome 128+ | Chrome <128 | Firefox | Safari |
|---------|-------------|-------------|---------|--------|
| Standard Narratives | ✅ | ✅ | ✅ | ✅ |
| AI Detection | ✅ | ❌ | ❌ | ❌ |
| AI Enhancement | ✅ | ❌ | ❌ | ❌ |
| Opt-In Prompt | ✅ | ❌ | ❌ | ❌ |
| Settings UI | ✅ | ❌ | ❌ | ❌ |

## References

### Chrome AI Documentation
- [Chrome Built-in AI](https://developer.chrome.com/docs/ai/built-in)
- [Gemini Nano](https://ai.google.dev/gemini-api/docs/models/gemini#gemini-nano)
- [Language Model API](https://github.com/explainers-by-googlers/prompt-api)

### Implementation Files
- `app.js` — Core AI logic
- `index.html` — Settings modal UI
- `STATE` — AI state management

---

**Version**: 0.2.0  
**Date**: January 22, 2026  
**Feature Status**: ✅ Implemented  
**Tests**: 110/110 passing (AI feature not yet unit tested)
