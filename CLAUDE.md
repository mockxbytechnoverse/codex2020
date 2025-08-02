# CLAUDE.md - VizualAI Browser Tools Development Guide

## Project Overview

VizualAI Browser Tools is a comprehensive browser automation and AI integration system consisting of three main components:

- **Chrome Extension**: Data capture, screenshots, screen recording, and interactive features
- **Node.js Server**: Middleware bridge with file storage and WebSocket management
- **MCP Server**: Model Context Protocol implementation for AI tool integration

## Commands

### Development Setup

```bash
# Chrome Extension (no build required - vanilla JS)
cd chrome-extension/
# Load unpacked extension in Chrome Developer Mode

# Node.js Server
cd browser-tools-server/
npm install
npm run dev          # Development with hot reload
npm start           # Production

# MCP Server
cd browser-tools-mcp/
npm install
npm run build       # TypeScript compilation
npm start          # Run MCP server
```

### Testing

```bash
# Node.js Server
cd browser-tools-server/
npm test           # Run test suite
npm run lint       # ESLint checks

# MCP Server
cd browser-tools-mcp/
npm test           # Run test suite
npm run lint       # TypeScript/ESLint checks
```

### Debugging

```bash
# View extension logs
# Chrome DevTools → Extensions → VizualAI → service worker

# View server logs
cd browser-tools-server/
npm run dev        # Console output with debug info

# Test WebSocket connection
# Use browser DevTools → Network → WS tab
```

## Architecture

### Design Patterns

#### **Message Passing Architecture**

- Extension components communicate via `chrome.runtime.sendMessage()`
- Background script acts as central message router
- WebSocket for real-time communication with Node server
- MCP protocol for AI tool integration

#### **Modular Component Structure**

```
chrome-extension/
├── popup.html/js          # Main user interface
├── background.js          # Service worker & message routing
├── content-script.js      # Page injection & DOM interaction
├── devtools.js           # Chrome DevTools integration
├── recording-bar.js      # Recording UI overlay
└── panel.js              # DevTools panel interface
```

#### **Permission Management**

- Progressive permission requests (tab → desktop → microphone)
- Persistent state management via `chrome.storage.local`
- Graceful fallbacks for denied permissions

#### **Error Handling Strategy**

- Comprehensive try-catch blocks with specific error types
- User-friendly notifications via `chrome.notifications`
- Fallback mechanisms for API failures
- Detailed console logging for debugging

### Key Components

#### **Screenshot System**

- **Trigger**: Popup button → Background script → Server
- **Capture**: `chrome.tabs.captureVisibleTab()` API
- **Processing**: Base64 PNG → HTTP POST → File storage
- **Integration**: WebSocket for real-time AI requests

#### **Recording System**

- **Tab Recording**: `chrome.tabCapture` with audio mixing
- **Desktop Recording**: `chrome.desktopCapture` with microphone
- **UI**: Recording bar with laser pointer, pause/mute controls
- **Storage**: WebM files with metadata to server

#### **Server Bridge**

- **Identity Validation**: Server signature verification
- **Auto-discovery**: Multiple port scanning for connection
- **File Management**: Timestamped storage with path customization
- **macOS Integration**: AppleScript auto-paste into Cursor

## Code Style

### JavaScript/TypeScript Conventions

```javascript
// Use camelCase for variables and functions
const screenshotButton = document.getElementById("screenshot-btn");

// Use PascalCase for classes and constructors
class BrowserConnector {
  constructor() {}
}

// Use UPPER_SNAKE_CASE for constants
const SCREENSHOT_FORMAT = "png";
const DEFAULT_SERVER_PORT = 3025;

// Prefer const/let over var
const isRecording = false;
let recordingStartTime = null;

// Use async/await over Promise chains
async function captureScreenshot() {
  try {
    const result = await chrome.tabs.captureVisibleTab();
    return result;
  } catch (error) {
    console.error("Screenshot capture failed:", error);
    throw error;
  }
}
```

### CSS Conventions

```css
/* Use BEM-like naming for classes */
.pill-button {
}
.pill-button--recording {
}
.pill-button__icon {
}

/* Use CSS custom properties for theming */
:root {
  --primary-color: #1d1d1f;
  --accent-color: #ff3b30;
  --border-radius: 8px;
}

/* Mobile-first responsive design */
.container {
  width: 100%;
}

@media (min-width: 768px) {
  .container {
    max-width: 400px;
  }
}
```

### File Organization

- One component per file when possible
- Group related functionality (recording, screenshots, etc.)
- Clear separation of concerns (UI, logic, API calls)
- Consistent naming: `kebab-case.js` for files

## Workflow

### Development Process

#### **1. Feature Development**

1. Create feature branch: `feat/feature-name`
2. Update relevant documentation in `docs/`
3. Implement changes with comprehensive error handling
4. Test across Chrome/Edge browsers
5. Update CLAUDE.md if architecture changes

#### **2. Testing Procedures**

```bash
# Manual Testing Checklist
# □ Extension loads without errors
# □ Popup interface responds correctly
# □ Screenshot capture works on various sites
# □ Recording functionality (tab + desktop)
# □ Server connection and auto-discovery
# □ Permission handling (grant/deny scenarios)
# □ Error notifications display properly
```

#### **3. Extension Testing**

- Load unpacked extension in Chrome Developer Mode
- Test on various websites (HTTP, HTTPS, chrome://)
- Verify WebSocket connections in Network tab
- Check console for errors in all contexts

#### **4. Server Integration Testing**

- Start both Node and MCP servers
- Test WebSocket communication
- Verify file storage paths
- Test cross-platform compatibility (macOS, Windows, Linux)

### Release Process

1. Update version in `manifest.json`
2. Test full workflow end-to-end
3. Package extension for distribution
4. Update documentation and changelog

---

# 🎯 PLANNED ENHANCEMENT: Interactive Screenshot Annotation

## Feature Overview

Enhance the screenshot functionality to include a review and annotation interface, allowing users to markup screenshots before saving.

## Design References

The following reference images in the `reference/` folder provide specific design guidance:

- **`screenshot_review.png`**: Layout and design for the full-screen review interface component
- **`screenshot_cursor_ref.png`**: Custom crosshair cursor design for screenshot selection mode
- **`screenshot_click_and_drag_ref.png`**: Visual feedback for click-and-drag selection behavior
- **`chrome-extension/VizualAI_variantA_tighter_clean.png`**: Brand colors for VizualAI gradient (cyan to purple)

## Feature Requirements

### 1. Screenshot Review Interface _(Reference: `reference/screenshot_review.png`)_

- **Separate Component**: Full-screen review interface as standalone page/modal
- **Clean Professional UI**: Modern design matching the reference layout
- **Screenshot Display**: Large centered image preview with proper scaling
- **Action Buttons**:
  - Primary "Save" button (bottom right)
  - Secondary "Retake" button
  - "Annotate" button to enter annotation mode
  - "Cancel" button to discard
- **Description Input**: Optional text field for context (bottom area)
- **Responsive Layout**: Adapts to different screen sizes while maintaining proportions

### 2. Post-Capture Cursor Behavior _(Reference: `reference/screenshot_cursor_ref.png`)_

- **Custom Cursor**: After clicking "Capture Screenshot", cursor changes to crosshair/target style
- **Visual Feedback**: Clear indication that user is in screenshot selection mode
- **Crosshair Design**: Professional crosshair cursor matching the reference image
- **Hover States**: Maintain cursor consistency during selection process

### 3. Click & Drag Selection _(Reference: `reference/screenshot_click_and_drag_ref.png` + `chrome-extension/VizualAI_variantA_tighter_clean.png`)_

- **Selection Overlay**: Semi-transparent colored overlay during drag selection
- **VizualAI Brand Colors**: Use gradient colors from VizualAI logo:
  - Primary: `#22D3EE` (cyan from logo)
  - Secondary: `#C084FC` (purple from logo)
  - Opacity: ~30% transparency for overlay
- **Selection Rectangle**: Clean bordered selection area
- **Visual Feedback**: Real-time selection rectangle with smooth animations
- **Professional Finish**: Maintain clean, professional appearance throughout interaction

### 4. Annotation Tools

- **Text Tool**: Click to add text annotations with customizable font/color
- **Circle Tool**: Click and drag to draw circles for highlighting
- **Arrow Tool**: Click and drag to draw directional arrows
- **Basic Controls**: Undo, Clear All, Tool selection
- **Brand Consistency**: Use VizualAI color palette for annotation tools

### 5. Save with Description & Metadata

- **Optional Description**: Text input for screenshot context
- **JSON Metadata File**: Separate JSON file tied to screenshot with metadata
- **Browser Logs Option**: Checkbox to include browser console logs with screenshot
- **Save Options**: Save annotated version, original, or both
- **File Naming**: Include annotation indicator in filename
- **Linked Files**: JSON metadata file with matching filename structure

### 6. Browser Logs Integration

- **Review Stage Checkbox**: "Include browser logs" option in review interface
- **Console Data Capture**: Current console logs, errors, warnings, and network activity
- **JSON Storage**: Browser logs stored in companion JSON metadata file
- **Privacy Consideration**: Optional feature - user can choose to include or exclude logs

## Technical Implementation Plan

### Phase 1: Review Interface (Week 1)

```javascript
// New files to create:
chrome-extension/
├── screenshot-review.html     # Separate full-screen review interface (ref: screenshot_review.png)
├── screenshot-review.js       # Review logic, UI handling, navigation
├── screenshot-review.css      # Professional styling matching reference design
├── cursor-selection.js        # Crosshair cursor and click-drag selection logic
└── cursor-crosshair.png       # Custom crosshair cursor image asset

// Modifications:
├── popup.js                   # Add cursor change and selection workflow
├── background.js              # Handle review workflow and selection messages
├── popup.css                  # VizualAI brand colors for selection overlay
└── manifest.json              # Add permissions for console log access
```

### Phase 2: Annotation Canvas (Week 2)

```javascript
// New annotation system:
chrome-extension/
├── annotation-canvas.js       # HTML5 Canvas drawing logic
├── annotation-tools.js        # Tool selection and management
└── annotation-utils.js        # Drawing primitives (circle, arrow, text)

// Integration:
├── screenshot-review.js       # Integrate canvas with review
└── popup.js                   # Handle annotation workflow
```

### Phase 3: Enhanced Save System (Week 3)

```javascript
// Server enhancements:
browser-tools-server/
├── browser-connector.ts       # Handle annotated screenshots + JSON metadata
└── metadata-handler.js        # JSON file creation and browser logs processing

// Extension updates:
chrome-extension/
├── screenshot-review.js       # Generate combined image data + metadata
├── browser-logs-capture.js    # Console, network, and error log collection
├── metadata-composer.js       # JSON metadata file generation
└── background.js              # Send annotated data + metadata to server
```

## User Experience Flow

```
1. User clicks "Capture Screenshot"
   ↓
2. Cursor changes to crosshair (reference: screenshot_cursor_ref.png)
   - Visual feedback: Custom crosshair cursor
   - User can click and drag to select area
   ↓
3. Click & Drag Selection (reference: screenshot_click_and_drag_ref.png)
   - Real-time selection rectangle with VizualAI brand colors
   - Semi-transparent overlay (~30% opacity)
   - Smooth visual feedback during selection
   ↓
4. Screenshot captured → Review Interface opens (reference: screenshot_review.png)
   - Full-screen separate component
   - Large centered image preview
   - Clean professional UI layout
   ↓
5. Review Options: [Save] [Annotate] [Retake] [Cancel]
   - Primary Save button (bottom right)
   - Secondary action buttons
   - Optional description input field
   - "Include browser logs" checkbox option
   ↓
6. If Annotate → Annotation Interface
   - Canvas overlay with original screenshot
   - Tool palette: Text, Circle, Arrow (VizualAI colors)
   - Undo/Clear controls
   ↓
7. Final Save Interface
   - Optional description input (carried from review stage)
   - Preview of final image (original + annotations)
   - Save button with filename preview
   ↓
8. Files saved with matching timestamps:
   - Screenshot: "screenshot-annotated-2024-01-01T12-00-00-000Z.png"
   - Metadata: "screenshot-annotated-2024-01-01T12-00-00-000Z.json"
```

## Technical Specifications

### Review Interface Component

- **Implementation**: Separate HTML page/modal (`screenshot-review.html`)
- **Layout**: Full-screen interface with centered image display
- **Navigation**: Standalone component accessible from popup
- **Responsive**: Adapts to various screen sizes while maintaining aspect ratios
- **Design System**: Modern, clean interface matching `reference/screenshot_review.png`

### Cursor & Selection System

- **Custom Cursor**: CSS cursor property with crosshair image (`reference/screenshot_cursor_ref.png`)
- **Selection Overlay**: HTML5 Canvas or SVG for real-time selection rectangle
- **Brand Colors**:
  ```css
  --vizual-cyan: #22d3ee;
  --vizual-purple: #c084fc;
  --selection-opacity: 0.3;
  ```
- **Animation**: `requestAnimationFrame` for smooth selection feedback
- **Cross-browser**: Compatible cursor behavior across Chrome/Edge

### Canvas Implementation

- **Technology**: HTML5 Canvas API for annotation layer
- **Overlay**: Transparent canvas positioned over screenshot image
- **Export**: Composite final image (screenshot + annotations)
- **Responsive**: Scale annotations proportionally with image scaling
- **Memory Management**: Clear canvas data after save to prevent leaks

### Tool Specifications

- **Text Tool**: Click to place, type to edit, drag to move
- **Circle Tool**: Click-drag from center, visual feedback during draw
- **Arrow Tool**: Click-drag from start to end point, arrowhead auto-generated
- **VizualAI Color Palette**:
  - Primary: `#22D3EE` (cyan)
  - Secondary: `#C084FC` (purple)
  - Text: `#1d1d1f` (dark)
  - Accent: `#ff3b30` (red for highlights)
- **Stroke Width**: Fixed widths (2px, 4px, 6px) for consistency

### Storage Format

```javascript
// JSON Metadata File (screenshot-annotated-2024-01-01T12-00-00-000Z.json)
{
  screenshot: {
    filename: "screenshot-annotated-2024-01-01T12-00-00-000Z.png",
    originalPath: "/path/to/screenshot.png",
    timestamp: "2024-01-01T12:00:00.000Z",
    url: "https://example.com/page",
    pageTitle: "Example Page Title"
  },

  userInput: {
    description: "User provided description of the screenshot",
    includeBrowserLogs: true
  },

  annotations: [
    {
      type: "text",
      x: 100, y: 50,
      content: "Bug here",
      fontSize: 14,
      color: "#ff0000"
    },
    {
      type: "circle",
      centerX: 200, centerY: 100,
      radius: 30,
      strokeColor: "#22d3ee",
      strokeWidth: 2
    },
    {
      type: "arrow",
      startX: 50, startY: 75,
      endX: 150, endY: 125,
      strokeColor: "#c084fc",
      strokeWidth: 3
    }
  ],

  browserLogs: {
    console: [
      {
        level: "error",
        message: "Failed to load resource",
        timestamp: "2024-01-01T12:00:00.123Z",
        source: "network"
      },
      {
        level: "warn",
        message: "Deprecated API usage",
        timestamp: "2024-01-01T12:00:00.456Z",
        source: "console"
      }
    ],
    network: [
      {
        url: "https://api.example.com/data",
        method: "GET",
        status: 404,
        timestamp: "2024-01-01T12:00:00.789Z"
      }
    ],
    errors: [
      {
        message: "TypeError: Cannot read property 'value' of null",
        stack: "at function1() line 42",
        timestamp: "2024-01-01T12:00:00.999Z"
      }
    ]
  }
}
```

## Success Metrics

- [ ] Screenshot review interface loads within 500ms
- [ ] Annotation tools respond without lag (<100ms)
- [ ] Final annotated image maintains original quality
- [ ] Compatible with existing server storage system
- [ ] JSON metadata file creation succeeds 100% of the time
- [ ] Browser logs capture works across all supported browser types
- [ ] Description and checkbox state persists through annotation workflow
- [ ] Graceful fallback if annotation fails
- [ ] Privacy: Browser logs only included when user explicitly checks option

## Risk Mitigation

- **Performance**: Use requestAnimationFrame for smooth drawing
- **Memory**: Clear canvas data after save to prevent leaks
- **Compatibility**: Test across Chrome/Edge versions
- **Fallback**: Always preserve original screenshot option
- **Error Handling**: Comprehensive try-catch with user feedback
- **Privacy**: Browser logs collection only with explicit user consent
- **JSON Integrity**: Validate JSON structure before saving to prevent corruption
- **Browser Logs Size**: Limit log collection to recent entries to prevent large files
- **Storage Failures**: Graceful handling if JSON metadata save fails (save image anyway)
- **Permissions**: Ensure proper Chrome extension permissions for console access

This enhancement will significantly improve the screenshot functionality by adding interactive review and annotation capabilities while maintaining the existing simple capture workflow for users who prefer it.
