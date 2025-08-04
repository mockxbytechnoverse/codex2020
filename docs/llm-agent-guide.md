# LLM Agent Guide to BrowserTools MCP

This guide is designed for LLM agents who need to understand and build upon the BrowserTools MCP codebase. It provides a detailed map of the codebase structure, file responsibilities, and identifies deprecated components.

## 🎯 Purpose & Overview

BrowserTools MCP enables AI-powered browser debugging through three interconnected components:

1. **Chrome Extension**: Captures browser data and provides UI
2. **Node.js Server**: Middleware and storage handler
3. **MCP Server**: Protocol implementation for AI tools

## 📁 Project Structure & File Responsibilities

### Chrome Extension (`/chrome-extension/`)

#### ✅ Active Core Files

**Manifest & Configuration**

- `manifest.json` - Extension configuration, permissions, entry points
  - Uses Manifest V3
  - No default popup - uses overlay UI triggered by extension icon click
  - Defines content scripts and service worker

**Background Service Worker**

- `background.js` (1731 lines) - Main orchestrator
  - Handles all Chrome API interactions
  - WebSocket connection management
  - Screenshot and recording coordination
  - Message routing between components
  - Desktop capture setup

**Content Scripts**

- `content-script.js` (1467 lines) - Main content injection

  - Creates in-page overlay UI
  - Handles DOM element selection
  - Manages cursor tracking
  - Injects recording UI components

- `content-recording.js` (433 lines) - Recording functionality
  - MediaRecorder management
  - Stream handling for tab/desktop recording
  - Audio mixing (tab + microphone)
  - Video data collection and upload

**DevTools Integration**

- `devtools.html` (12 lines) - DevTools page entry
- `devtools.js` (1171 lines) - DevTools panel logic

  - Console log capture
  - Network request monitoring
  - WebSocket communication
  - Log filtering and management

- `panel.html` (398 lines) - DevTools panel UI
- `panel.js` (1206 lines) - Panel functionality
  - Settings management
  - Recording controls
  - Screenshot triggers
  - Auto-paste configuration

**Recording Components**

- `recording-bar.js` (609 lines) - Floating recording controls

  - Pause/resume/stop buttons
  - Timer display
  - Mute controls
  - Cross-tab communication

- `laser-pointer.js` (218 lines) - Annotation system
  - Red dot cursor overlay
  - Drawing functionality
  - SVG-based annotations
  - Auto-cleanup after 3 seconds

**Screenshot System**

- `screenshot-review.html` (97 lines) - Review interface
- `screenshot-review.css` (447 lines) - Review styling
- `screenshot-review.js` (497 lines) - Review functionality
  - Screenshot preview
  - Resize/crop tools
  - Copy to clipboard
  - File management

**Utility Scripts**

- `cursor-selection.js` (501 lines) - Element selection

  - Hover detection
  - Element highlighting
  - XPath generation
  - Selection state management

- `browser-logs-capture.js` (151 lines) - Log interception
  - Console method overrides
  - XHR/Fetch interception
  - Error capturing
  - Data formatting

**Glass UI System**

- `glass-components.css` (327 lines) - Glass UI components for overlay
- `glass-performance.css` (159 lines) - Performance styles
- `glass-accessibility.css` (222 lines) - Accessibility styles

**Assets**

- `icon.svg` - Extension icon
- `VizualAI_variantA_tighter_clean.svg` - Main logo used in overlay

**Deprecated Files**

- `old_files_ignore/` - Contains deprecated popup implementations and unused assets

### Node.js Server (`/browser-tools-server/`)

**Core Files**

- `browser-connector.ts` - WebSocket server and API endpoints
- `puppeteer-service.ts` - Browser automation for audits
- `lighthouse/` - Audit implementations
  - `index.ts` - Lighthouse runner
  - `accessibility.ts` - WCAG compliance checks
  - `performance.ts` - Core Web Vitals analysis
  - `seo.ts` - SEO optimization checks
  - `best-practices.ts` - Security and best practices
  - `types.ts` - TypeScript definitions

### MCP Server (`/browser-tools-mcp/`)

**Core Files**

- `mcp-server.ts` - Protocol implementation and tool registration

## 🎨 UI Architecture

### How the UI Works (No Popups!)

1. **Extension Icon Click** → Triggers `chrome.action.onClicked` in background.js
2. **Background Script** → Sends `TOGGLE_OVERLAY` message to content script
3. **Content Script** → Shows/hides the floating glass overlay UI
4. **DevTools Panel** → Separate UI for developer tools (F12 → BrowserTools tab)

The overlay UI is the primary interface, not popup files!

## 🔄 Data Flow Patterns

### Message Flow

```
User Action → Content Script → Background Script → WebSocket → Node Server → MCP Server → AI Tool
```

### Key Message Types

- `START_RECORDING_WITH_STREAM_ID` - Tab recording initiation
- `START_DESKTOP_RECORDING_WITH_STREAM_ID` - Desktop recording
- `STOP_RECORDING_FROM_BAR` - Stop from any tab
- `CAPTURE_SCREENSHOT` - Screenshot request
- `UPDATE_SETTINGS` - Settings synchronization

## 🛠️ Building Upon the Codebase

### Adding New Features

1. **New MCP Tool**

   - Add tool definition in `mcp-server.ts`
   - Implement endpoint in `browser-connector.ts`
   - Add Chrome API calls in `background.js`

2. **New UI Component**

   - Use the glass UI system (active CSS files)
   - Add to `content-script.js` for in-page UI
   - Or extend `panel.js` for DevTools UI

3. **New Audit Type**
   - Create new file in `browser-tools-server/lighthouse/`
   - Add endpoint in `browser-connector.ts`
   - Register tool in `mcp-server.ts`

### Code Patterns to Follow

**WebSocket Communication**

```javascript
// In extension
chrome.runtime.sendMessage({
  action: "YOUR_ACTION",
  data: payload,
});

// In background.js
if (ws && ws.readyState === WebSocket.OPEN) {
  ws.send(JSON.stringify({ type: "your-type", data }));
}
```

**Chrome API Usage**

```javascript
// Always check permissions first
chrome.permissions.contains({ permissions: ["tabCapture"] }, (result) => {
  if (result) {
    // Proceed with API call
  }
});
```

**Error Handling**

```javascript
try {
  // Chrome API call
} catch (error) {
  console.error("[BrowserTools]", error);
  sendResponse({ error: error.message });
}
```

## ⚠️ Common Pitfalls

1. **UI Architecture** - The extension uses an overlay UI triggered by clicking the extension icon, not a traditional popup. All deprecated popup files have been moved to `old_files_ignore/`.

2. **WebSocket state** - Always check connection state before sending messages.

3. **Chrome API callbacks** - Many Chrome APIs still use callbacks, not promises.

4. **Cross-origin restrictions** - Content scripts can't access cross-origin iframes.

5. **Service worker lifecycle** - Background script can be terminated and restarted.

## 🔍 Debugging Tips

1. **Extension Logs**: Check chrome://extensions → Details → Inspect service worker
2. **Content Script Logs**: Regular browser console on the page
3. **DevTools Panel Logs**: Undock DevTools and inspect the panel
4. **Node Server Logs**: Terminal output where server is running
5. **WebSocket Traffic**: Network tab in DevTools

## 📝 Code Organization

### Current Structure

The codebase has been cleaned up with deprecated files moved to `chrome-extension/old_files_ignore/`.

### Refactoring Opportunities

1. Consolidate message types into constants file
2. Extract WebSocket logic into separate module
3. Unify error handling patterns
4. Add TypeScript to Chrome extension

## 🚀 Quick Start for New Features

1. **Understand the flow**: User → Extension → Server → MCP → AI
2. **Start with MCP tool**: Define what the AI needs
3. **Work backwards**: Implement server endpoint, then extension
4. **Test incrementally**: Use the DevTools panel for debugging
5. **Follow patterns**: Copy existing tool implementations

Remember: The overlay UI in content-script.js is the primary user interface. All deprecated popup files have been moved to `old_files_ignore/` for reference.
