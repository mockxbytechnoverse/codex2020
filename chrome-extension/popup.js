// Popup functionality for Browser Tools MCP

// State
let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;
let mediaRecorder = null;
let recordingStream = null;
let recordedChunks = [];
let countdownInterval = null;
let isPaused = false;

// UI Elements
const descriptionInput = document.getElementById('description');
const recordingStatus = document.getElementById('recording-status');
const timerElement = document.getElementById('timer');
const statusDot = document.getElementById('status-dot');
const connectionText = document.getElementById('connection-text');
const connectionStatus = document.getElementById('connection-status');

// Pill Button Elements
const screenshotCard = document.getElementById('screenshot-card');
const recordTabCard = document.getElementById('record-tab-card');
const recordDesktopCard = document.getElementById('record-desktop-card');
const homeBtn = document.getElementById('home-btn');
const settingsBtn = document.getElementById('settings-btn');

// Countdown and Recording Bar Elements
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownNumber = document.getElementById('countdown-number');
const recordingBar = document.getElementById('recording-bar');
const recordingTimerBar = document.getElementById('recording-timer-bar');
const pauseBtn = document.getElementById('pause-btn');
const muteBtn = document.getElementById('mute-btn');
const stopRecordingBtn = document.getElementById('stop-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkConnection();
    loadSavedDescription();
    
    // Check if already recording
    chrome.storage.local.get(['isRecording'], (result) => {
        if (result.isRecording) {
            // Resume recording UI state
            startRecordingUI();
        }
    });
});

// Check server connection
async function checkConnection() {
    try {
        const settings = await chrome.storage.local.get(['browserConnectorSettings']);
        const config = settings.browserConnectorSettings || {
            serverHost: 'localhost',
            serverPort: 3025
        };
        
        const response = await fetch(`http://${config.serverHost}:${config.serverPort}/.identity`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
        });
        
        if (response.ok) {
            statusDot.classList.remove('disconnected');
            statusDot.classList.add('connected');
            connectionText.textContent = 'Connected to server';
            // Show connection status only if there are issues
            connectionStatus.style.display = 'none';
        } else {
            throw new Error('Server not responding');
        }
    } catch (error) {
        statusDot.classList.remove('connected');
        statusDot.classList.add('disconnected');
        connectionText.textContent = 'Server disconnected';
        connectionStatus.style.display = 'flex';
    }
}

// Format time
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update timer
function updateTimer() {
    if (recordingStartTime) {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        timerElement.textContent = formatTime(elapsed);
    }
}

// Save description to storage
function saveDescription() {
    const description = descriptionInput.value.trim();
    chrome.storage.local.set({ lastDescription: description });
}

// Load saved description
function loadSavedDescription() {
    chrome.storage.local.get(['lastDescription'], (result) => {
        if (result.lastDescription) {
            descriptionInput.value = result.lastDescription;
        }
    });
}

// Start recording UI
function startRecordingUI() {
    isRecording = true;
    recordingStartTime = Date.now();
    
    // Update recording pill buttons - change text and add visual feedback
    recordTabCard.querySelector('.text').textContent = 'Stop Recording';
    recordDesktopCard.querySelector('.text').textContent = 'Stop Recording';
    recordTabCard.classList.add('recording');
    recordDesktopCard.classList.add('recording');
    
    // Hide recording status in popup
    recordingStatus.classList.remove('active');
    
    // Show recording bar at bottom
    recordingBar.classList.add('active');
    
    // Start timer
    timerInterval = setInterval(() => {
        updateTimer();
        updateRecordingBarTimer();
    }, 1000);
    updateTimer();
    updateRecordingBarTimer();
    
    // Save state
    chrome.storage.local.set({ isRecording: true });
}

// Update recording bar timer
function updateRecordingBarTimer() {
    if (recordingStartTime) {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        recordingTimerBar.textContent = formatTime(elapsed);
    }
}

// Stop recording UI
function stopRecordingUI() {
    isRecording = false;
    
    // Reset recording pill buttons
    recordTabCard.querySelector('.text').textContent = 'Record tab';
    recordDesktopCard.querySelector('.text').textContent = 'Record desktop';
    recordTabCard.classList.remove('recording');
    recordDesktopCard.classList.remove('recording');
    
    // Hide recording bar
    recordingBar.classList.remove('active');
    
    // Stop timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerElement.textContent = '00:00';
    recordingTimerBar.textContent = '00:00';
    
    // Clear state
    chrome.storage.local.set({ isRecording: false });
}

// Show countdown overlay
function showCountdown(callback) {
    countdownOverlay.classList.add('active');
    let count = 3;
    countdownNumber.textContent = count;
    
    countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownNumber.textContent = count;
            countdownNumber.style.animation = 'none';
            setTimeout(() => {
                countdownNumber.style.animation = 'countdownPulse 1s ease-in-out';
            }, 10);
        } else {
            clearInterval(countdownInterval);
            countdownOverlay.classList.remove('active');
            callback();
        }
    }, 1000);
}

// Start screen recording
async function startScreenRecording(recordCurrentTab = false) {
    try {
        // Save description
        saveDescription();
        
        // Show countdown first
        showCountdown(async () => {
                if (recordCurrentTab) {
                // For tab recording, use chrome.tabCapture API
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                
                // Request tab capture
                chrome.tabCapture.capture({
                    video: true,
                    audio: true,
                    videoConstraints: {
                        mandatory: {
                            chromeMediaSource: 'tab',
                            maxWidth: 1920,
                            maxHeight: 1080
                        }
                    }
                }, (stream) => {
                    if (stream) {
                        recordingStream = stream;
                        startMediaRecorder();
                    } else {
                        throw new Error('Failed to capture tab');
                    }
                });
            } else {
                // Request screen capture for desktop
                recordingStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: { ideal: 1920, max: 1920 },
                        height: { ideal: 1080, max: 1080 },
                        frameRate: { ideal: 30, max: 30 }
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 44100
                    }
                });
                startMediaRecorder();
            }
        });
        
        return true;
    } catch (error) {
        console.error('Error starting screen recording:', error);
        if (error.name === 'NotAllowedError') {
            showError('Screen recording was cancelled');
        } else {
            showError('Failed to start recording: ' + error.message);
        }
        return false;
    }
}

// Separate function to handle MediaRecorder setup
function startMediaRecorder() {
    try {

        // Create MediaRecorder
        mediaRecorder = new MediaRecorder(recordingStream, {
            mimeType: 'video/webm;codecs=vp9,opus'
        });

        recordedChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            await saveRecording(blob);
        };

        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event);
            stopRecording();
        };

        // Handle stream ending (user stops sharing)
        recordingStream.getVideoTracks()[0].onended = () => {
            console.log('User stopped screen sharing');
            if (isRecording) {
                stopRecording();
            }
        };

        // Start recording
        mediaRecorder.start(1000); // Collect data every second
        
        // Update UI
        startRecordingUI();
        
        // Show notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon128.png',
            title: 'Recording Started',
            message: 'Your screen is now being recorded'
        });
    } catch (error) {
        console.error('Error starting MediaRecorder:', error);
        showError('Failed to start recording: ' + error.message);
    }
}

// Stop recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    
    if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
    }
    
    stopRecordingUI();
}

// Save recording to server
async function saveRecording(blob) {
    try {
        const settings = await chrome.storage.local.get(['browserConnectorSettings']);
        const config = settings.browserConnectorSettings || {
            serverHost: 'localhost',
            serverPort: 3025
        };
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64data = reader.result;
            
            // Send to server
            const response = await fetch(`http://${config.serverHost}:${config.serverPort}/recording-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: base64data,
                    description: descriptionInput.value.trim(),
                    duration: Date.now() - recordingStartTime,
                    timestamp: Date.now()
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Recording saved successfully:', result);
                
                // Show success notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon128.png',
                    title: 'Recording Saved',
                    message: `Recording saved to ${result.filename}`
                });
                
                // Flash success on pill buttons
                const originalTabText = recordTabCard.querySelector('.text').textContent;
                const originalDesktopText = recordDesktopCard.querySelector('.text').textContent;
                
                recordTabCard.querySelector('.text').textContent = 'Recording Saved!';
                recordDesktopCard.querySelector('.text').textContent = 'Recording Saved!';
                
                setTimeout(() => {
                    recordTabCard.querySelector('.text').textContent = originalTabText;
                    recordDesktopCard.querySelector('.text').textContent = originalDesktopText;
                }, 2000);
            } else {
                throw new Error('Failed to save recording');
            }
        };
        
        reader.readAsDataURL(blob);
    } catch (error) {
        console.error('Error saving recording:', error);
        showError('Failed to save recording: ' + error.message);
    }
}

// Show error message
function showError(message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'Error',
        message: message
    });
}

// Event Listeners

// Screenshot card
screenshotCard.addEventListener('click', async () => {
    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Send message to background script
        chrome.runtime.sendMessage({
            type: 'CAPTURE_SCREENSHOT',
            tabId: tab.id
        }, (response) => {
            if (response && response.success) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon128.png',
                    title: 'Screenshot Captured',
                    message: 'Screenshot saved successfully'
                });
            } else {
                showError('Failed to capture screenshot');
            }
        });
    } catch (error) {
        console.error('Error capturing screenshot:', error);
        showError('Failed to capture screenshot');
    }
});

// Record tab card - automatically records current tab
recordTabCard.addEventListener('click', async () => {
    if (!isRecording) {
        const success = await startScreenRecording(true); // true = record current tab
        if (!success) {
            console.error('Failed to start recording');
        }
    } else {
        stopRecording();
    }
});

// Record desktop card
recordDesktopCard.addEventListener('click', async () => {
    if (!isRecording) {
        const success = await startScreenRecording(false); // false = record desktop
        if (!success) {
            console.error('Failed to start recording');
        }
    } else {
        stopRecording();
    }
});

// Home button
homeBtn.addEventListener('click', () => {
    // Could navigate to a home view or close popup
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'Home',
        message: 'Already at home view'
    });
});

// Settings button
settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

// Save description on input
descriptionInput.addEventListener('input', () => {
    saveDescription();
});

// Auto-save description every few seconds while typing
let saveTimeout;
descriptionInput.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveDescription, 1000);
});

// Countdown overlay click to pause
countdownOverlay.addEventListener('click', () => {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        countdownOverlay.classList.remove('active');
    }
});

// Recording bar controls
stopRecordingBtn.addEventListener('click', () => {
    stopRecording();
});

pauseBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        pauseBtn.innerHTML = `
            <svg viewBox="0 0 24 24" class="control-icon">
                <path d="M8 5v14l11-7z" fill="currentColor"/>
            </svg>
        `;
        pauseBtn.title = 'Resume';
        isPaused = true;
    } else if (mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        pauseBtn.innerHTML = `
            <svg viewBox="0 0 24 24" class="control-icon">
                <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
            </svg>
        `;
        pauseBtn.title = 'Pause';
        isPaused = false;
    }
});

muteBtn.addEventListener('click', () => {
    if (recordingStream) {
        const audioTracks = recordingStream.getAudioTracks();
        if (audioTracks.length > 0) {
            const isMuted = !audioTracks[0].enabled;
            audioTracks.forEach(track => track.enabled = isMuted);
            if (isMuted) {
                muteBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" class="control-icon">
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor"/>
                    </svg>
                `;
                muteBtn.title = 'Unmute';
            } else {
                muteBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" class="control-icon">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
                    </svg>
                `;
                muteBtn.title = 'Mute';
            }
        }
    }
});

// Handle window unload
window.addEventListener('unload', () => {
    if (isRecording && mediaRecorder) {
        // Don't stop recording when popup closes
        console.log('Popup closing but recording continues...');
    }
});