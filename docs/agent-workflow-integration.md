# Agent Workflow Integration for Screen Recording

## Overview
This document describes how AI agents can integrate with the Browser Tools MCP screen recording functionality to automatically analyze recordings and provide insights.

## Architecture

### Recording with Context
When a screen recording is captured, the system automatically collects:
- **Console Logs**: All console messages during the recording period
- **Console Errors**: JavaScript errors that occurred
- **Network Requests**: HTTP requests made during recording
- **Network Errors**: Failed network requests
- **Recording Metadata**: Duration, timestamp, description, file paths

### Analysis Workflow

```
User Records → Context Captured → Recording Saved → Agent Analysis → Results
     ↓               ↓                   ↓                ↓              ↓
   Screen      Logs/Network         WebM + JSON      AI Processing   Insights
```

## API Endpoints

### 1. Start Recording
```http
POST /start-recording
{
  "tabId": "screen-recording",
  "recordingId": "rec_123456",
  "description": "User checkout flow issue"
}
```

### 2. Stop Recording
```http
POST /stop-recording
{
  "recordingId": "rec_123456"
}
```

### 3. Analyze Recording
```http
POST /analyze-recording
{
  "recordingPath": "/path/to/recording.webm",
  "description": "optional override",
  "immediate": true
}
```

### 4. Get Analysis Status
```http
GET /analysis-status/:analysisId
```

### 5. List Recordings
```http
GET /recordings
```

## MCP Tools for Agents

### Recording Control
```javascript
// Start recording
await startScreenRecording({ 
  description: "Bug reproduction attempt" 
})

// Stop recording
await stopScreenRecording()

// Check status
await getRecordingStatus()
```

### Recording Management
```javascript
// List all recordings
const recordings = await listRecordings()

// Analyze a specific recording
const analysisId = await analyzeRecording({
  recordingPath: recordings[0].videoPath,
  immediate: true
})

// Check analysis progress
const status = await getAnalysisStatus({ 
  analysisId: analysisId 
})

// Delete old recording
await deleteRecording({ 
  filename: "recording-2024-01-15T10-30-45-123.webm" 
})
```

## Recording Metadata Structure

Each recording creates a JSON metadata file with the following structure:

```json
{
  "recordingId": "rec_1234567890",
  "tabId": "screen-recording",
  "description": "User provided description",
  "startTime": 1234567890000,
  "endTime": 1234567900000,
  "duration": 10000,
  "filename": "recording-2024-01-15T10-30-45-123.webm",
  "context": {
    "consoleLogs": 15,
    "consoleErrors": 2,
    "networkRequests": 23,
    "networkErrors": 1,
    "logs": {
      "consoleLogs": [...],
      "consoleErrors": [...],
      "networkRequests": [...],
      "networkErrors": [...]
    }
  }
}
```

## Agent Integration Patterns

### 1. Reactive Analysis
Agent analyzes recordings after user reports an issue:

```javascript
// User: "I recorded a bug, please analyze it"
const recordings = await listRecordings();
const latest = recordings[0];

const analysisId = await analyzeRecording({
  recordingPath: latest.videoPath,
  immediate: true
});

// Wait for analysis
let status;
do {
  await new Promise(resolve => setTimeout(resolve, 2000));
  status = await getAnalysisStatus({ analysisId });
} while (status.status === 'processing');

// Return results
console.log("Analysis complete:", status.result);
```

### 2. Proactive Monitoring
Agent automatically analyzes recordings with errors:

```javascript
const recordings = await listRecordings();

for (const recording of recordings) {
  // Check if recording has errors
  if (recording.context.consoleErrors > 0 || 
      recording.context.networkErrors > 0) {
    
    // Automatically analyze
    await analyzeRecording({
      recordingPath: recording.videoPath,
      immediate: true
    });
  }
}
```

### 3. Guided Debugging
Agent guides user through recording specific scenarios:

```javascript
// Agent: "Let's record the checkout process to debug the issue"
await startScreenRecording({ 
  description: "Checkout flow - payment validation error" 
});

// Agent: "Please navigate to the checkout page and reproduce the error"
// ... user performs actions ...

// Agent: "I see the error occurred. Let me stop the recording and analyze"
await stopScreenRecording();

// Get the latest recording
const recordings = await listRecordings();
const recording = recordings[0];

// Analyze with context
const analysisId = await analyzeRecording({
  recordingPath: recording.videoPath,
  immediate: true
});
```

## Context Analysis Examples

### Console Error Analysis
```javascript
// From recording metadata
const errors = recording.context.logs.consoleErrors;
errors.forEach(error => {
  console.log(`Error at ${error.timestamp}: ${error.message}`);
  console.log(`Stack: ${error.stack}`);
});
```

### Network Request Analysis
```javascript
// Find failed requests
const failedRequests = recording.context.logs.networkErrors;
failedRequests.forEach(req => {
  console.log(`Failed ${req.method} ${req.url}`);
  console.log(`Status: ${req.status}`);
  console.log(`Error: ${req.error}`);
});
```

### Performance Analysis
```javascript
// Analyze request timings
const requests = recording.context.logs.networkRequests;
const slowRequests = requests.filter(req => req.duration > 1000);
console.log(`Found ${slowRequests.length} slow requests`);
```

## Webhook Integration (Future)

For external agent systems, webhook support can be added:

```javascript
// Configure webhook
POST /configure-webhook
{
  "url": "https://agent.example.com/analyze",
  "events": ["recording.completed", "recording.error"],
  "secret": "webhook_secret_key"
}

// Webhook payload
{
  "event": "recording.completed",
  "timestamp": 1234567890,
  "recording": {
    "path": "/path/to/recording.webm",
    "metadata": { ... },
    "context": { ... }
  }
}
```

## Best Practices

### 1. Recording Guidelines
- Keep recordings focused on specific issues
- Add descriptive captions before recording
- Record only necessary duration (< 5 minutes recommended)
- Include reproduction steps in description

### 2. Analysis Optimization
- Process recordings with errors first
- Batch analyze similar issues
- Cache analysis results
- Clean up old recordings regularly

### 3. Context Enrichment
- Correlate console logs with user actions
- Track network request patterns
- Monitor performance metrics
- Identify error clusters

### 4. Privacy Considerations
- Recordings stay local by default
- Sanitize sensitive data in logs
- Implement retention policies
- Get user consent for analysis

## Example Agent Responses

### Bug Analysis
```
Based on the recording analysis:

🔍 **Issue Identified**: Payment validation error
📍 **Location**: checkout.js:245
🕒 **Timestamp**: 2:34 into recording

**Context**:
- Console Error: "TypeError: Cannot read property 'cardNumber' of undefined"
- Failed API call: POST /api/validate-payment (400)
- User action: Clicked "Submit Payment" button

**Recommendation**:
Add null check before accessing payment form data.
```

### Performance Analysis
```
Recording shows performance issues:

⚡ **Slow Operations**:
- Product list API: 3.2s (should be < 1s)
- Image loading: 15 images > 500ms
- Total page load: 8.5s

**Network Analysis**:
- 45 total requests
- 3 failed requests
- 12MB total transfer

**Suggestions**:
1. Implement pagination for product list
2. Add image lazy loading
3. Enable HTTP/2 multiplexing
```

## Future Enhancements

1. **Video Analysis**: Use computer vision to detect UI issues
2. **Audio Transcription**: Convert spoken descriptions to text
3. **Automated Testing**: Generate test cases from recordings
4. **Comparison Analysis**: Compare recordings to detect regressions
5. **Real-time Analysis**: Analyze while recording is in progress

## Integration Checklist

- [ ] Set up recording with description
- [ ] Implement context collection
- [ ] Configure analysis endpoint
- [ ] Handle analysis results
- [ ] Create cleanup policies
- [ ] Test error scenarios
- [ ] Document agent prompts
- [ ] Monitor performance impact