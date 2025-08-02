# Screen Recording Implementation Plan for Browser Tools MCP

## Overview
This document outlines the implementation plan for adding screen recording functionality to the Browser Tools MCP system, including manual recording triggers and future agent workflow integration.

## Goals
1. ✅ Add a manual "Record" button to start/stop screen recordings
2. ✅ Implement screen recording as an MCP tool for AI agents
3. ✅ Create Chrome extension popup UI for easy access
4. 🔄 Prepare infrastructure for future agent workflow automation
5. ✅ Maintain consistency with existing screenshot functionality

## Current Status (Updated)
- ✅ **Phase 1**: Basic Recording Infrastructure - COMPLETED
- ✅ **Phase 2**: MCP Tool Integration - COMPLETED
- ✅ **Phase 3**: Chrome Extension UI - COMPLETED
- 🔄 **Phase 4**: Agent Workflow Preparation - IN PROGRESS
- ⏳ **Phase 5**: Advanced Features - PENDING

## Architecture Changes

### 1. Chrome Extension Updates

#### New UI Elements
- Add "Record" button to `panel.html`
- Add recording status indicator (recording/idle)
- Add recording timer display
- Add "Describe your Problem" prompt input field

#### Recording Implementation in `devtools.js`
```javascript
// New state variables
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let recordingStartTime = null;

// Recording functions
async function startRecording() {
  try {
    // Request tab capture
    const streamId = await chrome.tabCapture.capture({
      audio: true,
      video: true,
      videoConstraints: {
        mandatory: {
          maxWidth: 1920,
          maxHeight: 1080,
          maxFrameRate: 30
        }
      }
    });
    
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      }
    });
    
    // Initialize MediaRecorder
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9'
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      await sendRecordingToServer(blob);
      recordedChunks = [];
    };
    
    mediaRecorder.start();
    isRecording = true;
    recordingStartTime = Date.now();
  } catch (error) {
    console.error('Error starting recording:', error);
  }
}

async function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    
    // Stop all tracks
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
}
```

#### WebSocket Message Types
- `start-recording`: Notify server recording started
- `stop-recording`: Notify server recording stopped
- `recording-data`: Send recording blob to server
- `recording-status`: Update recording status

### 2. Node.js Server Updates

#### New Endpoints in `browser-connector.ts`
```typescript
// Recording management endpoints
app.post('/start-recording', async (req, res) => {
  const { description } = req.body;
  // Initialize recording session
  // Store description for agent context
  // Return session ID
});

app.post('/stop-recording', async (req, res) => {
  const { sessionId } = req.body;
  // Finalize recording session
  // Trigger agent workflow if configured
});

app.post('/recording-data', async (req, res) => {
  // Handle recording blob upload
  // Save to filesystem
  // Return file path
});

// Agent workflow endpoint (future)
app.post('/process-recording', async (req, res) => {
  const { recordingPath, description } = req.body;
  // Trigger agent analysis
  // Return agent response
});
```

#### Recording Storage
- Default path: `~/Downloads/mcp-recordings/`
- File naming: `recording-{timestamp}.webm`
- Metadata file: `recording-{timestamp}.json` containing:
  - Recording duration
  - Description
  - Timestamp
  - Associated logs during recording period

#### WebSocket Handlers
```typescript
// Add to WebSocket message handler
if (data.type === 'recording-data') {
  const { blob, sessionId } = data;
  // Save recording to filesystem
  // Update recording metadata
}
```

### 3. MCP Server Updates

#### New Tools in `mcp-server.ts`
```typescript
// Start screen recording
server.tool("startScreenRecording", "Start recording the current browser tab", {
  description: {
    type: "string",
    description: "Description of what to record",
    required: false
  }
}, async (args) => {
  // Call Node server to start recording
  // Return recording session ID
});

// Stop screen recording
server.tool("stopScreenRecording", "Stop the current screen recording", async () => {
  // Call Node server to stop recording
  // Return recording file path
});

// Get recording status
server.tool("getRecordingStatus", "Get the current recording status", async () => {
  // Return isRecording, duration, sessionId
});

// List recordings (future)
server.tool("listRecordings", "List all available recordings", async () => {
  // Return array of recording metadata
});
```

## Implementation Phases

### Phase 1: Basic Recording Infrastructure ✅ COMPLETED
1. ✅ Add MediaRecorder implementation to Chrome extension
2. ✅ Create recording start/stop UI controls
3. ✅ Implement WebSocket communication for recording events
4. ✅ Add file storage handling in Node server
5. ✅ Test recording capture and playback

### Phase 2: MCP Tool Integration ✅ COMPLETED
1. ✅ Implement MCP tools for recording control
2. ✅ Add recording status tracking
3. ✅ Create recording metadata system
4. ✅ Test AI agent recording control
5. ✅ Add error handling and edge cases

### Phase 3: Chrome Extension UI ✅ COMPLETED
1. ✅ Create modern popup.html with dark theme
2. ✅ Implement popup.js with recording controls
3. ✅ Add quick actions (screenshot, clear logs, etc.)
4. ✅ Add connection status indicator
5. ✅ Implement notifications and user feedback

### Phase 4: Agent Workflow Preparation 🔄 IN PROGRESS
1. ⏳ Design agent workflow API
2. ⏳ Create recording processing queue
3. ⏳ Add webhook/callback system for agents
4. ⏳ Implement recording analysis metadata
5. ⏳ Document agent integration patterns

### Phase 5: Advanced Features ⏳ PENDING
1. ⏳ Add recording preview functionality
2. ⏳ Implement recording list/retrieval tools
3. ⏳ Add recording size limits and cleanup
4. ⏳ Create recording export options
5. ⏳ Add audio recording toggle

## Technical Considerations

### Chrome Extension Permissions
Add to `manifest.json`:
```json
{
  "permissions": [
    "tabCapture",
    "activeTab",
    "tabs",
    "storage"
  ]
}
```

### Recording Format
- Video: WebM with VP9 codec
- Audio: Opus codec (optional)
- Resolution: Up to 1920x1080
- Frame rate: 30 FPS max
- File size limit: 500MB per recording

### Error Handling
- Handle permission denied scenarios
- Manage disk space limitations
- Handle recording interruptions
- Graceful degradation if APIs unavailable

### Performance Considerations
- Monitor memory usage during recording
- Implement chunked upload for large files
- Add recording quality settings
- Consider compression options

## Future Agent Integration

### Agent Workflow Design
1. User clicks "Record" and describes problem
2. Recording captures user actions
3. On stop, recording + description sent to agent
4. Agent analyzes recording with context:
   - Console logs during recording
   - Network requests during recording
   - DOM changes
   - User description
5. Agent provides analysis and suggestions

### Agent API Contract
```typescript
interface RecordingAnalysisRequest {
  recordingPath: string;
  description: string;
  metadata: {
    duration: number;
    timestamp: number;
    consoleLogs: any[];
    networkRequests: any[];
  };
}

interface RecordingAnalysisResponse {
  summary: string;
  issues: Array<{
    type: string;
    description: string;
    timestamp: number;
    suggestions: string[];
  }>;
  recommendations: string[];
}
```

## Testing Strategy

### Unit Tests
- MediaRecorder initialization
- WebSocket message handling
- File storage operations
- MCP tool functionality

### Integration Tests
- End-to-end recording flow
- Multi-tab recording scenarios
- Large file handling
- Error recovery

### User Acceptance Tests
- Recording quality verification
- UI responsiveness during recording
- File access and playback
- Agent workflow integration

## Security Considerations
- Validate file paths to prevent directory traversal
- Implement file size limits
- Sanitize recording metadata
- Ensure recordings stay local
- Add user consent for recording

## Documentation Updates
- Update README with recording instructions
- Add recording API documentation
- Create troubleshooting guide
- Document agent integration examples

## Success Metrics
- Recording capture success rate > 95%
- Recording file size < 10MB per minute
- UI remains responsive during recording
- Agent analysis completion < 30 seconds
- User satisfaction with recording quality

## Timeline
- Week 1: Basic recording implementation
- Week 2: MCP tool integration
- Week 3: Enhanced features
- Week 4: Agent workflow preparation
- Week 5: Testing and documentation
- Week 6: Beta release

## Open Questions
1. Should recordings include audio by default?
2. What's the maximum recording duration allowed?
3. How long should recordings be retained?
4. Should we support multiple simultaneous recordings?
5. What video quality options should be available?

## Next Steps (Updated)

### Immediate Next Steps:
1. ✅ Phase 1-3 Complete - Basic recording functionality working
2. 🔄 **Current Focus**: Agent Workflow Integration
   - Create agent endpoint for processing recordings
   - Implement recording analysis queue
   - Add context collection during recording
3. ⏳ **Upcoming**: Advanced Features
   - Recording management UI
   - Playback functionality
   - Export options

### Agent Workflow Integration Tasks:
1. **Create Recording Analysis Endpoint**
   ```typescript
   POST /analyze-recording
   {
     recordingPath: string,
     description: string,
     metadata: {
       duration: number,
       consoleLogs: any[],
       networkRequests: any[]
     }
   }
   ```

2. **Implement Context Collection**
   - Capture console logs during recording period
   - Track network requests during recording
   - Monitor DOM changes
   - Collect performance metrics

3. **Create Agent Processing Queue**
   - Queue system for recording analysis
   - Webhook support for external agents
   - Status tracking for analysis progress

4. **Build Recording Management UI**
   - List all recordings
   - Preview recordings
   - Delete old recordings
   - Export recordings

5. **Add Advanced Recording Options**
   - Quality settings
   - Audio toggle
   - Area selection
   - Annotation tools