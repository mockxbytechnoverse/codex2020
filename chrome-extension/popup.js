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

// Countdown Elements
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownNumber = document.getElementById('countdown-number');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkConnection();
    loadSavedDescription();
    
    // Check if already recording
    chrome.storage.local.get(['isRecording'], (result) => {
        if (result.isRecording) {
            // Check if there's actually an active recording
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    // Send a ping to see if recording is actually active
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'PING_RECORDING' }, (response) => {
                        if (chrome.runtime.lastError || !response || !response.isRecording) {
                            // No active recording, clear the state
                            chrome.storage.local.set({ isRecording: false });
                            chrome.storage.local.remove(['desktopRecording']);
                        } else {
                            // Resume recording UI state
                            startRecordingUI();
                        }
                    });
                } else {
                    // No active tab, clear state
                    chrome.storage.local.set({ isRecording: false });
                    chrome.storage.local.remove(['desktopRecording']);
                }
            });
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
    
    // Start timer
    timerInterval = setInterval(() => {
        updateTimer();
    }, 1000);
    updateTimer();
    
    // Save state
    chrome.storage.local.set({ isRecording: true });
}


// Stop recording UI
function stopRecordingUI() {
    isRecording = false;
    
    // Reset recording pill buttons
    recordTabCard.querySelector('.text').textContent = 'Record tab';
    recordDesktopCard.querySelector('.text').textContent = 'Record desktop';
    recordTabCard.classList.remove('recording');
    recordDesktopCard.classList.remove('recording');
    
    // Send message to hide recording bar in content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'HIDE_RECORDING_BAR'
            });
        }
    });
    
    // Stop timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerElement.textContent = '00:00';
    
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
        
        // Get active tab
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (recordCurrentTab) {
            // For tab recording, we need to use a different approach
            // First, inject the recording bar script into the page
            await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['recording-bar.js']
            });
            
            // Show countdown
            showCountdown(async () => {
                // Close the popup to allow tab capture to work
                window.close();
                
                // Send message to background script to start recording
                chrome.runtime.sendMessage({
                    type: 'START_TAB_RECORDING_FROM_POPUP',
                    tabId: activeTab.id,
                    description: descriptionInput.value.trim()
                });
            });
        } else {
            // For desktop recording, use chrome.desktopCapture
            showCountdown(() => {
                // Get stream ID via desktopCapture API
                chrome.runtime.sendMessage({
                    type: 'REQUEST_DESKTOP_CAPTURE'
                }, async (response) => {
                    if (response && response.streamId) {
                        // Inject recording bar and content-recording script into active tab first
                        await chrome.scripting.executeScript({
                            target: { tabId: activeTab.id },
                            files: ['recording-bar.js', 'content-recording.js']
                        });
                        
                        // Start recording in the content script with desktop stream
                        chrome.tabs.sendMessage(activeTab.id, {
                            type: 'START_DESKTOP_RECORDING_WITH_STREAM_ID',
                            streamId: response.streamId,
                            description: descriptionInput.value.trim()
                        }, async (startResponse) => {
                            if (startResponse && startResponse.success) {
                                // Show recording bar
                                await chrome.tabs.sendMessage(activeTab.id, {
                                    type: 'SHOW_RECORDING_BAR'
                                });
                                
                                // Update UI and close popup
                                isRecording = true;
                                recordingStartTime = Date.now();
                                chrome.storage.local.set({ 
                                    isRecording: true,
                                    desktopRecording: {
                                        isActive: true,
                                        startTime: Date.now(),
                                        description: descriptionInput.value.trim()
                                    }
                                });
                                
                                // Close popup
                                window.close();
                            } else {
                                showError('Failed to start desktop recording');
                            }
                        });
                    } else {
                        showError('Failed to get desktop capture permission');
                    }
                });
            });
        }
        
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




// Show error message
function showError(message) {
    chrome.notifications.create({
        type: 'basic',
        
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


// Handle window unload
window.addEventListener('unload', () => {
    if (isRecording && mediaRecorder) {
        // Don't stop recording when popup closes
        console.log('Popup closing but recording continues...');
    }
});

