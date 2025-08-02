// Alternative recording implementation using Screen Recording API
// This can be used if chrome.tabCapture doesn't work due to permissions

async function startScreenRecording() {
  try {
    // Request screen recording permission
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      }
    });

    // Create MediaRecorder
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9,opus'
    });

    const chunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      // Save or process the recording
      saveRecording(blob);
    };

    // Start recording
    mediaRecorder.start(1000); // Collect data every second

    // Store recorder reference
    window.currentRecorder = mediaRecorder;
    window.currentStream = stream;

    return { success: true, message: "Recording started" };
  } catch (error) {
    console.error('Error starting screen recording:', error);
    return { success: false, error: error.message };
  }
}

function stopScreenRecording() {
  if (window.currentRecorder && window.currentRecorder.state === 'recording') {
    window.currentRecorder.stop();
    
    // Stop all tracks
    if (window.currentStream) {
      window.currentStream.getTracks().forEach(track => track.stop());
    }
    
    return { success: true, message: "Recording stopped" };
  }
  
  return { success: false, error: "No active recording" };
}

async function saveRecording(blob) {
  // Convert blob to base64
  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64data = reader.result;
    
    // Send to server
    try {
      const response = await fetch('http://localhost:3025/recording-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: base64data,
          timestamp: Date.now()
        })
      });
      
      if (response.ok) {
        console.log('Recording saved successfully');
      } else {
        console.error('Failed to save recording');
      }
    } catch (error) {
      console.error('Error saving recording:', error);
    }
  };
  
  reader.readAsDataURL(blob);
}

// Export functions for use in panel.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    startScreenRecording,
    stopScreenRecording
  };
}