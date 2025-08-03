# BrowserTools MCP - Quick Setup Guide

**Get up and running with BrowserTools MCP in 5 minutes**

## Prerequisites

- Node.js (v14+)
- Chrome/Chromium browser
- Claude Code CLI installed and authenticated

## Step 1: Start the Browser Tools Server

```bash
# In your project directory
cd browser-tools-server
npm install
npm start
```

✅ **Expected output:** `Browser Tools Server running on http://127.0.0.1:3025`

## Step 2: Install Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `chrome-extension/` folder from your project
5. Extension should appear in your toolbar

## Step 3: Build and Configure MCP Server

```bash
# Build the MCP server
cd browser-tools-mcp
npm install
npm run build
```

**Add to Claude Code:**

```bash
# Navigate to your target project directory
cd /path/to/your/project

# Add MCP server (IMPORTANT!! REPLACE WITH ACTUAL PATH TO REPO)
claude mcp add vizualAI node /PATH/TO/REPO/codex2020/browser-tools-mcp/dist/mcp-server.js
```

## Step 4: Verify Setup

```bash
# Check MCP connection
claude mcp list
```

✅ **Expected output:** `vizualAI: /path/to/mcp-server.js - ✓ Connected`

## Step 5: Test in Claude Code

```bash
claude
```

Try these commands:

```
> take a screenshot
> get console logs
> run accessibility audit
```

## Troubleshooting

**MCP Server shows "Failed to connect"**

- ✅ Ensure Browser Tools Server is running on port 3025
- ✅ Check if Chrome extension is active on current tab

**Screenshot fails**

- ✅ Restart Browser Tools Server: `npm start`
- ✅ Reload Chrome extension
- ✅ Click extension icon to connect tab

**"Invalid base64" error**

- ✅ Server needs restart after code changes
- ✅ Rebuild MCP server: `npm run build`

## Available MCP Tools

- `takeScreenshot` - Capture and analyze page screenshots
- `getConsoleLogs` - Get browser console output
- `getConsoleErrors` - Get console errors only
- `getNetworkLogs` - Get network requests/responses
- `getSelectedElement` - Get currently selected DOM element
- `runAccessibilityAudit` - WCAG compliance check
- `runPerformanceAudit` - Page performance analysis
- `runSEOAudit` - SEO optimization check

## Architecture

```
Claude Code → MCP Server → Browser Tools Server → Chrome Extension
    ↑              ↓             (Port 3025)           ↓
    └─── Analysis ←── Screenshot/Logs ←──────── Browser Data
```

## Quick Commands Reference

```bash
# Start servers
cd browser-tools-server && npm start

# Build MCP changes
cd browser-tools-mcp && npm run build

# Add to Claude Code
claude mcp add vizualAI node $(pwd)/browser-tools-mcp/dist/mcp-server.js

# Check status
claude mcp list

# Remove if needed
claude mcp remove vizualAI
```

---

**🎯 Success:** When working, Claude Code can capture screenshots, analyze them, and help debug your web applications in real-time!
