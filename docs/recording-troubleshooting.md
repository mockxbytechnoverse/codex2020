# Screen Recording Troubleshooting Guide

## Common Issues and Solutions

### 0. Microphone Permission Issues (New Features)

#### "Permission dismissed" or "Permission denied" errors:

1. **Navigate to a regular website** (avoid chrome:// pages)
2. **Click "Grant permission"** in the popup interface
3. **Allow microphone access** when browser prompts
4. **Clear browser data** if permission stays denied
5. **Check system microphone permissions** for Chrome

#### Microphone button not responding:

1. **Check permission status** - ensure button shows ✅ "Permission granted"
2. **Test on different websites** - some sites block microphone requests
3. **Reload extension** if button states seem incorrect
4. **Check browser console** (F12) for JavaScript errors

#### No audio in recordings despite microphone being enabled:

1. **Verify microphone button shows 🎤** (not 🔇)
2. **Test system microphone** in other applications
3. **Check browser's audio context policy** - some require user interaction
4. **Try restarting the recording** with microphone already enabled

### 0.1. Laser Pointer Issues (New Features)

#### Laser pointer button not responding:

1. **Ensure recording is active** - laser pointer only works during recording
2. **Check browser console** (F12) for JavaScript errors
3. **Try refreshing the page** and starting a new recording
4. **Verify button is visible** in the recording bar

#### Red dot not visible or drawing not working:

1. **Check that laser button is highlighted** (red background when active)
2. **Move mouse slowly** - dot follows cursor position
3. **Try single click** for ripple effect to test functionality
4. **Check z-index conflicts** with page elements

#### Performance issues with laser pointer:

1. **Disable laser pointer** if page becomes slow
2. **Reduce drawing activity** - excessive lines can impact performance
3. **Let lines auto-fade** rather than manually toggling repeatedly
4. **Close unnecessary browser tabs** during recording

## Legacy Issues and Solutions

### 1. "Failed to start recording. Make sure you have granted the necessary permissions"

This error occurs due to Chrome's security restrictions on the `chrome.tabCapture` API.

#### Solutions:

**Option 1: Use Extension Action (Recommended)**

1. Click the BrowserTools MCP extension icon in Chrome toolbar
2. This provides the necessary user activation
3. Then try recording from DevTools panel

**Option 2: Use Screen Recording API**

1. Instead of tab capture, use screen recording
2. This will prompt you to select a window/tab to record
3. More flexible but requires user selection each time

**Option 3: Reload Extension**

1. Go to `chrome://extensions/`
2. Find "BrowserTools MCP"
3. Click the refresh icon
4. Reload the page you're debugging
5. Try recording again

### 2. Permission Denied Errors

#### Chrome Permissions:

1. Go to `chrome://settings/content/camera`
2. Ensure the extension has camera/microphone access
3. Check that no system-level blocks are in place

#### System Permissions (macOS):

1. System Preferences > Security & Privacy > Screen Recording
2. Ensure Chrome has permission
3. Restart Chrome after granting permission

#### System Permissions (Windows):

1. Settings > Privacy > Camera
2. Allow apps to access camera
3. Ensure Chrome is allowed

### 3. Recording Not Starting from DevTools

Due to Chrome security model, `chrome.tabCapture` requires user activation:

#### Workarounds:

1. **Use Keyboard Shortcut**: Set up a keyboard shortcut in `chrome://extensions/shortcuts`
2. **Use Extension Icon**: Click extension icon before starting recording
3. **Use Alternative API**: Implement screen recording instead of tab capture

### 4. No Recording File Created

#### Check:

1. Server is running (`http://localhost:3025`)
2. Recording directory exists and is writable
3. Sufficient disk space available
4. Check server logs for errors

### 5. Poor Recording Quality

#### Solutions:

1. Close unnecessary tabs/applications
2. Reduce recording resolution in settings
3. Disable audio if not needed
4. Check CPU/memory usage

## Alternative Implementation

If tab recording continues to fail, use the Screen Recording API:

```javascript
// In DevTools console or content script
async function recordScreen() {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });

  const recorder = new MediaRecorder(stream);
  const chunks = [];

  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    // Process recording
  };

  recorder.start();

  // Stop after 30 seconds
  setTimeout(() => {
    recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
  }, 30000);
}
```

## Chrome DevTools Limitations

### Why Tab Capture Fails from DevTools:

1. **Security Context**: DevTools panels run in a restricted context
2. **User Activation**: Chrome requires user gesture for media APIs
3. **Permission Model**: Manifest V3 has stricter permission requirements

### Best Practices:

1. Always provide user-initiated action (button click, keyboard shortcut)
2. Handle permission errors gracefully
3. Provide clear instructions to users
4. Consider alternative APIs when appropriate

## Debugging Steps

1. **Check Console Logs**:

   - Open DevTools > Console
   - Look for permission errors
   - Check for API availability

2. **Verify Extension State**:

   ```javascript
   // In background script console
   chrome.permissions.contains(
     {
       permissions: ["tabCapture"],
     },
     (result) => {
       console.log("Has tabCapture permission:", result);
     }
   );
   ```

3. **Test Basic Functionality**:

   ```javascript
   // Test if API is available
   console.log("tabCapture available:", !!chrome.tabCapture);
   console.log(
     "getDisplayMedia available:",
     !!navigator.mediaDevices.getDisplayMedia
   );
   ```

4. **Check Server Connection**:
   - Verify WebSocket connection in Network tab
   - Check server logs for incoming requests
   - Test endpoints manually with curl/Postman

## Recommended Solution

For most reliable recording from DevTools:

1. **Add Extension Action Handler**:

   - User clicks extension icon
   - Recording starts with proper permissions
   - Status shown in extension badge

2. **Use Hybrid Approach**:

   - Try tab capture first
   - Fall back to screen recording
   - Let user choose method

3. **Implement Status Indicators**:
   - Show recording state in extension icon
   - Display errors clearly
   - Provide actionable error messages

## Future Improvements

1. **Chrome Extension Manifest V3 Updates**: Monitor for API improvements
2. **WebRTC Integration**: Use peer connections for streaming
3. **Service Worker Recording**: Investigate background recording options
4. **Native Messaging**: Consider native application for recording

## Support Resources

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/reference/tabCapture/)
- [MDN Screen Capture API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API)
- [Chrome DevTools Extension Guide](https://developer.chrome.com/docs/extensions/mv3/devtools/)
- [File bugs at Chrome Bug Tracker](https://bugs.chromium.org/)
