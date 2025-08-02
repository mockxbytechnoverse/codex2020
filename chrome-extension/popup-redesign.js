// VizualAI Popup Redesign - Enhanced JavaScript with Liquid Glass Interactions

// State
let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;
let countdownInterval = null;
let isMicrophoneMuted = true;
let hasMicrophonePermission = false;

// UI Elements
const recordingStatus = document.getElementById('recording-status');
const timerElement = document.getElementById('timer');
const connectionStatus = document.getElementById('connection-status');
const connectionText = document.getElementById('connection-text');
const statusBadge = document.getElementById('status-badge');

// Glass Card Elements
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

// Performance Optimization
const performanceMonitor = {
    init() {
        // Check for battery level
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                if (battery.level < 0.2) {
                    document.body.classList.add('low-battery-mode');
                }
                
                battery.addEventListener('levelchange', () => {
                    if (battery.level < 0.2) {
                        document.body.classList.add('low-battery-mode');
                    } else {
                        document.body.classList.remove('low-battery-mode');
                    }
                });
            });
        }

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (prefersReducedMotion.matches) {
            document.body.classList.add('reduced-motion');
        }

        prefersReducedMotion.addEventListener('change', () => {
            if (prefersReducedMotion.matches) {
                document.body.classList.add('reduced-motion');
            } else {
                document.body.classList.remove('reduced-motion');
            }
        });
    }
};

// Glass Effects Manager
const glassEffects = {
    ripple(element, event) {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const ripple = document.createElement('div');
        ripple.className = 'glass-ripple';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        element.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    },

    glow(element, color = 'var(--vizual-cyan)') {
        element.style.boxShadow = `0 0 30px ${color}, ${getComputedStyle(element).boxShadow}`;
        setTimeout(() => {
            element.style.boxShadow = '';
        }, 300);
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    performanceMonitor.init();
    checkConnection();
    checkMicrophonePermission();
    
    // Check if already recording
    chrome.storage.local.get(['isRecording', 'isMicrophoneMuted'], (result) => {
        if (result.isRecording) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'PING_RECORDING' }, (response) => {
                        if (chrome.runtime.lastError || !response || !response.isRecording) {
                            chrome.storage.local.set({ isRecording: false });
                            chrome.storage.local.remove(['desktopRecording']);
                        } else {
                            startRecordingUI();
                        }
                    });
                } else {
                    chrome.storage.local.set({ isRecording: false });
                    chrome.storage.local.remove(['desktopRecording']);
                }
            });
        }
        
        if (result.isMicrophoneMuted !== undefined) {
            isMicrophoneMuted = result.isMicrophoneMuted;
            updateMicrophoneButton();
        }
    });

    // Add glass interaction effects
    addGlassInteractions();
});

// Add glass interaction effects to all cards
function addGlassInteractions() {
    const cards = document.querySelectorAll('.glass-action-card');
    cards.forEach(card => {
        card.addEventListener('mousedown', (e) => {
            glassEffects.ripple(card, e);
        });
    });

    // Add hover sound effect (optional)
    const buttons = document.querySelectorAll('.glass-icon-btn, .glass-microphone-btn');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.05)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
        });
    });
}

// Check server connection with enhanced UI feedback
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
            statusBadge.querySelector('.status-dot').classList.remove('disconnected');
            statusBadge.querySelector('.status-dot').classList.add('connected');
            connectionText.textContent = 'Connected to server';
            connectionStatus.classList.remove('visible');
            
            // Subtle success glow
            glassEffects.glow(statusBadge, 'rgba(40, 167, 69, 0.5)');
        } else {
            throw new Error('Server not responding');
        }
    } catch (error) {
        statusBadge.querySelector('.status-dot').classList.remove('connected');
        statusBadge.querySelector('.status-dot').classList.add('disconnected');
        connectionText.textContent = 'Server disconnected';
        connectionStatus.classList.add('visible');
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

// Start recording UI with glass animations
function startRecordingUI() {
    isRecording = true;
    recordingStartTime = Date.now();
    
    // Update cards with glass effects
    recordTabCard.querySelector('.card-title').textContent = 'Stop Recording';
    recordDesktopCard.querySelector('.card-title').textContent = 'Stop Recording';
    recordTabCard.classList.add('recording');
    recordDesktopCard.classList.add('recording');
    
    // Show recording status with animation
    recordingStatus.classList.add('active');
    
    // Start timer
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
    
    // Save state
    chrome.storage.local.set({ isRecording: true });
}

// Stop recording UI
function stopRecordingUI() {
    isRecording = false;
    
    // Reset cards
    recordTabCard.querySelector('.card-title').textContent = 'Record Tab';
    recordDesktopCard.querySelector('.card-title').textContent = 'Record Desktop';
    recordTabCard.classList.remove('recording');
    recordDesktopCard.classList.remove('recording');
    
    // Hide recording status
    recordingStatus.classList.remove('active');
    
    // Send message to hide recording bar
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

// Show countdown overlay with enhanced glass effects
function showCountdown(callback) {
    updateCountdownSubtitle();
    countdownOverlay.classList.add('active');
    
    let count = 3;
    countdownNumber.textContent = count;
    
    // Reset ring animation
    const ring = document.querySelector('.countdown-ring');
    ring.style.animation = 'none';
    setTimeout(() => {
        ring.style.animation = 'ringPulse 1s ease-in-out';
    }, 10);
    
    countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownNumber.textContent = count;
            countdownNumber.style.animation = 'none';
            ring.style.animation = 'none';
            
            setTimeout(() => {
                countdownNumber.style.animation = 'countdownScale 1s ease-in-out';
                ring.style.animation = 'ringPulse 1s ease-in-out';
            }, 10);
        } else {
            clearInterval(countdownInterval);
            countdownOverlay.classList.remove('active');
            callback();
        }
    }, 1000);
}

// Enhanced screenshot capture with glass feedback
screenshotCard.addEventListener('click', async () => {
    try {
        // Visual feedback
        glassEffects.glow(screenshotCard, 'var(--vizual-cyan)');
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.runtime.sendMessage({
            type: 'CAPTURE_SCREENSHOT',
            tabId: tab.id
        }, (response) => {
            if (response && response.success) {
                // Success animation
                const icon = screenshotCard.querySelector('.icon-large');
                icon.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    icon.style.transform = 'scale(1)';
                }, 300);
                
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

// Record tab with enhanced interactions
recordTabCard.addEventListener('click', async () => {
    if (!isRecording) {
        glassEffects.glow(recordTabCard, 'var(--vizual-purple)');
        const success = await startScreenRecording(true);
        if (!success) {
            console.error('Failed to start recording');
        }
    } else {
        stopRecording();
    }
});

// Record desktop with enhanced interactions
recordDesktopCard.addEventListener('click', async () => {
    if (!isRecording) {
        glassEffects.glow(recordDesktopCard, 'var(--vizual-purple)');
        const success = await startScreenRecording(false);
        if (!success) {
            console.error('Failed to start desktop recording');
        }
    } else {
        stopRecording();
    }
});

// Home button with glass effect
homeBtn.addEventListener('click', () => {
    glassEffects.glow(homeBtn);
    chrome.notifications.create({
        type: 'basic',
        title: 'Home',
        message: 'Already at home view'
    });
});

// Settings button with glass effect
settingsBtn.addEventListener('click', () => {
    glassEffects.glow(settingsBtn);
    chrome.runtime.openOptionsPage();
});

// Microphone button with enhanced glass effects
microphoneButton.addEventListener('click', () => {
    if (hasMicrophonePermission) {
        glassEffects.glow(microphoneButton, isMicrophoneMuted ? 'rgba(255, 59, 48, 0.5)' : 'rgba(52, 199, 89, 0.5)');
    }
    handleMicrophoneToggle();
});

// Permission button
permissionButton.addEventListener('click', handlePermissionClick);

// Help button
helpButton.addEventListener('click', (e) => {
    e.preventDefault();
    glassEffects.glow(helpButton);
    chrome.tabs.create({ url: 'https://browsertools.agentdesk.ai/' });
});

// Countdown overlay click handler
countdownOverlay.addEventListener('click', () => {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        countdownOverlay.classList.remove('active');
    }
});

// Start screen recording (reused from original with minor enhancements)
async function startScreenRecording(recordCurrentTab = false) {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (recordCurrentTab) {
            await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['recording-bar.js']
            });
            
            showCountdown(async () => {
                window.close();
                chrome.runtime.sendMessage({
                    type: 'START_TAB_RECORDING_FROM_POPUP',
                    tabId: activeTab.id,
                    description: ''
                });
            });
        } else {
            if (window.desktopRecordingInProgress) {
                return;
            }
            window.desktopRecordingInProgress = true;
            
            chrome.runtime.sendMessage({
                type: 'REQUEST_DESKTOP_CAPTURE',
                description: ''
            }, (response) => {
                window.desktopRecordingInProgress = false;
                
                if (chrome.runtime.lastError) {
                    showError('Desktop capture request failed: ' + chrome.runtime.lastError.message);
                    return;
                }
                
                if (response && response.success) {
                    isRecording = true;
                    recordingStartTime = Date.now();
                    
                    setTimeout(() => {
                        window.close();
                    }, 1000);
                } else {
                    showError(response?.error || 'Desktop recording was cancelled or failed');
                }
            });
        }
        
        return true;
    } catch (error) {
        console.error('Error starting screen recording:', error);
        showError('Failed to start recording: ' + error.message);
        return false;
    }
}

// Stop recording
function stopRecording() {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    stopRecordingUI();
}

// Show error with glass notification style
function showError(message) {
    chrome.notifications.create({
        type: 'basic',
        title: 'Error',
        message: message
    });
}

// Microphone permission handling (reused with UI enhancements)
async function checkMicrophonePermission() {
    try {
        const stored = await chrome.storage.local.get(['hasMicrophonePermission']);
        if (stored.hasMicrophonePermission) {
            hasMicrophonePermission = true;
            updatePermissionUI(true);
            return;
        }
        
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

async function handlePermissionClick() {
    if (hasMicrophonePermission) {
        return;
    }
    
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]) {
            throw new Error('No active tab found');
        }
        
        const currentTab = tabs[0];
        
        if (currentTab.url.startsWith('chrome://') || 
            currentTab.url.startsWith('chrome-extension://') ||
            currentTab.url.startsWith('edge://') ||
            currentTab.url.startsWith('about:')) {
            showPermissionInstructions();
            return;
        }
        
        const results = await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(track => track.stop());
                    return { success: true };
                } catch (error) {
                    return { success: false, error: error.name };
                }
            }
        });
        
        const result = results[0].result;
        if (result.success) {
            hasMicrophonePermission = true;
            isMicrophoneMuted = false;
            chrome.storage.local.set({ 
                hasMicrophonePermission: true,
                isMicrophoneMuted: false
            });
            updatePermissionUI(true);
            updateMicrophoneButton();
            updateCountdownSubtitle();
            
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

function showPermissionInstructions() {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.svg',
        title: 'Microphone Permission Required',
        message: 'Please navigate to a regular website (like google.com) and click "Grant permission" again to enable microphone access.'
    });
}

function showPermissionDeniedMessage() {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.svg',
        title: 'Microphone Permission Denied',
        message: 'Please allow microphone access in your browser settings or try again on a different website.'
    });
}

function updatePermissionUI(granted) {
    if (granted) {
        permissionButton.classList.add('granted');
        permissionText.textContent = 'Permission granted';
        permissionButton.querySelector('.permission-icon').textContent = '✅';
        microphoneButton.classList.add('enabled');
        microphoneButton.classList.remove('disabled');
    } else {
        permissionButton.classList.remove('granted');
        permissionText.textContent = 'Grant permission';
        permissionButton.querySelector('.permission-icon').textContent = '🔴';
        microphoneButton.classList.remove('enabled');
        microphoneButton.classList.add('disabled');
    }
}

function handleMicrophoneToggle() {
    if (!hasMicrophonePermission) {
        return;
    }
    
    isMicrophoneMuted = !isMicrophoneMuted;
    chrome.storage.local.set({ isMicrophoneMuted });
    updateMicrophoneButton();
    updateCountdownSubtitle();
    
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

function updateMicrophoneButton() {
    const micIcon = microphoneButton.querySelector('.mic-icon');
    if (isMicrophoneMuted) {
        microphoneButton.classList.add('muted');
        micIcon.textContent = '🔇';
    } else {
        microphoneButton.classList.remove('muted');
        micIcon.textContent = '🎤';
    }
}

function updateCountdownSubtitle() {
    if (countdownSubtitle) {
        if (isMicrophoneMuted) {
            countdownSubtitle.innerHTML = 'Your microphone is currently <span class="muted">muted</span>';
        } else {
            countdownSubtitle.innerHTML = 'Your microphone is currently <span style="color: #34c759;">enabled</span>';
        }
    }
}

// Add CSS for glass ripple effect
const style = document.createElement('style');
style.textContent = `
.glass-ripple {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
    transform: scale(0);
    animation: rippleExpand 0.6s ease-out;
    pointer-events: none;
    width: 100px;
    height: 100px;
    margin-left: -50px;
    margin-top: -50px;
}

@keyframes rippleExpand {
    to {
        transform: scale(4);
        opacity: 0;
    }
}
`;
document.head.appendChild(style);