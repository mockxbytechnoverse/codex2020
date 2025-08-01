# Architecture (Concise)

## Components

**Chrome Extension** - Captures browser data, takes screenshots, communicates via WebSocket

**Node.js Server** - Middleware handling screenshot storage, WebSocket connections, and Lighthouse audits

**MCP Server** - Implements Model Context Protocol, exposes browser tools to AI clients

## Screenshot Capture

1. **Permissions**: Extension requests `activeTab`, `tabs`, and `tabCapture` permissions
2. **Flow**: AI → MCP server → Node server → WebSocket → Chrome extension → `captureVisibleTab()` → filesystem
3. **Security**: Local-only processing, identity validation, sanitized logs

Enables AI assistants to debug web applications through console logs, network analysis, and visual screenshots.
