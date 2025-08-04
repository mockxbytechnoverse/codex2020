# Architecture

BrowserTools MCP is a powerful browser monitoring and interaction tool that enables AI-powered applications via Anthropic's Model Context Protocol (MCP) to capture and analyze browser data through a Chrome extension.

## System Overview

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌─────────────┐
│  MCP Client │ ──► │  MCP Server  │ ──► │  Node Server  │ ──► │   Chrome    │
│  (e.g.      │ ◄── │  (Protocol   │ ◄── │ (Middleware)  │ ◄── │  Extension  │
│   Cursor)   │     │   Handler)   │     │               │     │             │
└─────────────┘     └──────────────┘     └───────────────┘     └─────────────┘
```

The system consists of three main components:

## 1. Chrome Extension (chrome-extension/)

### Core Features

- **Data Capture**: Console logs, network requests, DOM elements
- **Screenshot Capture**: Using Chrome's tabs.captureVisibleTab API with auto-paste to Cursor
- **Screen Recording**: Tab and desktop recording with audio support
- **Interactive Overlay**: In-page UI for quick access to recording and screenshot features
- **Screenshot Review**: Dedicated interface for managing captured screenshots

### Recording Capabilities

- **Tab Recording**: Full browser tab capture with mixed tab/microphone audio
- **Desktop Recording**: Entire screen or window capture with microphone audio
- **Laser Pointer**: Drawing and annotation system during recordings
- **Recording Bar**: Floating controls for pause/resume/stop/mute during recording

### UI Components

- **Popup Interface**: Main extension UI with microphone controls and recording options
- **DevTools Panel**: Developer tools integration for logs and settings
- **Content Scripts**: Page injection for overlay UI and recording controls
- **Settings Management**: Server connection, log limits, auto-paste preferences

### Technical Details

- **Communication**: WebSocket connection with Node server
- **Storage**: Chrome storage API for user settings and recording states
- **Permissions**: activeTab, tabs, tabCapture, desktopCapture, storage, scripting, debugger

## 2. Node.js Server (browser-tools-server/)

### Core Functionality

- **Middleware**: Bridge between Chrome extension and MCP server
- **WebSocket Server**: Real-time bidirectional communication on port 3025
- **HTTP API**: RESTful endpoints for data access and control
- **File Management**: Local storage for screenshots and recordings

### Data Processing

- **Log Management**: Storage and retrieval of console/network logs with configurable limits
- **Data Sanitization**: Automatic removal of sensitive headers and cookies
- **Recording Processing**: WebM video file storage with metadata
- **Screenshot Storage**: PNG files saved to ~/Downloads/mcp-screenshots/

### Lighthouse Integration

- **Puppeteer Service**: Cross-platform browser automation
- **Audit Types**: Accessibility, Performance, SEO, Best Practices
- **Smart Limits**: Prioritized issue reporting based on severity
- **AI-Optimized Output**: Structured data format for LLM consumption

### API Endpoints

#### GET Endpoints

- `/console-logs` - Retrieve console logs
- `/console-errors` - Get console errors only
- `/network-errors` - Get failed network requests
- `/network-success` - Get successful network requests
- `/all-xhr` - Get all network requests
- `/selected-element` - Get currently selected DOM element

#### POST Endpoints

- `/capture-screenshot` - Trigger screenshot capture
- `/extension-log` - Receive logs from extension
- `/selected-element` - Update selected element
- `/wipelogs` - Clear all stored logs
- `/accessibility-audit` - Run WCAG accessibility audit
- `/performance-audit` - Run performance audit
- `/seo-audit` - Run SEO audit
- `/best-practices-audit` - Run best practices audit

## 3. MCP Server (browser-tools-mcp/)

### Protocol Implementation

- **MCP Compliance**: Full Model Context Protocol implementation
- **Tool Registration**: Exposes browser functionality as AI-callable tools
- **Auto-Discovery**: Finds Node server on ports 3025-3040
- **Error Handling**: Graceful fallbacks and informative error messages

### Available MCP Tools

#### Data Retrieval Tools

- `getConsoleLogs` - Retrieve all console logs
- `getConsoleErrors` - Get console errors only
- `getNetworkErrors` - Get failed network requests
- `getNetworkSuccess` - Get successful network requests
- `getNetworkLogs` - Get all network logs
- `getSelectedElement` - Get currently selected DOM element

#### Action Tools

- `takeScreenshot` - Capture screenshot of current tab
- `wipeLogs` - Clear all stored logs

#### Audit Tools

- `runAccessibilityAudit` - WCAG compliance audit
- `runPerformanceAudit` - Page performance analysis
- `runSEOAudit` - Search engine optimization audit
- `runBestPracticesAudit` - Web best practices audit
- `runNextJSAudit` - NextJS-specific SEO analysis

#### Meta Tools

- `runDebuggerMode` - Structured debugging workflow
- `runAuditMode` - Comprehensive audit sequence

## Key Workflows

### Screen Recording Workflow

#### Tab Recording

1. User clicks "Record tab" in popup or overlay
2. 3-second countdown displays, then popup closes
3. Background script obtains stream ID via `chrome.tabCapture.getMediaStreamId()`
4. Content script creates MediaRecorder with tab audio/video
5. Recording bar appears with pause/resume/stop controls
6. Video saved to ~/Downloads/mcp-recordings/ on stop

#### Desktop Recording

1. User clicks "Record desktop" (starts immediately)
2. Chrome's media picker allows screen/window selection
3. Recording bars injected into ALL tabs for control
4. MediaRecorder captures desktop with microphone audio
5. Any tab can control the recording via message routing
6. Video saved with metadata on stop

### Screenshot Capture Workflow

1. **Trigger**: AI calls `takeScreenshot` tool or user clicks screenshot button
2. **Routing**: MCP → Node server → WebSocket → Chrome extension
3. **Capture**: Extension uses `chrome.tabs.captureVisibleTab()`
4. **Storage**: PNG saved to ~/Downloads/mcp-screenshots/
5. **Auto-paste**: Optional clipboard integration for Cursor IDE (macOS)
6. **Review**: Dedicated UI for screenshot management and resizing

### Debugging Workflow (runDebuggerMode)

1. Reflect on 5-7 possible problem sources
2. Distill to 1-2 most likely causes
3. Add strategic logging to validate assumptions
4. Retrieve logs via console/network tools
5. Analyze server logs if accessible
6. Produce comprehensive issue analysis
7. Suggest additional logging if needed
8. Clean up debug logs after fix

### Audit Workflow (runAuditMode)

1. Run audits in sequence:
   - Accessibility audit
   - Performance audit
   - Best practices audit
   - SEO audit
   - NextJS audit (if applicable)
2. Analyze results comprehensively
3. Identify affected code areas
4. Create step-by-step improvement plan
5. Execute approved changes
6. Re-run audits to verify improvements
7. Iterate until optimized

## Data Flow

### Log Collection

```
Browser Event → Content Script → Background Script → WebSocket → Node Server → Storage
```

### Screenshot Request

```
AI Tool → MCP Server → HTTP Request → Node Server → WebSocket → Extension → Capture → Storage
```

### Audit Execution

```
AI Tool → MCP Server → Node Server → Puppeteer → Lighthouse → Formatted Report → AI
```

## Security & Privacy

- **Local-Only**: All data stored locally, no external APIs
- **Identity Validation**: Server signature verification
- **Data Sanitization**: Automatic removal of sensitive headers/cookies
- **Permission Model**: Granular Chrome permissions for user control
- **Secure Communication**: WebSocket with origin validation

## Performance Optimizations

- **Smart Limits**: Configurable log limits to prevent memory overflow
- **Truncation**: Intelligent string/object truncation for token efficiency
- **Prioritized Reporting**: Severity-based issue limits in audits
- **Singleton Browser**: Reused Puppeteer instance for audits
- **Connection Pooling**: Efficient WebSocket management

## File Storage

### Screenshots

- **Location**: ~/Downloads/mcp-screenshots/
- **Format**: PNG with timestamp naming
- **Metadata**: URL and timestamp preserved

### Recordings

- **Location**: ~/Downloads/mcp-recordings/
- **Format**: WebM (VP9 video, Opus audio)
- **Metadata**: Description, duration, timestamp

## Version Compatibility

- **Chrome Extension**: Manifest V3
- **Node.js**: 14.0 or higher
- **Chrome/Chromium**: Required for audit functionality
- **Supported Browsers**: Chrome, Edge, Brave, Firefox (for audits)
