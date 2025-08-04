# Architecture (Concise)

BrowserTools MCP enables AI-powered browser debugging, monitoring, and optimization through a three-component architecture.

## Components

### Chrome Extension

- **Data Capture**: Console logs, network requests, DOM elements
- **Media**: Screenshots with auto-paste, tab/desktop recording with audio
- **UI**: Popup interface, DevTools panel, in-page overlay, recording controls
- **Features**: Laser pointer annotations, screenshot review, microphone management
- **Storage**: Settings persistence, recording states via Chrome storage API

### Node.js Server (Port 3025)

- **Middleware**: WebSocket bridge between extension and MCP
- **Storage**: Screenshots (~/Downloads/mcp-screenshots/), recordings (~/Downloads/mcp-recordings/)
- **Lighthouse**: Accessibility, Performance, SEO, Best Practices audits via Puppeteer
- **API**: RESTful endpoints for logs, screenshots, audits, data management
- **Security**: Data sanitization, identity validation, local-only processing

### MCP Server

- **Protocol**: Full Model Context Protocol implementation
- **Auto-Discovery**: Finds Node server on ports 3025-3040
- **Tools**: 15+ AI-callable functions for debugging and optimization
- **Meta Tools**: Structured workflows (debugger mode, audit mode)

## Available MCP Tools

**Data Retrieval**: `getConsoleLogs`, `getConsoleErrors`, `getNetworkLogs`, `getNetworkErrors`, `getNetworkSuccess`, `getSelectedElement`

**Actions**: `takeScreenshot`, `wipeLogs`

**Audits**: `runAccessibilityAudit`, `runPerformanceAudit`, `runSEOAudit`, `runBestPracticesAudit`, `runNextJSAudit`

**Workflows**: `runDebuggerMode`, `runAuditMode`

## Key Features

### Screen Recording

- **Tab Recording**: Browser tab with mixed audio (tab + mic), WebM format
- **Desktop Recording**: Full screen/window with mic audio
- **Controls**: Recording bar with pause/resume/stop/mute
- **Annotations**: Laser pointer for drawing during recordings

### Smart Auditing

- **AI-Optimized**: Structured output with prioritized issues
- **Smart Limits**: Critical (unlimited), Serious (15), Moderate (10), Minor (3)
- **Categories**: WCAG compliance, Core Web Vitals, security, SEO best practices

### Data Management

- **Log Limits**: Configurable truncation for token efficiency
- **Sanitization**: Automatic removal of sensitive headers/cookies
- **Local Storage**: All data stays on user's machine

## Workflows

**Screenshot**: AI tool → MCP → Node → WebSocket → Extension → Capture → Storage → Optional auto-paste

**Recording**: User trigger → Stream setup → MediaRecorder → Real-time controls → WebM storage

**Debugging**: Problem analysis → Strategic logging → Data collection → Issue diagnosis → Cleanup

**Auditing**: Sequential audits → Analysis → Improvement plan → Implementation → Verification

## Security

- Local-only processing (no external APIs)
- Server identity validation
- Granular Chrome permissions
- WebSocket origin validation

Enables AI assistants to debug, monitor, and optimize web applications through comprehensive browser integration.
