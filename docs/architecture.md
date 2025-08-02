# Architecture

The system consists of three main components:

## 1. Chrome Extension (chrome-extension/)

- **Data Capture**: Console logs, network requests, DOM elements
- **Screenshot Capture**: Using Chrome's tabs.captureVisibleTab API
- **Screen Recording**: Tab and desktop recording with audio support
- **Interactive Features**: Popup interface with microphone controls
- **Laser Pointer**: Drawing and annotation system during recordings
- **Communication**: WebSocket connection with Node server
- **Storage**: User settings, recording states, and permission management

## 2. Node.js Server (browser-tools-server/)

- **Middleware**: Bridge between Chrome extension and MCP server
- **File Storage**: Screenshots and screen recordings to local filesystem
- **WebSocket Management**: Real-time communication channels
- **Lighthouse Integration**: Performance, SEO, and accessibility audits via Puppeteer
- **Data Sanitization**: Removes sensitive headers and cookies from logs
- **Recording Processing**: Handles video file storage with metadata

## 3. MCP Server (browser-tools-mcp/)

- Implements the Model Context Protocol
- Provides standardized tools for AI clients
- Auto-discovers the Node server on various ports
- Exposes browser functionality as AI-callable tools

## How Screen Recording Works

### 1. Permission Model

The Chrome extension requests comprehensive permissions in manifest.json:

- `activeTab` - access to current tab
- `tabs` - ability to query and interact with tabs
- `tabCapture` - capture tab content with audio/video
- `desktopCapture` - capture desktop/window content
- `storage` - persist user settings and recording states
- `scripting` - inject recording controls and laser pointer

### 2. Recording Types

#### Tab Recording

1. **Audio**: Mixes tab audio with microphone using Web Audio API
2. **Video**: Captures browser tab content at up to 1920x1080, 30fps
3. **Format**: WebM with VP9 video codec and Opus audio codec

#### Desktop Recording

1. **Audio**: Microphone only (Chrome security limitation)
2. **Video**: Captures entire screen or selected window
3. **Format**: WebM with VP9 video codec and Opus audio codec

### 3. Interactive Features

#### Popup Interface

- **Microphone Management**: Permission requests and toggle controls
- **Recording Controls**: Start tab/desktop recording with visual feedback
- **State Persistence**: Settings saved across browser sessions

#### Recording Bar (During Recording)

- **Laser Pointer**: Toggle drawing/annotation mode
- **Pause/Resume**: Control recording state
- **Mute Toggle**: Real-time microphone control
- **Stop**: End recording and save to server

#### Laser Pointer System

- **Visual Cursor**: Red glowing dot follows mouse
- **Drawing**: Click and drag to create temporary red lines
- **Auto-Cleanup**: Lines fade after 3 seconds
- **SVG-Based**: Scalable vector graphics for smooth rendering

## How Screenshot Capture Works

### 1. Permission Model (Screenshots)

Basic permissions for screenshot functionality:

- `activeTab` - access to current tab
- `tabs` - ability to query and interact with tabs

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
