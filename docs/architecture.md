# Architecture

The system consists of three main components:

## 1. Chrome Extension (chrome-extension/)

- Captures browser data: console logs, network requests, DOM elements
- Takes screenshots using Chrome's tabs.captureVisibleTab API
- Communicates via WebSocket with the Node server
- Stores user settings like screenshot paths and token limits

## 2. Node.js Server (browser-tools-server/)

- Acts as middleware between Chrome extension and MCP server
- Handles screenshot storage to local filesystem
- Manages WebSocket connections for real-time communication
- Runs Lighthouse audits using Puppeteer for performance/SEO/accessibility
- Sanitizes logs by removing sensitive headers and cookies

## 3. MCP Server (browser-tools-mcp/)

- Implements the Model Context Protocol
- Provides standardized tools for AI clients
- Auto-discovers the Node server on various ports
- Exposes browser functionality as AI-callable tools

## How Screenshot Capture Works

### 1. Permission Model

The Chrome extension requests permissions in manifest.json:

- `activeTab` - access to current tab
- `tabs` - ability to query and interact with tabs
- `tabCapture` - capture tab content

### 2. Capture Flow

1. AI calls takeScreenshot tool via MCP server
2. MCP server sends HTTP request to Node server's `/capture-screenshot` endpoint
3. Node server sends WebSocket message to Chrome extension
4. Extension uses `chrome.tabs.captureVisibleTab()` to capture visible portion of active tab
5. Screenshot is sent back as base64-encoded PNG data
6. Node server saves it to local filesystem (default: `~/Downloads/mcp-screenshots/`)

### 3. Security

- All data stays local - no external APIs
- Server validates identity with signature check
- Sensitive headers/cookies are stripped from logs

The system enables AI assistants to debug web applications by analyzing console logs, network traffic, and visual state through screenshots, making it easier to identify and fix issues in web development.
