// Content script for Browser Tools MCP
// This script runs on web pages to show recording UI and floating overlay

// State management
let isOverlayVisible = false;
let overlayContainer = null;

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'TOGGLE_OVERLAY') {
        toggleFloatingOverlay();
        sendResponse({ success: true });
    } else if (request.action === 'showRecordingBar') {
        // Create and show recording bar on the actual webpage
        createRecordingBar();
    } else if (request.action === 'hideRecordingBar') {
        // Remove recording bar from webpage
        removeRecordingBar();
    } else if (request.action === 'updateTimer') {
        // Update timer in recording bar
        updateRecordingTimer(request.time);
    }
});

// Floating overlay functions
function toggleFloatingOverlay() {
    if (isOverlayVisible) {
        hideOverlay();
    } else {
        showOverlay();
    }
}

function showOverlay() {
    if (overlayContainer) {
        return; // Already visible
    }
    
    // Create overlay container
    overlayContainer = document.createElement('div');
    overlayContainer.id = 'vizualai-floating-overlay';
    
    // Add overlay styles and content
    overlayContainer.innerHTML = createOverlayHTML();
    
    // Apply container styles
    overlayContainer.style.cssText = `
        position: fixed !important;
        top: 60px !important;
        right: 20px !important;
        z-index: 2147483647 !important;
        width: 420px !important;
        min-height: auto !important;
        pointer-events: auto !important;
        animation: overlaySlideIn 0.3s ease-out !important;
    `;
    
    // Inject CSS
    injectOverlayCSS();
    
    // Add to page
    document.body.appendChild(overlayContainer);
    
    // Set up event listeners
    setupOverlayEventListeners();
    
    // Initialize overlay functionality
    initializeOverlay();
    
    isOverlayVisible = true;
}

function hideOverlay() {
    if (overlayContainer) {
        overlayContainer.style.animation = 'overlaySlideOut 0.2s ease-in forwards';
        setTimeout(() => {
            if (overlayContainer) {
                overlayContainer.remove();
                overlayContainer = null;
            }
        }, 200);
    }
    isOverlayVisible = false;
}

function createOverlayHTML() {
    return `
        <div class="glass-bubble-container">
            <div class="liquid-glass-popup">
            <!-- Header Section -->
            <div class="glass-header">
                <div class="vizual-logo-glass">
                    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="32" viewBox="0 0 120 32">
                        <defs>
                            <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="#22D3EE"/>
                                <stop offset="100%" stop-color="#C084FC"/>
                            </linearGradient>
                        </defs>
                        <text x="0" y="24" 
                              font-family="system-ui, -apple-system, sans-serif" 
                              font-weight="700" 
                              font-size="24" 
                              fill="#0F172A">Vizual</text>
                        <text x="62" y="24" 
                              font-family="system-ui, -apple-system, sans-serif" 
                              font-weight="700" 
                              font-size="24" 
                              fill="url(#aiGradient)">AI</text>
                    </svg>
                </div>
                <div class="header-actions">
                    <button class="glass-icon-btn" id="overlay-close-btn" title="Close" aria-label="Close overlay">
                        <span class="icon">✕</span>
                    </button>
                </div>
            </div>

            <!-- Connection Status - Hidden by default -->
            <div class="glass-connection-status" id="overlay-connection-status" role="status" aria-live="polite" style="display: none;">
                <div class="status-glass-badge" id="overlay-status-badge">
                    <span class="status-dot"></span>
                    <span id="overlay-connection-text">Checking connection...</span>
                </div>
            </div>

            <!-- Recording Status - Hidden by default -->
            <div class="glass-recording-status" id="overlay-recording-status" role="status" aria-live="polite" style="display: none;">
                <div class="status-glass-badge recording">
                    <span class="recording-dot"></span>
                    <span>Recording</span>
                    <span class="timer" id="overlay-timer">00:00</span>
                </div>
            </div>

            <!-- Main Action Cards -->
            <div class="glass-content">
                <!-- Screenshot Card -->
                <div class="glass-action-card screenshot-card" id="overlay-screenshot-card" role="button" tabindex="0" aria-label="Capture screenshot of current tab">
                    <div class="card-icon">
                        <span class="icon-large">📸</span>
                        <div class="icon-glow"></div>
                    </div>
                    <div class="card-content">
                        <h3 class="card-title">Capture Screenshot</h3>
                        <p class="card-description">Take a snapshot of the current tab</p>
                    </div>
                    <div class="card-arrow">→</div>
                </div>

                <!-- Recording Cards Container -->
                <div class="glass-recording-container">
                    <!-- Record Tab Card -->
                    <div class="glass-action-card recording-card" id="overlay-record-tab-card" role="button" tabindex="0" aria-label="Record current browser tab">
                        <div class="card-icon">
                            <span class="icon-large">📱</span>
                            <div class="icon-glow"></div>
                        </div>
                        <div class="card-content">
                            <h3 class="card-title">Record Tab</h3>
                            <p class="card-description">Capture this tab</p>
                        </div>
                    </div>

                    <!-- Record Desktop Card -->
                    <div class="glass-action-card recording-card" id="overlay-record-desktop-card" role="button" tabindex="0" aria-label="Record entire desktop screen">
                        <div class="card-icon">
                            <span class="icon-large">🖥</span>
                            <div class="icon-glow"></div>
                        </div>
                        <div class="card-content">
                            <h3 class="card-title">Record Desktop</h3>
                            <p class="card-description">Capture full screen</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Essential Controls -->
            <div class="glass-essential-controls">
                <button class="glass-microphone-btn" id="overlay-microphone-button" title="Toggle microphone" aria-label="Toggle microphone on or off" aria-pressed="false">
                    <span class="mic-icon">🎤</span>
                </button>
                <button class="glass-permission-btn" id="overlay-permission-button">
                    <span class="permission-icon" id="overlay-permission-icon">🔴</span>
                    <span id="overlay-permission-text">Allow Microphone Access</span>
                </button>
            </div>

        </div>


        </div>
    </div>
    `;
}

function injectOverlayCSS() {
    // Check if CSS is already injected
    if (document.getElementById('vizualai-overlay-styles')) {
        return;
    }
    
    // Get CSS from the extension
    const cssUrl = chrome.runtime.getURL('popup-redesign.css');
    
    // Create style element
    const styleElement = document.createElement('style');
    styleElement.id = 'vizualai-overlay-styles';
    
    // Create completely isolated CSS instead of fetching external CSS
    const isolatedCSS = `
        /* Isolated overlay container */
        #vizualai-floating-overlay {
            all: initial !important;
            position: fixed !important;
            z-index: 2147483647 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif !important;
            contain: layout style paint !important;
            isolation: isolate !important;
        }
        
        /* Reset all child elements */
        #vizualai-floating-overlay * {
            all: unset !important;
            box-sizing: border-box !important;
            font-family: inherit !important;
        }
        
        /* Glass Bubble Container */
        #vizualai-floating-overlay .glass-bubble-container {
            background: rgba(255, 255, 255, 0.05) !important;
            backdrop-filter: blur(25px) saturate(200%) !important;
            -webkit-backdrop-filter: blur(25px) saturate(200%) !important;
            border: 1px solid rgba(255, 255, 255, 0.25) !important;
            border-radius: 32px !important;
            padding: 24px !important;
            box-shadow: 
                0 16px 64px rgba(0, 0, 0, 0.15),
                0 4px 32px rgba(0, 0, 0, 0.1),
                inset 0 2px 0 rgba(255, 255, 255, 0.15) !important;
            position: relative !important;
        }
        
        /* Bubble glow effect */
        #vizualai-floating-overlay .glass-bubble-container::before {
            content: "" !important;
            position: absolute !important;
            inset: -2px !important;
            background: linear-gradient(
                135deg,
                rgba(34, 211, 238, 0.2) 0%,
                rgba(192, 132, 252, 0.2) 50%,
                rgba(34, 211, 238, 0.2) 100%
            ) !important;
            border-radius: 34px !important;
            z-index: -1 !important;
            opacity: 0.6 !important;
            filter: blur(8px) !important;
        }
        
        /* Main container */
        #vizualai-floating-overlay .liquid-glass-popup {
            display: flex !important;
            flex-direction: column !important;
            width: 420px !important;
            min-height: auto !important;
            gap: 16px !important;
            padding: 20px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif !important;
            color: rgba(0, 0, 0, 0.9) !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
        }
        
        /* Glass Header */
        #vizualai-floating-overlay .glass-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            background: rgba(255, 255, 255, 0.08) !important;
            backdrop-filter: blur(20px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-radius: 20px !important;
            padding: 16px 20px !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
        }
        
        #vizualai-floating-overlay .header-actions {
            display: flex !important;
            gap: 8px !important;
        }
        
        #vizualai-floating-overlay .glass-icon-btn {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 32px !important;
            height: 32px !important;
            border: none !important;
            background: transparent !important;
            border-radius: 6px !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
            color: rgba(0, 0, 0, 0.8) !important;
            font-size: 16px !important;
        }
        
        #vizualai-floating-overlay .glass-icon-btn:hover {
            background: rgba(0, 0, 0, 0.1) !important;
            color: rgba(0, 0, 0, 1) !important;
        }
        
        /* Connection and Recording Status (hidden by default) */
        #vizualai-floating-overlay .glass-connection-status,
        #vizualai-floating-overlay .glass-recording-status {
            display: none !important;
            justify-content: center !important;
            margin: -8px 0 !important;
        }
        
        #vizualai-floating-overlay .glass-connection-status.visible,
        #vizualai-floating-overlay .glass-recording-status.active {
            display: flex !important;
        }
        
        #vizualai-floating-overlay .status-glass-badge {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            padding: 6px 12px !important;
            background: rgba(255, 255, 255, 0.1) !important;
            backdrop-filter: blur(10px) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-radius: 12px !important;
            font-size: 12px !important;
            color: rgba(0, 0, 0, 0.8) !important;
        }
        
        /* Glass Content */
        #vizualai-floating-overlay .glass-content {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
        }
        
        /* Action Cards */
        #vizualai-floating-overlay .glass-action-card {
            display: flex !important;
            align-items: center !important;
            gap: 16px !important;
            background: rgba(255, 255, 255, 0.08) !important;
            backdrop-filter: blur(16px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(16px) saturate(160%) !important;
            border: 1px solid rgba(255, 255, 255, 0.18) !important;
            border-radius: 20px !important;
            padding: 20px !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            position: relative !important;
            overflow: hidden !important;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
        }
        
        #vizualai-floating-overlay .glass-action-card:hover {
            background: rgba(255, 255, 255, 0.12) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
        }
        
        #vizualai-floating-overlay .card-icon {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 56px !important;
            height: 56px !important;
            flex-shrink: 0 !important;
        }
        
        #vizualai-floating-overlay .icon-large {
            font-size: 32px !important;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2)) !important;
        }
        
        #vizualai-floating-overlay .card-content {
            flex: 1 !important;
        }
        
        #vizualai-floating-overlay .card-title {
            font-size: 18px !important;
            font-weight: 600 !important;
            color: rgba(0, 0, 0, 0.95) !important;
            margin-bottom: 4px !important;
            letter-spacing: -0.02em !important;
        }
        
        #vizualai-floating-overlay .card-description {
            font-size: 14px !important;
            color: rgba(0, 0, 0, 0.6) !important;
            font-weight: 400 !important;
        }
        
        #vizualai-floating-overlay .card-arrow {
            font-size: 20px !important;
            color: rgba(0, 0, 0, 0.4) !important;
            transition: all 0.2s ease !important;
        }
        
        #vizualai-floating-overlay .glass-action-card:hover .card-arrow {
            color: rgba(0, 0, 0, 0.6) !important;
            transform: translateX(4px) !important;
        }
        
        /* Recording Container */
        #vizualai-floating-overlay .glass-recording-container {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
        }
        
        #vizualai-floating-overlay .recording-card {
            padding: 16px !important;
        }
        
        #vizualai-floating-overlay .recording-card .card-icon {
            width: 48px !important;
            height: 48px !important;
        }
        
        #vizualai-floating-overlay .recording-card .icon-large {
            font-size: 28px !important;
        }
        
        #vizualai-floating-overlay .recording-card .card-title {
            font-size: 16px !important;
        }
        
        #vizualai-floating-overlay .recording-card .card-description {
            font-size: 13px !important;
        }
        
        /* Essential Controls */
        #vizualai-floating-overlay .glass-essential-controls {
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            justify-content: center !important;
            padding: 12px 0 !important;
        }
        
        #vizualai-floating-overlay .glass-microphone-btn {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 40px !important;
            height: 40px !important;
            border: none !important;
            background: rgba(255, 255, 255, 0.08) !important;
            backdrop-filter: blur(10px) saturate(140%) !important;
            -webkit-backdrop-filter: blur(10px) saturate(140%) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-radius: 12px !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
            font-size: 20px !important;
        }
        
        #vizualai-floating-overlay .glass-microphone-btn:hover {
            background: rgba(255, 255, 255, 0.12) !important;
            border-color: rgba(255, 255, 255, 0.3) !important;
            transform: scale(1.05) !important;
        }
        
        #vizualai-floating-overlay .glass-microphone-btn.muted {
            background: rgba(255, 59, 48, 0.1) !important;
            border-color: rgba(255, 59, 48, 0.3) !important;
        }
        
        #vizualai-floating-overlay .glass-permission-btn {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            padding: 8px 16px !important;
            background: rgba(255, 59, 48, 0.1) !important;
            backdrop-filter: blur(10px) saturate(140%) !important;
            -webkit-backdrop-filter: blur(10px) saturate(140%) !important;
            border: 1px solid rgba(255, 59, 48, 0.3) !important;
            border-radius: 12px !important;
            color: #ff3b30 !important;
            font-weight: 500 !important;
            font-size: 14px !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
        }
        
        #vizualai-floating-overlay .glass-permission-btn:hover {
            background: rgba(255, 59, 48, 0.15) !important;
            border-color: rgba(255, 59, 48, 0.4) !important;
            transform: scale(1.02) !important;
        }
        
        #vizualai-floating-overlay .glass-permission-btn.granted {
            background: rgba(52, 199, 89, 0.1) !important;
            border-color: rgba(52, 199, 89, 0.3) !important;
            color: #34c759 !important;
        }
        
        #vizualai-floating-overlay .glass-permission-btn.granted:hover {
            background: rgba(52, 199, 89, 0.15) !important;
            border-color: rgba(52, 199, 89, 0.4) !important;
        }
        
        /* SVG Logo styling */
        #vizualai-floating-overlay .vizual-logo-glass svg {
            display: block !important;
        }
        
        #vizualai-floating-overlay .vizual-logo-glass svg text {
            font-family: system-ui, -apple-system, sans-serif !important;
            font-weight: 700 !important;
            font-size: 24px !important;
        }
        
        /* Fix logo colors - Vizual should be black, AI should be gradient */
        #vizualai-floating-overlay .vizual-logo-glass svg text {
            color: initial !important;
        }
        
        #vizualai-floating-overlay .vizual-logo-glass svg text[fill="#0F172A"] {
            fill: #0F172A !important;
        }
        
        #vizualai-floating-overlay .vizual-logo-glass svg text[fill="url(#aiGradient)"] {
            fill: url(#aiGradient) !important;
        }
        
        /* Ensure gradient definition works */
        #vizualai-floating-overlay .vizual-logo-glass svg defs linearGradient {
            display: block !important;
        }
        
        #vizualai-floating-overlay .vizual-logo-glass svg defs linearGradient stop:first-child {
            stop-color: #22D3EE !important;
        }
        
        #vizualai-floating-overlay .vizual-logo-glass svg defs linearGradient stop:last-child {
            stop-color: #C084FC !important;
        }
        
        /* Animations */
        @keyframes overlaySlideIn {
            0% {
                opacity: 0;
                transform: translateX(100%) scale(0.95);
            }
            100% {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
        }
        
        @keyframes overlaySlideOut {
            0% {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateX(100%) scale(0.95);
            }
        }
    `;
    
    styleElement.textContent = isolatedCSS;
    document.head.appendChild(styleElement);
}

function setupOverlayEventListeners() {
    // Close button
    const closeBtn = overlayContainer.querySelector('#overlay-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideOverlay);
    }
    
    // Screenshot functionality
    const screenshotCard = overlayContainer.querySelector('#overlay-screenshot-card');
    if (screenshotCard) {
        screenshotCard.addEventListener('click', handleScreenshot);
    }
    
    // Recording functionality
    const recordTabCard = overlayContainer.querySelector('#overlay-record-tab-card');
    if (recordTabCard) {
        recordTabCard.addEventListener('click', handleTabRecording);
    }
    
    const recordDesktopCard = overlayContainer.querySelector('#overlay-record-desktop-card');
    if (recordDesktopCard) {
        recordDesktopCard.addEventListener('click', handleDesktopRecording);
    }
    
    // Microphone button
    const microphoneBtn = overlayContainer.querySelector('#overlay-microphone-button');
    if (microphoneBtn) {
        microphoneBtn.addEventListener('click', handleMicrophoneToggle);
    }
    
    // Permission button
    const permissionBtn = overlayContainer.querySelector('#overlay-permission-button');
    if (permissionBtn) {
        permissionBtn.addEventListener('click', handlePermissionRequest);
    }

}

function initializeOverlay() {
    // Check connection status
    checkConnectionStatus();
    
    // Initialize microphone as muted by default
    const microphoneBtn = overlayContainer.querySelector('#overlay-microphone-button');
    if (microphoneBtn) {
        microphoneBtn.classList.add('muted');
        microphoneBtn.setAttribute('aria-pressed', 'true');
        microphoneBtn.title = 'Unmute microphone';
    }
    
    // Check permission status on initialization
    checkPermissionStatus();
    
    // Initialize other overlay functionality as needed
}

// Event handlers
function handleScreenshot() {
    getCurrentTabId().then(tabId => {
        chrome.runtime.sendMessage({
            type: 'CAPTURE_SCREENSHOT',
            tabId: tabId
        }, (response) => {
            if (response && response.success) {
                showNotification('Screenshot captured successfully!', 'success');
            } else {
                showNotification('Failed to capture screenshot', 'error');
            }
        });
    });
}

function handleTabRecording() {
    getCurrentTabId().then(tabId => {
        // Check if microphone is enabled and we have permission
        const microphoneBtn = overlayContainer.querySelector('#overlay-microphone-button');
        const permissionBtn = overlayContainer.querySelector('#overlay-permission-button');
        const includeMicrophone = microphoneBtn && !microphoneBtn.classList.contains('muted') && 
                                permissionBtn && permissionBtn.classList.contains('granted');
        
        chrome.runtime.sendMessage({
            type: 'START_TAB_RECORDING_FROM_POPUP',
            tabId: tabId,
            description: 'Tab recording started from overlay',
            includeMicrophone: includeMicrophone
        }, (response) => {
            if (response && response.success) {
                showNotification('Tab recording started!', 'success');
                hideOverlay(); // Hide overlay when recording starts
            } else {
                showNotification('Failed to start tab recording', 'error');
            }
        });
    });
}

function handleDesktopRecording() {
    // Check if microphone is enabled and we have permission
    const microphoneBtn = overlayContainer.querySelector('#overlay-microphone-button');
    const permissionBtn = overlayContainer.querySelector('#overlay-permission-button');
    const includeMicrophone = microphoneBtn && !microphoneBtn.classList.contains('muted') && 
                            permissionBtn && permissionBtn.classList.contains('granted');
    
    chrome.runtime.sendMessage({
        type: 'REQUEST_DESKTOP_CAPTURE',
        description: 'Desktop recording started from overlay',
        includeMicrophone: includeMicrophone
    }, (response) => {
        if (response && response.success) {
            showNotification('Desktop recording started!', 'success');
            hideOverlay(); // Hide overlay when recording starts
        } else {
            showNotification('Failed to start desktop recording', 'error');
        }
    });
}

function handleMicrophoneToggle() {
    const microphoneBtn = overlayContainer.querySelector('#overlay-microphone-button');
    const permissionBtn = overlayContainer.querySelector('#overlay-permission-button');
    
    if (!microphoneBtn) return;
    
    const isMuted = microphoneBtn.classList.contains('muted');
    const hasPermission = permissionBtn && permissionBtn.classList.contains('granted');
    
    if (isMuted) {
        // Check if we have permission before unmuting
        if (!hasPermission) {
            showNotification('Please allow microphone access first', 'error');
            return;
        }
        
        // Unmute
        microphoneBtn.classList.remove('muted');
        microphoneBtn.setAttribute('aria-pressed', 'false');
        microphoneBtn.title = 'Mute microphone';
        showNotification('Microphone enabled', 'success');
    } else {
        // Mute
        microphoneBtn.classList.add('muted');
        microphoneBtn.setAttribute('aria-pressed', 'true');
        microphoneBtn.title = 'Unmute microphone';
        showNotification('Microphone muted', 'info');
    }
}

function handlePermissionRequest() {
    const permissionBtn = overlayContainer.querySelector('#overlay-permission-button');
    const permissionText = overlayContainer.querySelector('#overlay-permission-text');
    const permissionIcon = overlayContainer.querySelector('#overlay-permission-icon');
    
    if (!permissionBtn || !permissionText) return;
    
    // Request microphone permission
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
            // Permission granted
            permissionBtn.classList.add('granted');
            permissionText.textContent = 'Microphone Allowed';
            if (permissionIcon) {
                permissionIcon.textContent = '✅'; // Change to green checkmark
            }
            showNotification('Microphone access granted!', 'success');
            
            // Enable the microphone button since we now have permission
            const microphoneBtn = overlayContainer.querySelector('#overlay-microphone-button');
            if (microphoneBtn && microphoneBtn.classList.contains('muted')) {
                microphoneBtn.classList.remove('muted');
                microphoneBtn.setAttribute('aria-pressed', 'false');
                microphoneBtn.title = 'Mute microphone';
            }
        })
        .catch((error) => {
            console.error('Microphone permission denied:', error);
            showNotification('Microphone access denied. Please allow microphone access for recording.', 'error');
        });
}

function getCurrentTabId() {
    // This will be provided by the background script or we can get it from messaging
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_CURRENT_TAB_ID' }, (response) => {
            resolve(response.tabId);
        });
    });
}

function checkConnectionStatus() {
    // Check connection status with the server (status is hidden by default)
    // Only show connection status when actually needed for debugging or connection issues
    const statusContainer = overlayContainer.querySelector('#overlay-connection-status');
    const statusElement = overlayContainer.querySelector('#overlay-connection-text');
    
    // Keep status hidden for clean interface
    // Could be shown later if needed: statusContainer.style.display = 'flex';
}

function checkPermissionStatus() {
    // Check microphone permission status without triggering a permission prompt
    const permissionBtn = overlayContainer.querySelector('#overlay-permission-button');
    const permissionText = overlayContainer.querySelector('#overlay-permission-text');
    const permissionIcon = overlayContainer.querySelector('#overlay-permission-icon');
    
    if (!permissionBtn || !permissionText) return;
    
    // Use Permissions API if available to check status without prompting
    if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'microphone' })
            .then((result) => {
                if (result.state === 'granted') {
                    // Already have permission
                    permissionBtn.classList.add('granted');
                    permissionText.textContent = 'Microphone Allowed';
                    if (permissionIcon) {
                        permissionIcon.textContent = '✅'; // Change to green checkmark
                    }
                    
                    // Enable microphone button since we have permission
                    const microphoneBtn = overlayContainer.querySelector('#overlay-microphone-button');
                    if (microphoneBtn && microphoneBtn.classList.contains('muted')) {
                        microphoneBtn.classList.remove('muted');
                        microphoneBtn.setAttribute('aria-pressed', 'false');
                        microphoneBtn.title = 'Mute microphone';
                    }
                } else {
                    // Don't have permission yet
                    permissionText.textContent = 'Allow Microphone Access';
                    permissionBtn.classList.remove('granted');
                    if (permissionIcon) {
                        permissionIcon.textContent = '🔴'; // Keep red dot
                    }
                }
            })
            .catch(() => {
                // Fallback: assume we need permission
                permissionText.textContent = 'Allow Microphone Access';
                permissionBtn.classList.remove('granted');
                if (permissionIcon) {
                    permissionIcon.textContent = '🔴'; // Keep red dot
                }
            });
    } else {
        // Fallback for browsers without Permissions API
        permissionText.textContent = 'Allow Microphone Access';
        permissionBtn.classList.remove('granted');
        if (permissionIcon) {
            permissionIcon.textContent = '🔴'; // Keep red dot
        }
    }
}

function showNotification(message, type = 'info') {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        padding: 12px 16px !important;
        background: rgba(0, 0, 0, 0.8) !important;
        color: white !important;
        border-radius: 8px !important;
        z-index: 2147483648 !important;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
        font-size: 14px !important;
        backdrop-filter: blur(10px) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function createRecordingBar() {
    // Check if recording bar already exists
    if (document.getElementById('browser-tools-recording-bar')) {
        return;
    }

    // Create recording bar HTML
    const recordingBar = document.createElement('div');
    recordingBar.id = 'browser-tools-recording-bar';
    recordingBar.innerHTML = `
        <style>
            #browser-tools-recording-bar {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                height: 48px;
                background: #2b2b2b;
                display: flex;
                align-items: center;
                padding: 8px 16px;
                border-radius: 24px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                min-width: 280px;
                max-width: 320px;
            }
            
            #browser-tools-recording-bar .recording-indicator {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
            }
            
            #browser-tools-recording-bar .recording-dot {
                width: 14px;
                height: 14px;
                background: #ff3b30;
                border-radius: 50%;
                animation: recording-pulse 1.5s infinite;
                flex-shrink: 0;
            }
            
            @keyframes recording-pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
            
            #browser-tools-recording-bar .recording-text {
                color: white;
                font-size: 14px;
                font-weight: 500;
            }
            
            #browser-tools-recording-bar .recording-timer {
                color: white;
                font-size: 14px;
                font-weight: 600;
                font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
                margin-left: 4px;
            }
            
            #browser-tools-recording-bar .control-buttons {
                display: flex;
                gap: 4px;
                align-items: center;
            }
            
            #browser-tools-recording-bar .control-btn {
                width: 32px;
                height: 32px;
                border: none;
                background: transparent;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.15s ease;
                color: rgba(255, 255, 255, 0.8);
                font-size: 16px;
                padding: 0;
            }
            
            #browser-tools-recording-bar .control-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }
            
            #browser-tools-recording-bar .control-btn svg {
                width: 20px;
                height: 20px;
                fill: currentColor;
            }
        </style>
        <div class="recording-indicator">
            <div class="recording-dot"></div>
            <div class="recording-text">Recording in</div>
            <div class="recording-timer" id="browser-tools-timer">1</div>
        </div>
        <div class="control-buttons">
            <button class="control-btn" id="browser-tools-pause" title="Pause">
                <svg viewBox="0 0 24 24">
                    <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                    <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
                </svg>
            </button>
            <button class="control-btn" id="browser-tools-mute" title="Mute">
                <svg viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
                </svg>
            </button>
            <button class="control-btn" id="browser-tools-stop" title="Stop">
                <svg viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
                </svg>
            </button>
        </div>
    `;

    document.body.appendChild(recordingBar);

    // Add event listeners
    document.getElementById('browser-tools-stop').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'stopRecording' });
    });

    document.getElementById('browser-tools-pause').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'togglePause' });
    });

    document.getElementById('browser-tools-mute').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'toggleMute' });
    });
}

function removeRecordingBar() {
    const recordingBar = document.getElementById('browser-tools-recording-bar');
    if (recordingBar) {
        recordingBar.remove();
    }
}

function updateRecordingTimer(time) {
    const timer = document.getElementById('browser-tools-timer');
    if (timer) {
        timer.textContent = time;
    }
}