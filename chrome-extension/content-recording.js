// Content script for handling recording with stream ID
let mediaRecorder = null;
let recordingStream = null;
let recordedChunks = [];
let recordingStartTime = null;
let recordingDescription = '';

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content-recording: Received message", message.type);
    
    if (message.type === 'START_RECORDING_WITH_STREAM_ID') {
        console.log("Content-recording: Starting tab recording with stream ID:", message.streamId);
        startRecordingWithStreamId(message.streamId, message.description);
        sendResponse({ success: true });
    } else if (message.type === 'START_DESKTOP_RECORDING_WITH_STREAM_ID') {
        startDesktopRecordingWithStreamId(message.streamId, message.description)
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));
        return true;
    } else if (message.type === 'STOP_RECORDING') {
        stopRecording();
        sendResponse({ success: true });
    } else if (message.type === 'PAUSE_RECORDING') {
        if (mediaRecorder) {
            if (message.isPaused && mediaRecorder.state === 'recording') {
                mediaRecorder.pause();
            } else if (!message.isPaused && mediaRecorder.state === 'paused') {
                mediaRecorder.resume();
            }
        }
        sendResponse({ success: true });
    } else if (message.type === 'TOGGLE_MUTE') {
        if (recordingStream) {
            const audioTracks = recordingStream.getAudioTracks();
            audioTracks.forEach(track => track.enabled = !message.isMuted);
        }
        sendResponse({ success: true });
    } else if (message.type === 'PING_RECORDING') {
        // Respond with current recording state
        sendResponse({ 
            isRecording: mediaRecorder !== null && mediaRecorder.state !== 'inactive'
        });
    }
    return true;
});

async function startRecordingWithStreamId(streamId, description) {
    console.log("Content-recording: startRecordingWithStreamId called with:", { streamId, description });
    
    try {
        recordingDescription = description || '';
        
        console.log("Content-recording: Setting up constraints for tab recording");
        
        // Get user media with the stream ID
        const constraints = {
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
        };
        
        console.log("Content-recording: Requesting getUserMedia with constraints:", constraints);
        
        recordingStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        console.log("Content-recording: Got recording stream:", recordingStream);
        
        // Create MediaRecorder
        mediaRecorder = new MediaRecorder(recordingStream, {
            mimeType: 'video/webm;codecs=vp9,opus'
        });
        
        console.log("Content-recording: Created MediaRecorder");
        
        recordedChunks = [];
        recordingStartTime = Date.now();
        
        mediaRecorder.ondataavailable = (event) => {
            console.log("Content-recording: Data available, size:", event.data.size);
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
                console.log("Content-recording: Total chunks:", recordedChunks.length);
            }
        };
        
        mediaRecorder.onstop = async () => {
            console.log("Content-recording: Recording stopped, total chunks:", recordedChunks.length);
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            console.log("Content-recording: Created blob, size:", blob.size);
            await saveRecording(blob);
            
            // Clear recording state
            chrome.storage.local.set({ isRecording: false });
            chrome.storage.local.remove(['desktopRecording']);
            
            // Hide recording bar
            if (window.codexRecordingBar) {
                window.codexRecordingBar.hide();
            }
        };
        
        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event);
            stopRecording();
        };
        
        // Handle stream ending
        recordingStream.getVideoTracks()[0].onended = () => {
            console.log('Recording stream ended');
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                stopRecording();
            }
        };
        
        // Start recording
        mediaRecorder.start(1000); // Collect data every second
        
        // Show notification
        chrome.runtime.sendMessage({
            type: 'SHOW_NOTIFICATION',
            options: {
                type: 'basic',
                
                title: 'Recording Started',
                message: 'Your tab is now being recorded'
            }
        });
        
    } catch (error) {
        console.error('Error starting recording with stream ID:', error);
        chrome.runtime.sendMessage({
            type: 'SHOW_NOTIFICATION',
            options: {
                type: 'basic',
                
                title: 'Recording Error',
                message: 'Failed to start recording: ' + error.message
            }
        });
    }
}

async function startDesktopRecordingWithStreamId(streamId, description) {
    try {
        recordingDescription = description || '';
        
        // Get user media with the desktop stream ID
        const constraints = {
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
        };
        
        recordingStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Create MediaRecorder
        mediaRecorder = new MediaRecorder(recordingStream, {
            mimeType: 'video/webm;codecs=vp9'
        });
        
        recordedChunks = [];
        recordingStartTime = Date.now();
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            await saveRecording(blob);
            
            // Clear recording state
            chrome.storage.local.set({ isRecording: false });
            chrome.storage.local.remove(['desktopRecording']);
            
            // Hide recording bar
            if (window.codexRecordingBar) {
                window.codexRecordingBar.hide();
            }
        };
        
        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event);
            stopRecording();
        };
        
        // Handle stream ending
        recordingStream.getVideoTracks()[0].onended = () => {
            console.log('Desktop recording stream ended');
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                stopRecording();
            }
        };
        
        // Start recording
        mediaRecorder.start(1000); // Collect data every second
        
        // Show notification
        chrome.runtime.sendMessage({
            type: 'SHOW_NOTIFICATION',
            options: {
                type: 'basic',
                
                title: 'Recording Started',
                message: 'Your desktop is now being recorded'
            }
        });
        
    } catch (error) {
        console.error('Error starting desktop recording with stream ID:', error);
        throw error;
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
        recordingStream = null;
    }
    
    // Always clear recording state when stopping
    chrome.storage.local.set({ isRecording: false });
    chrome.storage.local.remove(['desktopRecording']);
}

async function saveRecording(blob) {
    console.log("Content-recording: saveRecording called with blob size:", blob.size);
    
    try {
        // Get server settings
        const settings = await chrome.storage.local.get(['browserConnectorSettings']);
        const config = settings.browserConnectorSettings || {
            serverHost: 'localhost',
            serverPort: 3025
        };
        
        console.log("Content-recording: Server config:", config);
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64data = reader.result;
            console.log("Content-recording: Base64 data length:", base64data.length);
            
            const requestBody = {
                data: base64data,
                description: recordingDescription,
                duration: Date.now() - recordingStartTime,
                timestamp: Date.now()
            };
            
            console.log("Content-recording: Sending request to server with body:", {
                dataLength: requestBody.data.length,
                description: requestBody.description,
                duration: requestBody.duration,
                timestamp: requestBody.timestamp
            });
            
            // Send to server
            const response = await fetch(`http://${config.serverHost}:${config.serverPort}/recording-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log("Content-recording: Server response status:", response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('Content-recording: Recording saved successfully:', result);
                
                // Show success notification
                chrome.runtime.sendMessage({
                    type: 'SHOW_NOTIFICATION',
                    options: {
                        type: 'basic',
                        
                        title: 'Recording Saved',
                        message: `Recording saved to ${result.filename}`
                    }
                });
            } else {
                throw new Error('Failed to save recording');
            }
        };
        
        reader.readAsDataURL(blob);
    } catch (error) {
        console.error('Error saving recording:', error);
        chrome.runtime.sendMessage({
            type: 'SHOW_NOTIFICATION',
            options: {
                type: 'basic',
                
                title: 'Save Error',
                message: 'Failed to save recording: ' + error.message
            }
        });
    }
}