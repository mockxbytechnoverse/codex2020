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
let isMicrophoneMuted = true;
let hasMicrophonePermission = false;

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
const countdownSubtitle = document.getElementById('countdown-subtitle');

// Bottom Control Elements
const microphoneButton = document.getElementById('microphone-button');
const permissionButton = document.getElementById('permission-button');
const permissionText = document.getElementById('permission-text');
const helpButton = document.getElementById('help-button');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkConnection();
    loadSavedDescription();
    checkMicrophonePermission();
    
    // Check if already recording
    chrome.storage.local.get(['isRecording', 'isMicrophoneMuted'], (result) => {
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
        
        // Restore mute state
        if (result.isMicrophoneMuted !== undefined) {
            isMicrophoneMuted = result.isMicrophoneMuted;
            updateMicrophoneButton();
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
    updateCountdownSubtitle(); // Update subtitle based on microphone state
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
    console.log('Popup: startScreenRecording called with recordCurrentTab:', recordCurrentTab);
    try {
        // Save description
        saveDescription();
        
        // Get active tab
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('Popup: Got active tab:', activeTab.id, activeTab.url);
        
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
            // For desktop recording, use chrome.desktopCapture - no countdown needed
            console.log('Popup: Starting desktop recording without countdown');
            
            // Prevent multiple calls
            if (window.desktopRecordingInProgress) {
                console.log('Popup: Desktop recording already in progress, ignoring');
                return;
            }
            window.desktopRecordingInProgress = true;
            
            // Send desktop capture request - background will handle everything
            console.log('Popup: Sending REQUEST_DESKTOP_CAPTURE message with description');
            
            chrome.runtime.sendMessage({
                type: 'REQUEST_DESKTOP_CAPTURE',
                description: descriptionInput.value.trim()
            }, (response) => {
                console.log('Popup: Desktop capture setup response:', response);
                window.desktopRecordingInProgress = false; // Reset flag
                
                if (chrome.runtime.lastError) {
                    console.error('Popup: Runtime error in desktop capture:', chrome.runtime.lastError);
                    showError('Desktop capture request failed: ' + chrome.runtime.lastError.message);
                    return;
                }
                
                if (response && response.success) {
                    console.log('Popup: Desktop recording setup successful, closing popup');
                    
                    // Update popup UI state
                    isRecording = true;
                    recordingStartTime = Date.now();
                    
                    // Close popup after a short delay
                    setTimeout(() => {
                        console.log('Popup: Closing popup after successful desktop recording setup');
                        window.close();
                    }, 1000);
                } else {
                    console.error('Popup: Desktop recording setup failed:', response);
                    if (response && response.error) {
                        showError('Desktop recording failed: ' + response.error);
                    } else {
                        showError('Desktop recording was cancelled or failed');
                    }
                }
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

// Screenshot card - now opens review interface
screenshotCard.addEventListener('click', async () => {
    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Check if we can inject cursor selection into this tab
        if (tab.url.startsWith('chrome://') || 
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('edge://') ||
            tab.url.startsWith('about:')) {
            // Use fallback screenshot method for browser pages
            chrome.runtime.sendMessage({
                type: 'CAPTURE_SCREENSHOT_FALLBACK',
                tabId: tab.id
            }, handleScreenshotResponse);
            return;
        }
        
        // Inject cursor selection script
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['cursor-selection.js']
        });
        
        // Start selection mode
        chrome.tabs.sendMessage(tab.id, {
            type: 'START_SELECTION_MODE'
        }, (response) => {
            if (response && response.success) {
                // Close popup to allow selection
                window.close();
            } else {
                // Fallback to direct screenshot
                chrome.runtime.sendMessage({
                    type: 'CAPTURE_SCREENSHOT_FALLBACK',
                    tabId: tab.id
                }, handleScreenshotResponse);
            }
        });
        
    } catch (error) {
        console.error('Error starting screenshot capture:', error);
        // Fallback to direct screenshot
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.runtime.sendMessage({
            type: 'CAPTURE_SCREENSHOT_FALLBACK',
            tabId: tab.id
        }, handleScreenshotResponse);
    }
});

// Handle screenshot response (used by fallback method)
function handleScreenshotResponse(response) {
    if (response && response.success) {
        // Open review interface
        chrome.tabs.create({
            url: chrome.runtime.getURL('screenshot-review.html')
        });
    } else {
        showError('Failed to capture screenshot');
    }
}

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
    console.log('Popup: Desktop recording button clicked, isRecording:', isRecording);
    if (!isRecording) {
        console.log('Popup: Calling startScreenRecording(false) for desktop');
        const success = await startScreenRecording(false); // false = record desktop
        console.log('Popup: startScreenRecording returned:', success);
        if (!success) {
            console.error('Popup: Failed to start desktop recording');
        }
    } else {
        console.log('Popup: Already recording, stopping');
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

// Microphone permission button click
permissionButton.addEventListener('click', handlePermissionClick);

// Microphone toggle button click
microphoneButton.addEventListener('click', handleMicrophoneToggle);

// Help button click
helpButton.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://browsertools.agentdesk.ai/' });
});

// Check microphone permission status
async function checkMicrophonePermission() {
    try {
        // First check if permission was previously granted and stored
        const stored = await chrome.storage.local.get(['hasMicrophonePermission']);
        if (stored.hasMicrophonePermission) {
            hasMicrophonePermission = true;
            updatePermissionUI(true);
            return;
        }
        
        // Try to check current permission status
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
            
            if (permissionStatus.state === 'granted') {
                hasMicrophonePermission = true;
                chrome.storage.local.set({ hasMicrophonePermission: true });
                updatePermissionUI(true);
            } else {
                hasMicrophonePermission = false;
                updatePermissionUI(false);
            }
            
            // Listen for permission changes
            permissionStatus.addEventListener('change', () => {
                if (permissionStatus.state === 'granted') {
                    hasMicrophonePermission = true;
                    chrome.storage.local.set({ hasMicrophonePermission: true });
                    updatePermissionUI(true);
                } else {
                    hasMicrophonePermission = false;
                    chrome.storage.local.set({ hasMicrophonePermission: false });
                    updatePermissionUI(false);
                }
            });
        } catch (permError) {
            // Permissions API might not work in extension popup context
            console.log('Permissions API not available in popup context');
            hasMicrophonePermission = false;
            updatePermissionUI(false);
        }
    } catch (error) {
        console.error('Error checking microphone permission:', error);
        hasMicrophonePermission = false;
        updatePermissionUI(false);
    }
}

// Handle permission button click
async function handlePermissionClick() {
    if (hasMicrophonePermission) {
        // Permission already granted, do nothing
        return;
    }
    
    try {
        // Get the current active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]) {
            throw new Error('No active tab found');
        }
        
        const currentTab = tabs[0];
        
        // Check if we can inject scripts into this tab
        if (currentTab.url.startsWith('chrome://') || 
            currentTab.url.startsWith('chrome-extension://') ||
            currentTab.url.startsWith('edge://') ||
            currentTab.url.startsWith('about:')) {
            // Can't inject into browser pages, show instruction
            showPermissionInstructions();
            return;
        }
        
        // Inject a script into the current tab to request microphone permission
        const results = await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: async () => {
                try {
                    // Request microphone permission in the context of the web page
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    // Stop the stream immediately as we just needed permission
                    stream.getTracks().forEach(track => track.stop());
                    return { success: true };
                } catch (error) {
                    return { success: false, error: error.name };
                }
            }
        });
        
        const result = results[0].result;
        if (result.success) {
            // Permission granted, update UI and store state
            hasMicrophonePermission = true;
            isMicrophoneMuted = false; // Default to unmuted when permission is granted
            chrome.storage.local.set({ 
                hasMicrophonePermission: true,
                isMicrophoneMuted: false
            });
            updatePermissionUI(true);
            updateMicrophoneButton();
            updateCountdownSubtitle();
            
            // Show success notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.svg',
                title: 'Microphone Permission Granted',
                message: 'You can now record audio during screen recordings!'
            });
        } else {
            console.error('Microphone permission denied:', result.error);
            if (result.error === 'NotAllowedError') {
                showPermissionDeniedMessage();
            } else {
                showPermissionInstructions();
            }
        }
    } catch (error) {
        console.error('Error handling permission click:', error);
        showPermissionInstructions();
    }
}

// Show permission instructions to user
function showPermissionInstructions() {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.svg',
        title: 'Microphone Permission Required',
        message: 'Please navigate to a regular website (like google.com) and click "Grant permission" again to enable microphone access.'
    });
}

// Show permission denied message
function showPermissionDeniedMessage() {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.svg',
        title: 'Microphone Permission Denied',
        message: 'Please allow microphone access in your browser settings or try again on a different website.'
    });
}

// Update permission UI
function updatePermissionUI(granted) {
    if (granted) {
        permissionButton.classList.add('granted');
        permissionText.textContent = 'Permission granted';
        permissionButton.querySelector('.permission-icon').textContent = '✅';
        microphoneButton.classList.add('enabled');
    } else {
        permissionButton.classList.remove('granted');
        permissionText.textContent = 'Grant permission';
        permissionButton.querySelector('.permission-icon').textContent = '🔴';
        microphoneButton.classList.remove('enabled');
    }
}

// Handle microphone toggle
function handleMicrophoneToggle() {
    if (!hasMicrophonePermission) {
        // No permission, can't toggle
        return;
    }
    
    isMicrophoneMuted = !isMicrophoneMuted;
    chrome.storage.local.set({ isMicrophoneMuted });
    updateMicrophoneButton();
    updateCountdownSubtitle();
    
    // If recording is active, send message to toggle mute
    if (isRecording) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.runtime.sendMessage({
                    type: 'TOGGLE_MUTE',
                    tabId: tabs[0].id,
                    isMuted: isMicrophoneMuted
                });
            }
        });
    }
}

// Update microphone button appearance
function updateMicrophoneButton() {
    if (isMicrophoneMuted) {
        microphoneButton.classList.add('muted');
        microphoneButton.innerHTML = '🔇';
    } else {
        microphoneButton.classList.remove('muted');
        microphoneButton.innerHTML = '🎤';
    }
}

// Update countdown subtitle based on microphone state
function updateCountdownSubtitle() {
    if (countdownSubtitle) {
        if (isMicrophoneMuted) {
            countdownSubtitle.innerHTML = 'Your microphone is currently <span class="muted">muted</span>.';
        } else {
            countdownSubtitle.innerHTML = 'Your microphone is currently <span style="color: #34c759;">enabled</span>.';
        }
    }
}

