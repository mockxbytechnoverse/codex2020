# Setting Up BrowserTools MCP Server with Claude Code

## Overview

This guide explains how to set up and use the BrowserTools MCP (Model Context Protocol) server with Claude Code CLI. The MCP server enables Claude Code to interact with browser debugging tools, console logs, network requests, and perform accessibility audits.

## What is MCP?

Model Context Protocol (MCP) is an open standard that allows applications to share context and tools with large language models (LLMs) using a unified interface. In Claude Code, MCP acts as a plugin framework that extends the AI assistant with custom tools and integrations.

### Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌─────────────┐
│ Claude Code │ ──► │  MCP Server  │ ──► │  Node Server  │ ──► │   Chrome    │
│   (Client)  │ ◄── │  (Protocol   │ ◄── │ (Port 3025)   │ ◄── │  Extension  │
│             │     │   Handler)   │     │               │     │             │
└─────────────┘     └──────────────┘     └───────────────┘     └─────────────┘
```

## Prerequisites

Before setting up the MCP server, ensure you have:

1. **Node.js** (version 14 or higher)
2. **Claude Code CLI** installed and authenticated
3. **Chrome or Chromium browser**
4. **BrowserTools Chrome Extension** (from the `chrome-extension/` folder)
5. **BrowserTools Node Server** running (from the `browser-tools-server/` folder)

## Step 1: Start the BrowserTools Node Server

First, start the middleware server that communicates with the Chrome extension:

```bash
# Navigate to the browser-tools-server directory
cd browser-tools-server

# Install dependencies (if not already done)
npm install

# Start the server
npm start
```

The server will run on port 3025 by default. You should see:

```
✅ Browser Tools Server running on http://127.0.0.1:3025
```

## Step 2: Install the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `chrome-extension/` folder from your project
5. The BrowserTools extension should now appear in your extensions list

## Step 3: Add MCP Server to Claude Code

### Method 1: Using the Published NPM Package (Recommended)

```bash
claude mcp add browser-tools npx @agentdeskai/browser-tools-mcp
```

### Method 2: Using Local Development Build

If you want to use your local development version:

```bash
# First, build the MCP server
cd browser-tools-mcp
npm run build

# Add to Claude Code with absolute path
claude mcp add browser-tools node /path/to/your/project/browser-tools-mcp/dist/mcp-server.js
```

### Method 3: Using JSON Configuration

You can also add the server using JSON configuration:

```bash
claude mcp add-json browser-tools '{"command": "npx", "args": ["@agentdeskai/browser-tools-mcp"], "env": {"BROWSER_TOOLS_PORT": "3025"}}'
```

## Step 4: Verify the Setup

Check that the MCP server is connected:

```bash
claude mcp list
```

You should see:

```
browser-tools: npx @agentdeskai/browser-tools-mcp - ✓ Connected
```

## Step 5: Using BrowserTools in Claude Code

Start a new Claude Code session:

```bash
claude
```

You can now use browser tools in your conversations. The MCP server provides these functions:

### Available Tools

- **`mcp_getConsoleLogs`** - Retrieve browser console logs
- **`mcp_getConsoleErrors`** - Get browser console errors only
- **`mcp_getNetworkErrors`** - Get network error logs
- **`mcp_getNetworkSuccess`** - Get successful network requests
- **`mcp_getNetworkLogs`** - Get all network logs
- **`mcp_getSelectedElement`** - Get the currently selected DOM element
- **`mcp_runAccessibilityAudit`** - Run a WCAG-compliant accessibility audit
- **`mcp_runPerformanceAudit`** - Run a performance audit
- **`mcp_runSEOAudit`** - Run an SEO audit
- **`mcp_runBestPracticesAudit`** - Run a best practices audit

### Example Usage

```
> Get the console logs from the current webpage
> Run an accessibility audit on this page
> Show me any network errors
> What element is currently selected?
> Analyze the performance of this page
```

## Environment Configuration

You can customize the MCP server behavior using environment variables:

```bash
# Set custom port for BrowserTools server
export BROWSER_TOOLS_PORT=3030

# Set custom host
export BROWSER_TOOLS_HOST=localhost

# Add server with custom environment
claude mcp add browser-tools npx @agentdeskai/browser-tools-mcp
```

Or specify environment variables directly:

```bash
claude mcp add-json browser-tools-custom '{
  "command": "npx",
  "args": ["@agentdeskai/browser-tools-mcp"],
  "env": {
    "BROWSER_TOOLS_PORT": "3030",
    "BROWSER_TOOLS_HOST": "localhost"
  }
}'
```

## Troubleshooting

### MCP Server Not Connected

If `claude mcp list` shows the server as disconnected:

1. **Check Node Server**: Ensure the BrowserTools Node server is running on port 3025
2. **Check Chrome Extension**: Verify the extension is installed and active
3. **Check Port Conflicts**: Make sure port 3025 is not in use by another application
4. **Restart Claude Code**: Try restarting your Claude Code session

### Tools Not Working

If MCP tools are available but not working properly:

1. **Browser Extension**: Ensure the Chrome extension is active on the current tab
2. **Server Logs**: Check the Node server logs for error messages
3. **Network Connectivity**: Verify the MCP server can reach the Node server
4. **Permissions**: Make sure the Chrome extension has necessary permissions

### Common Error Messages

**"No server found during discovery"**

- The MCP server cannot connect to the BrowserTools Node server
- Check if the Node server is running and accessible

**"Client closed"**

- Connection to the MCP server was lost
- Restart the Claude Code session and try again

**"Tool not available"**

- The specific tool is not exposed by the MCP server
- Check `claude mcp get browser-tools` to see available tools

## Managing MCP Servers

### List all servers

```bash
claude mcp list
```

### Get details about a specific server

```bash
claude mcp get browser-tools
```

### Remove a server

```bash
claude mcp remove browser-tools
```

### Reset project choices

```bash
claude mcp reset-project-choices
```

## Security Considerations

- All data stays local on your machine
- No browser data is sent to external services
- The MCP server only communicates with your local BrowserTools Node server
- Chrome extension operates within standard browser security constraints

## Best Practices

1. **Start Services in Order**: Always start the Node server before using Claude Code
2. **Keep Extension Active**: Ensure the Chrome extension is active on tabs you want to debug
3. **Monitor Logs**: Check both Node server and Chrome extension logs for issues
4. **Regular Updates**: Keep the MCP server package updated for latest features

## Advanced Configuration

### Custom Server Discovery

The MCP server automatically discovers the BrowserTools Node server on ports 3025-3035. To customize this:

```bash
# Set specific port
export BROWSER_TOOLS_PORT=3026

# Set specific host
export BROWSER_TOOLS_HOST=192.168.1.100
```

### Project-Specific Configuration

You can create a `.mcp.json` file in your project root for project-specific MCP configurations:

```json
{
  "mcpServers": {
    "browser-tools": {
      "command": "npx",
      "args": ["@agentdeskai/browser-tools-mcp"],
      "env": {
        "BROWSER_TOOLS_PORT": "3025"
      }
    }
  }
}
```

## Integration with Development Workflow

The BrowserTools MCP server integrates seamlessly with your development workflow:

1. **Debugging**: Use console logs and network requests to debug issues
2. **Testing**: Run accessibility and performance audits during development
3. **Code Review**: Analyze DOM elements and page behavior
4. **Documentation**: Generate reports on page performance and accessibility

## Conclusion

With the BrowserTools MCP server configured in Claude Code, you now have powerful browser debugging and analysis capabilities directly integrated with your AI assistant. This enables more efficient web development workflows and better debugging experiences.

For additional help, refer to the official [MCP documentation](https://docs.anthropic.com/en/docs/claude-code/mcp) and the BrowserTools project documentation.
