# Screen Recording Feature Usage Guide

## Overview

The Browser Tools MCP now includes comprehensive screen recording functionality that allows you to capture video recordings of browser tabs and desktop screens. This feature is useful for debugging, creating demos, and documenting issues with enhanced interactive capabilities.

## Features

- **Record browser tab or desktop** with video and audio
- **Microphone permission management** with visual controls
- **Interactive laser pointer** with drawing capabilities
- **Real-time recording controls** (pause, mute, laser pointer)
- **Add descriptions** to recordings for context
- **Manual control via popup UI** and recording bar
- **Programmatic control via MCP tools**
- **Automatic file storage** with metadata

## Usage Methods

### 1. Manual Recording via Chrome Extension Popup

#### Setting Up Microphone (First Time)

1. **Click the Browser Tools extension icon** in Chrome toolbar
2. **Click "Grant permission"** (you'll see a red 🔴 indicator)
3. **Navigate to a regular website** (not chrome:// pages) if prompted
4. **Allow microphone access** when browser prompts
5. **Button turns green** ✅ and shows "Permission granted"

#### Starting a Recording

1. **Click the extension icon** to open popup
2. **Choose recording type**:
   - **"Record tab"**: Records current browser tab with tab audio + microphone
   - **"Record desktop"**: Records screen/window with microphone only
3. **Check microphone state**: 🎤 (enabled) or 🔇 (muted)
4. **For tab recording**: 3-second countdown appears, then recording starts
5. **For desktop recording**: Choose screen/window to record

#### During Recording

1. **Recording bar appears** at bottom of screen with controls:
   - **🎯 Laser Pointer**: Enable/disable laser pointer and drawing
   - **⏸️ Pause**: Pause/resume recording
   - **🎤 Mute**: Toggle microphone on/off
   - **⏹️ Stop**: End recording

#### Using Laser Pointer

1. **Click the laser pointer button** (crosshair icon) in recording bar
2. **Move mouse** to see red glowing dot
3. **Single click** for ripple effect
4. **Click and drag** to draw red lines
5. **Lines auto-fade** after 3 seconds

### 2. DevTools Panel Recording (Alternative)

1. Open Chrome DevTools (F12)
2. Navigate to the "Browser Tools" panel
3. In the "Screen Recording" section:
   - (Optional) Enter a description in the text area
   - Click "Start Recording" to begin
   - The UI will show recording status and duration
   - Click "Stop Recording" to end the recording

### 2. Programmatic Recording via MCP Tools

#### Start Recording

```javascript
// Without description
await startScreenRecording();

// With description
await startScreenRecording({
  description: "Recording user checkout flow bug",
});
```

#### Stop Recording

```javascript
await stopScreenRecording();
```

#### Check Recording Status

```javascript
await getRecordingStatus();
```

## File Storage

### Default Location

- **Windows**: `C:\Users\[Username]\Downloads\mcp-recordings\`
- **macOS**: `/Users/[Username]/Downloads/mcp-recordings/`
- **Linux**: `/home/[Username]/Downloads/mcp-recordings/`

### File Format

- **Video**: WebM format with VP9 codec
- **Metadata**: JSON file with recording details
- **Naming**: `recording-YYYY-MM-DDTHH-mm-ss-SSS.webm`

### Metadata File Contents

```json
{
  "recordingId": "recording_123456_1234567890",
  "tabId": 123456,
  "description": "User provided description",
  "startTime": 1234567890000,
  "endTime": 1234567900000,
  "duration": 10000,
  "filename": "recording-2024-01-15T10-30-45-123.webm"
}
```

## Technical Details

### Permissions Required

The Chrome extension requires the following permissions:

- `tabCapture`: To capture tab content
- `activeTab`: To access current tab
- `tabs`: To interact with browser tabs

### Recording Settings

- **Resolution**: Up to 1920x1080
- **Frame Rate**: Maximum 30 FPS
- **Audio**: Enabled (captures tab audio)
- **Format**: WebM with VP9 video codec

### Limitations

1. Only one recording per tab at a time
2. Recording stops if the tab is closed
3. File size depends on recording duration and content
4. Requires active browser connection to MCP server

## Troubleshooting

### Recording Won't Start

- Ensure Chrome extension is installed and enabled
- Check that Browser Tools server is running
- Verify connection status in the extension panel
- Grant necessary permissions when prompted

### No Recording File Created

- Check the recordings folder exists and is writable
- Ensure sufficient disk space
- Verify server logs for errors

### Poor Recording Quality

- Close unnecessary applications to free resources
- Reduce tab content complexity if possible
- Check system performance during recording

## Future Enhancements

### Planned Features

1. **Agent Integration**: Automatic recording analysis
2. **Recording Playback**: Built-in video viewer
3. **Compression Options**: Adjustable quality settings
4. **Batch Recording**: Multiple tab recording
5. **Cloud Storage**: Optional cloud backup

### Agent Workflow (Coming Soon)

When agent integration is complete:

1. Start recording with problem description
2. Reproduce the issue
3. Stop recording
4. Agent automatically analyzes:
   - Console logs during recording
   - Network requests
   - DOM changes
   - Visual issues
5. Receive AI-generated bug report and suggestions

## Example Use Cases

### 1. Bug Documentation

Record the exact steps to reproduce a bug, making it easier for developers to understand and fix issues.

### 2. User Testing

Capture user interactions to analyze UX problems and improve interface design.

### 3. Performance Analysis

Record page load and interactions to identify performance bottlenecks.

### 4. Training Materials

Create video tutorials showing how to use web applications.

### 5. Compliance Recording

Document user workflows for audit and compliance purposes.

## Troubleshooting

### Microphone Issues

- **"Permission denied" error**: Try granting permission on a different website (avoid chrome:// pages)
- **No audio in recording**: Check that microphone button shows 🎤 (not 🔇)
- **Mixed audio not working**: Ensure browser allows audio context (some browsers require user interaction first)
- **Permission button stays red**: Clear browser data and try again, or check browser microphone settings

### Laser Pointer Issues

- **Laser button not responding**: Check browser console (F12) for JavaScript errors
- **Red dot not visible**: Ensure recording is active and laser button is highlighted
- **Lines not drawing**: Try refreshing the page and starting a new recording
- **Performance issues**: Disable laser pointer if page becomes slow

### Recording Issues

- **Countdown interrupted**: Click anywhere to pause countdown, then click record button again
- **Recording bar missing**: Check if recording actually started, restart if needed
- **Desktop recording fails**: Ensure you select a screen/window in the browser dialog
- **Recording controls not working**: Try stopping and starting the recording again

## Best Practices

1. **Grant microphone permission early**: Set up microphone access before important recordings
2. **Test microphone toggle**: Verify audio is working before crucial recordings
3. **Use laser pointer sparingly**: Too many annotations can be distracting
4. **Let lines auto-fade**: Don't manually disable laser pointer unless needed
5. **Add descriptions**: Always add meaningful descriptions to help identify recordings later
6. **Keep recordings focused**: Record only what's necessary to keep file sizes manageable
7. **Clean up old recordings**: Regularly delete unneeded recordings to save disk space
8. **Monitor disk space**: Be aware of available storage, especially for long recordings

## API Reference

### MCP Tools

#### startScreenRecording(args)

Starts a new screen recording session.

**Parameters:**

- `args.description` (string, optional): Description of what's being recorded

**Returns:**

- Success message with recording ID
- Error message if recording fails

#### stopScreenRecording()

Stops the current screen recording.

**Returns:**

- Success message with file path and duration
- Error message if no active recording

#### getRecordingStatus()

Gets the status of current recording session.

**Returns:**

- Recording details if active
- "No active recording session" if none

## Security Considerations

1. **Local Storage Only**: Recordings are stored locally, never uploaded
2. **No External Access**: Recording functionality requires local server connection
3. **Permission Based**: Chrome requires explicit user permission for tab capture
4. **Sanitized Metadata**: Sensitive data is not included in metadata files

## Support

For issues or feature requests related to screen recording:

1. Check the [GitHub repository](https://github.com/modelcontextprotocol/browser-tools)
2. Review server logs for error messages
3. Ensure all components are up to date
