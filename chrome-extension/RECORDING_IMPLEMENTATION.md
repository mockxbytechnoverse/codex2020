# Chrome Extension Recording Implementation

## Overview

This Chrome extension provides screen recording functionality with both tab recording and desktop recording capabilities. The implementation uses a modular architecture with separate components for UI, recording control, and media handling.

## Current Architecture

### Core Files

- **manifest.json**: Extension configuration with required permissions
- **content-script.js**: Main UI via floating overlay (triggered by extension icon click)
- **background.js**: Service worker handling Chrome APIs and message routing
- **content-recording.js**: Content script managing MediaRecorder and video saving
- **recording-bar.js**: Floating recording bar component injected into pages

## Recording Flow

### Tab Recording

1. User clicks extension icon to show overlay UI
2. User clicks "Record tab" in the overlay
3. Overlay shows 3-second countdown, then hides
4. Background script uses `chrome.tabCapture.getMediaStreamId()` to get stream ID
5. Stream ID is passed to content-recording.js via `START_RECORDING_WITH_STREAM_ID`
6. Content script creates MediaRecorder with tab capture constraints
7. Recording bar is shown on the active tab
8. Video data is collected and saved to server on stop

### Desktop Recording

1. User clicks extension icon to show overlay UI
2. User clicks "Record desktop" in the overlay (no countdown - starts immediately)
3. Background script calls `chrome.desktopCapture.chooseDesktopMedia()`
4. User selects screen/window to record
5. Background script handles entire setup via `handleDesktopRecordingSetup()`
6. Recording bars are injected into ALL tabs
7. Content-recording.js is injected only into active tab
8. Desktop recording starts with `START_DESKTOP_RECORDING_WITH_STREAM_ID`
9. Recording bars on all tabs are functional and control the same recording

## Recording Bar Controls

### Functionality

All recording bar controls (stop/pause/mute) work from any tab:

- **Stop**: Routes through `STOP_RECORDING_FROM_BAR` message to background script
- **Pause**: Routes through `PAUSE_RECORDING_FROM_BAR` message to background script
- **Mute**: Routes through `MUTE_RECORDING_FROM_BAR` message to background script

### Message Routing

Background script determines recording type and routes control messages:

- **Desktop recording**: Routes to tab stored in `desktopRecordingTabId`
- **Tab recording**: Routes to sender tab

### UI State

- Recording bars show on all tabs during desktop recording
- Recording bars show only on active tab during tab recording
- Timer and visual indicators update in real-time
- Controls provide visual feedback when clicked

## Storage Management

### Chrome Storage Keys

- `isRecording`: Boolean indicating if any recording is active
- `desktopRecording`: Object with desktop recording metadata
  - `isActive`: Boolean for desktop recording state
  - `startTime`: Recording start timestamp
  - `description`: User-provided description
- `desktopRecordingTabId`: Tab ID where actual MediaRecorder exists
- `lastDescription`: Persisted description text

### State Cleanup

Proper cleanup occurs when recording stops:

- All storage keys are cleared
- MediaRecorder is stopped and nullified
- Stream tracks are stopped
- Recording bars are hidden across all tabs

## Server Integration

### Endpoints Used

- `/.identity`: Server validation and connection check
- `/recording-data`: POST endpoint for saving recorded video data
- `/screenshot`: POST endpoint for screenshot capture

### Data Format

Video data is sent as base64-encoded WebM with metadata:

```json
{
  "data": "data:video/webm;base64,UklGRv...",
  "description": "User description",
  "duration": 45000,
  "timestamp": 1234567890123
}
```

## Technical Implementation Details

### MediaRecorder Configuration

- **Tab recording**: `video/webm;codecs=vp9,opus` (includes audio)
- **Desktop recording**: `video/webm;codecs=vp9` (video only)
- Data collection interval: 1000ms (1 second chunks)

### Stream Constraints

**Tab Recording:**

```javascript
{
  audio: {
    mandatory: {
      chromeMediaSource: 'tab',
      chromeMediaSourceId: streamId
    }
  },
  video: {
    mandatory: {
      chromeMediaSource: 'tab',
      chromeMediaSourceId: streamId,
      maxWidth: 1920,
      maxHeight: 1080,
      maxFrameRate: 30
    }
  }
}
```

**Desktop Recording:**

```javascript
{
  audio: false,
  video: {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: streamId,
      maxWidth: 1920,
      maxHeight: 1080,
      maxFrameRate: 30
    }
  }
}
```

### Error Handling

- Comprehensive error logging throughout recording flow
- Graceful fallbacks for failed injections (system tabs)
- User notifications for recording errors
- Automatic cleanup on stream end or errors

## Recent Fixes and Current State

### Fixed Issues

1. ✅ **Recording bar controls now functional**: All stop/pause/mute buttons work from any tab
2. ✅ **Proper message routing**: Background script correctly routes control messages to recording tab
3. ✅ **Desktop recording bar visibility**: Shows on all tabs with working controls
4. ✅ **State management**: Proper cleanup prevents stuck recording states
5. ✅ **Cross-tab communication**: Recording bars communicate with actual recording controller

### Current Status

- **Tab recording**: ✅ Fully working with functional controls
- **Desktop recording**: ✅ Fully working with functional controls across all tabs
- **Video saving**: ✅ Working - videos save to server successfully
- **Recording bar UI**: ✅ Clean, positioned 50px from bottom center
- **Animation**: ✅ Smooth pulsing recording indicator

## Message Flow Architecture

### Popup → Background → Content Script

```
Popup (Record Desktop)
  → Background (REQUEST_DESKTOP_CAPTURE)
  → DesktopCapture chooser
  → Background (handleDesktopRecordingSetup)
  → Content Script (START_DESKTOP_RECORDING_WITH_STREAM_ID)
```

### Recording Bar → Background → Content Script

```
Recording Bar (Stop clicked)
  → Background (STOP_RECORDING_FROM_BAR)
  → Background determines recording type
  → Content Script (STOP_RECORDING) on correct tab
```

## File-Specific Implementation Notes

### background.js:line_458-574

- `handleDesktopRecordingSetup()`: Manages complete desktop recording setup
- Injects recording-bar.js into all tabs
- Injects content-recording.js only into active tab
- Stores `desktopRecordingTabId` for message routing

### recording-bar.js:line_296-308

- `stopRecording()`: Routes through background script for cross-tab functionality
- All controls use background script messaging for universal compatibility

### content-recording.js:line_163-270

- `startDesktopRecordingWithStreamId()`: Handles desktop recording with comprehensive logging
- Proper stream validation and error handling
- Automatic cleanup on recording end

### popup.js:line_234-281

- Desktop recording simplified to single message send
- No countdown for desktop recording per user requirements
- Proper state management and error handling

## Testing and Debugging

### Debug Logging

Comprehensive console logging throughout with prefixes:

- `Popup:` - Popup script messages
- `Background:` - Background script messages
- `Content-recording:` - Content script messages
- `Recording-bar:` - Recording bar messages

### Common Debug Scenarios

1. Check browser console for message flow
2. Verify storage state in DevTools Application tab
3. Confirm script injection success in background logs
4. Monitor MediaRecorder state changes

## Known Limitations

- Cannot inject into system tabs (chrome://, etc.)
- Desktop recording audio disabled to avoid system audio conflicts
- Requires server connection for video saving
- Popup closes during recording (by design for tab capture)

## Future Enhancement Areas

- Audio recording for desktop capture
- Recording preview/thumbnail
- Recording length limits
- Multiple simultaneous recordings
- Recording pause/resume for desktop
- Custom recording quality settings

---

This implementation provides a robust screen recording solution with functional cross-tab controls and proper state management. The modular architecture allows for easy maintenance and future enhancements.
