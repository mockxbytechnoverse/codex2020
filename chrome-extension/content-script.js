// Content script for Browser Tools MCP
// This script runs on web pages to show recording UI and floating overlay

// Inject browser logs capture script immediately - before DOM content loads
(function injectLogsCapture() {
    try {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('browser-logs-capture.js');
        script.onload = function() {
            console.log('VizualAI: Browser logs capture script injected successfully');
            this.remove();
        };
        script.onerror = function() {
            console.error('VizualAI: Failed to load browser logs capture script');
        };
        (document.head || document.documentElement).appendChild(script);
        console.log('VizualAI: Injecting browser logs capture script...');
    } catch (error) {
        console.error('VizualAI: Error injecting browser logs capture script:', error);
    }
})();

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
                    <button class="glass-icon-btn" id="overlay-back-btn" title="Back" aria-label="Back" style="display:none;">
                        <span class="icon">⟵</span>
                    </button>
                    <button class="glass-icon-btn" id="overlay-close-btn" title="Close" aria-label="Close overlay">
                        <span class="icon">✕</span>
                    </button>
                    <button class="glass-icon-btn" id="overlay-open-agent-btn" title="Open Viz Agent" aria-label="Open Viz Agent">
                        <span class="icon">⚙︎</span>
                    </button>
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
                    
                    <!-- Run Agent Card -->
                    <div class="glass-action-card recording-card" id="overlay-run-agent-card" role="button" tabindex="0" aria-label="Open Viz agent to run coding changes">
                        <div class="card-icon">
                            <span class="icon-large">🤖</span>
                            <div class="icon-glow"></div>
                        </div>
                        <div class="card-content">
                            <h3 class="card-title">Run Agent</h3>
                            <p class="card-description">Open agent to analyze and apply changes</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Viz Agent View (hidden by default) -->
            <div class="viz-agent-view" id="viz-agent-view">
                <div class="agent-header-row">
                    <h3 class="agent-title">Viz Agent</h3>
                    <button class="glass-icon-btn" id="viz-agent-back-btn" title="Back" aria-label="Back to main overlay">⟵</button>
                </div>
                <div class="agent-row">
                    <label class="agent-label">Workdir</label>
                    <input type="text" id="viz-workdir" class="agent-input" placeholder="/absolute/path/to/your/project" />
                </div>
                <div class="agent-row">
                    <label class="agent-label">Description (optional)</label>
                    <textarea id="viz-description" class="agent-textarea" placeholder="Briefly describe the change"></textarea>
                </div>
                <div class="agent-row">
                    <label class="agent-label">Runner</label>
                    <select id="viz-runner" class="agent-select">
                        <option value="claude" selected>claude</option>
                        <option value="codex">codex</option>
                    </select>
                </div>
                <div class="agent-row">
                    <button id="viz-record-run-btn" class="agent-primary-btn">Record and Run</button>
                </div>
                <div class="agent-row">
                    <label class="agent-label">Status</label>
                    <div id="viz-status" class="agent-status"></div>
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

            <!-- Connection Status - Moved to bottom -->
            <div class="glass-connection-status" id="overlay-connection-status" role="status" aria-live="polite" style="display: none;">
                <div class="status-glass-badge" id="overlay-status-badge">
                    <span class="status-dot"></span>
                    <span id="overlay-connection-text">Checking connection...</span>
                </div>
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
            /* NEW: Enhanced gradient with better color distribution */
            background: linear-gradient(
                135deg,
                rgba(34, 211, 238, 0.15) 0%,
                rgba(255, 255, 255, 0.06) 30%,
                rgba(255, 255, 255, 0.08) 50%,
                rgba(255, 255, 255, 0.06) 70%,
                rgba(192, 132, 252, 0.15) 100%
            ) !important;
            backdrop-filter: blur(25px) saturate(200%) !important;
            -webkit-backdrop-filter: blur(25px) saturate(200%) !important;
            border: 1px solid rgba(255, 255, 255, 0.25) !important;
            border-radius: 24px !important;
            box-shadow: 
                0 16px 64px rgba(0, 0, 0, 0.15),
                0 4px 32px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
        }
        
        /* Reset most child elements, but DO NOT reset native form controls */
        #vizualai-floating-overlay :not(input):not(textarea):not(select):not(button) {
            all: unset !important;
            box-sizing: border-box !important;
            font-family: inherit !important;
        }
        
        /* Glass Bubble Container - Enhanced spacing */
        #vizualai-floating-overlay .glass-bubble-container {
            /* Remove all background/border styling - moved to main container */
            padding: 40px !important;
            position: relative !important;
        }
        
        /* Bubble glow effect - COMPLETELY REMOVED for troubleshooting */
        #vizualai-floating-overlay .glass-bubble-container::before {
            content: "" !important;
            position: absolute !important;
            inset: -2px !important;
            /* background: REMOVED */
            border-radius: 34px !important;
            z-index: -1 !important;
            opacity: 0 !important;
            /* filter: REMOVED */
        }
        
        /* Main container */
        #vizualai-floating-overlay .liquid-glass-popup {
            display: flex !important;
            flex-direction: column !important;
            width: 420px !important;
            min-height: auto !important;
            gap: 24px !important;
            padding: 0 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif !important;
            color: rgba(0, 0, 0, 0.9) !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
        }
        
        /* Glass Header - Enhanced with more spacing */
        #vizualai-floating-overlay .glass-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            background: rgba(255, 255, 255, 0.12) !important;
            backdrop-filter: blur(20px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
            border: 1px solid rgba(255, 255, 255, 0.25) !important;
            border-radius: 20px !important;
            padding: 20px 24px !important;
            margin: 0 8px !important;
            box-shadow: 
                0 8px 32px rgba(0, 0, 0, 0.15), 
                inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
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
            margin: 8px 0 0 0 !important; /* Moved to bottom, add top margin */
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
        
        #vizualai-floating-overlay .status-glass-badge.connected {
            background: rgba(52, 199, 89, 0.15) !important;
            border-color: rgba(52, 199, 89, 0.3) !important;
            color: #34c759 !important;
        }
        
        #vizualai-floating-overlay .status-glass-badge.connected .status-dot::before {
            content: '🟢' !important;
        }
        
        #vizualai-floating-overlay .status-glass-badge.disconnected {
            background: rgba(255, 59, 48, 0.15) !important;
            border-color: rgba(255, 59, 48, 0.3) !important;
            color: #ff3b30 !important;
        }
        
        #vizualai-floating-overlay .status-glass-badge.disconnected .status-dot::before {
            content: '🔴' !important;
        }
        
        #vizualai-floating-overlay .status-glass-badge.checking {
            background: rgba(255, 204, 0, 0.15) !important;
            border-color: rgba(255, 204, 0, 0.3) !important;
            color: #ffcc00 !important;
        }
        
        #vizualai-floating-overlay .status-glass-badge.checking .status-dot::before {
            content: '🟡' !important;
        }
        
        #vizualai-floating-overlay .glass-connect-btn {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 4px 12px !important;
            margin-left: 8px !important;
            background: rgba(0, 122, 255, 0.15) !important;
            backdrop-filter: blur(10px) !important;
            border: 1px solid rgba(0, 122, 255, 0.3) !important;
            border-radius: 8px !important;
            color: #007aff !important;
            font-size: 11px !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
        }
        
        #vizualai-floating-overlay .glass-connect-btn:hover {
            background: rgba(0, 122, 255, 0.25) !important;
            border-color: rgba(0, 122, 255, 0.4) !important;
            transform: scale(1.05) !important;
        }
        
        #vizualai-floating-overlay .glass-connect-btn:disabled {
            opacity: 0.6 !important;
            cursor: not-allowed !important;
            transform: none !important;
        }
        
        /* Glass Content */
        #vizualai-floating-overlay .glass-content {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
        }
        
        /* Action Cards - Enhanced with spacing and better glass effect */
        #vizualai-floating-overlay .glass-action-card {
            display: flex !important;
            align-items: center !important;
            gap: 16px !important;
            background: rgba(255, 255, 255, 0.12) !important;
            backdrop-filter: blur(16px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(16px) saturate(160%) !important;
            border: 1px solid rgba(255, 255, 255, 0.22) !important;
            border-radius: 20px !important;
            padding: 20px !important;
            margin: 0 8px !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            position: relative !important;
            overflow: hidden !important;
            box-shadow: 
                0 6px 28px rgba(0, 0, 0, 0.12), 
                inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
        }
        
        #vizualai-floating-overlay .glass-action-card:hover {
            background: rgba(255, 255, 255, 0.18) !important;
            border-color: rgba(255, 255, 255, 0.35) !important;
            transform: translateY(-2px) !important;
            box-shadow: 
                0 10px 40px rgba(0, 0, 0, 0.18), 
                inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
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
            gap: 16px !important;
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
        
        /* Essential Controls - Enhanced spacing */
        #vizualai-floating-overlay .glass-essential-controls {
            display: flex !important;
            align-items: center !important;
            gap: 16px !important;
            justify-content: center !important;
            padding: 16px 8px !important;
            margin-top: 8px !important;
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
        
        /* SVG Logo styling - GRADIENT RESTORED */
        #vizualai-floating-overlay .vizual-logo-glass svg {
            display: block !important;
        }
        
        #vizualai-floating-overlay .vizual-logo-glass svg text {
            font-family: system-ui, -apple-system, sans-serif !important;
            font-weight: 700 !important;
            font-size: 24px !important;
        }
        
        #vizualai-floating-overlay .vizual-logo-glass svg text[fill="#0F172A"] {
            fill: #0F172A !important;
        }
        
        #vizualai-floating-overlay .vizual-logo-glass svg text[fill="url(#aiGradient)"] {
            fill: url(#aiGradient) !important;
        }
        
        #vizualai-floating-overlay .vizual-logo-glass svg defs linearGradient {
            display: block !important;
        }
        
        #vizualai-floating-overlay .vizual-logo-glass svg defs linearGradient stop:first-child {
            stop-color: #22D3EE !important;
        }
        
        #vizualai-floating-overlay .vizual-logo-glass svg defs linearGradient stop:last-child {
            stop-color: #C084FC !important;
        }
        
        /* Server Settings Modal Styles */
        .server-settings-overlay {
            all: initial !important;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
        
        .server-settings-modal {
            background: rgba(255, 255, 255, 0.95) !important;
            backdrop-filter: blur(20px) !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            border-radius: 16px !important;
            padding: 24px !important;
            max-width: 400px !important;
            width: 90% !important;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
        }
        
        .server-settings-modal h3 {
            margin: 0 0 16px 0 !important;
            font-size: 18px !important;
            font-weight: 600 !important;
            color: #000 !important;
        }
        
        .server-settings-modal p {
            margin: 0 0 12px 0 !important;
            font-size: 14px !important;
            color: rgba(0, 0, 0, 0.7) !important;
        }
        
        .server-settings-modal ol {
            margin: 0 0 20px 0 !important;
            padding-left: 20px !important;
            font-size: 13px !important;
            color: rgba(0, 0, 0, 0.6) !important;
        }
        
        .server-inputs {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            margin-bottom: 20px !important;
        }
        
        .server-inputs label {
            display: flex !important;
            flex-direction: column !important;
            gap: 4px !important;
            font-size: 12px !important;
            font-weight: 500 !important;
            color: rgba(0, 0, 0, 0.8) !important;
        }
        
        .server-inputs input {
            padding: 8px 12px !important;
            border: 1px solid rgba(0, 0, 0, 0.2) !important;
            border-radius: 6px !important;
            background: rgba(255, 255, 255, 0.8) !important;
            font-size: 14px !important;
            color: #000 !important;
        }
        
        .settings-actions {
            display: flex !important;
            gap: 8px !important;
            justify-content: flex-end !important;
        }
        
        .settings-actions button {
            padding: 8px 16px !important;
            border: none !important;
            border-radius: 6px !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
        }
        
        .settings-actions #test-connection-btn {
            background: rgba(0, 122, 255, 0.1) !important;
            color: #007aff !important;
            border: 1px solid rgba(0, 122, 255, 0.3) !important;
        }
        
        .settings-actions #save-settings-btn {
            background: rgba(52, 199, 89, 0.1) !important;
            color: #34c759 !important;
            border: 1px solid rgba(52, 199, 89, 0.3) !important;
        }
        
        .settings-actions #close-settings-btn {
            background: rgba(0, 0, 0, 0.05) !important;
            color: rgba(0, 0, 0, 0.7) !important;
            border: 1px solid rgba(0, 0, 0, 0.2) !important;
        }
        
        .settings-actions button:hover {
            transform: scale(1.05) !important;
            opacity: 0.9 !important;
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
    
    styleElement.textContent = isolatedCSS + `
    /* Viz agent view styles */
    #vizualai-floating-overlay .viz-agent-view { display: none !important; }
    #vizualai-floating-overlay.agent-mode .viz-agent-view { display: block !important; }
    #vizualai-floating-overlay.agent-mode .glass-content { display: none !important; }
    #vizualai-floating-overlay .header-actions { display: flex; gap: 8px; align-items: center; }
    #vizualai-floating-overlay .glass-icon-btn { cursor: pointer; padding: 6px 8px; border-radius: 10px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); color: #0f172a; }
    #vizualai-floating-overlay .glass-icon-btn:hover { background: rgba(255,255,255,0.14); }
    #vizualai-floating-overlay.agent-mode #overlay-open-agent-btn { display: none; }
    #vizualai-floating-overlay.agent-mode #overlay-back-btn { display: inline-flex !important; }
    #vizualai-floating-overlay .viz-agent-view { padding: 12px; backdrop-filter: blur(8px); background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; }
    #vizualai-floating-overlay .agent-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    #vizualai-floating-overlay .agent-title { margin: 0; font-size: 16px; color: #e5e7eb; }
    #vizualai-floating-overlay .agent-row { margin: 8px 0; }
    #vizualai-floating-overlay .agent-label { display:block; font-size: 12px; color: #cbd5e1; margin-bottom: 4px; }
    #vizualai-floating-overlay .agent-input,
    #vizualai-floating-overlay .agent-textarea,
    #vizualai-floating-overlay .agent-select { width: 100%; box-sizing: border-box; background: rgba(2,6,23,0.5); color: #e5e7eb; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 8px; font-size: 12px; }
    #vizualai-floating-overlay .agent-textarea { min-height: 64px; resize: vertical; }
    #vizualai-floating-overlay .agent-primary-btn { background: linear-gradient(90deg,#22D3EE,#C084FC); color: #0b1020; border: none; padding: 8px 12px; border-radius: 10px; cursor: pointer; font-weight: 600; }
    #vizualai-floating-overlay .agent-primary-btn:hover { filter: brightness(1.05); }
    #vizualai-floating-overlay .agent-status { min-height: 90px; max-height: 140px; overflow: auto; background: rgba(2,6,23,0.4); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; font-size: 11px; color: #cbd5e1; white-space: pre-wrap; }
    `;
    document.head.appendChild(styleElement);
}

function setupOverlayEventListeners() {
    // Close button
    const closeBtn = overlayContainer.querySelector('#overlay-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideOverlay);
    }

    const openAgentBtn = overlayContainer.querySelector('#overlay-open-agent-btn');
    if (openAgentBtn) {
        openAgentBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); switchToAgentView(); });
    }

    const navBackBtn = overlayContainer.querySelector('#overlay-back-btn');
    if (navBackBtn) {
        navBackBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); switchToMainView(); });
    }
    
    const runAgentCard = overlayContainer.querySelector('#overlay-run-agent-card');
    if (runAgentCard) {
        runAgentCard.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            switchToAgentView();
        }, { passive: true });
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
    console.log('VizualAI: Initializing overlay...');
    
    // Check connection status
    checkConnectionStatus();
    
    // Check server connection status (with small delay to ensure DOM is ready)
    setTimeout(() => {
        console.log('VizualAI: Checking server connection...');
        checkServerConnection();
    }, 100);
    
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
    console.log('VizualAI: Overlay initialization complete');
}

// Agent view logic
function switchToAgentView() {
    try {
        const root = document.getElementById('vizualai-floating-overlay');
        if (!root) return;
        root.classList.add('agent-mode');
        wireAgentHandlers();
    } catch (e) {
        console.error('Failed to switch to agent view:', e);
    }
}

function switchToMainView() {
    try {
        const root = document.getElementById('vizualai-floating-overlay');
        if (!root) return;
        root.classList.remove('agent-mode');
    } catch (e) {
        console.error('Failed to switch to main view:', e);
    }
}

function wireAgentHandlers() {
    const backBtn = overlayContainer.querySelector('#viz-agent-back-btn');
    if (backBtn) backBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); switchToMainView(); };

    const workdirEl = overlayContainer.querySelector('#viz-workdir');
    const descEl = overlayContainer.querySelector('#viz-description');
    const runnerEl = overlayContainer.querySelector('#viz-runner');
    const statusEl = overlayContainer.querySelector('#viz-status');
    const btn = overlayContainer.querySelector('#viz-record-run-btn');

    function log(msg) {
        const ts = new Date().toLocaleTimeString();
        statusEl.textContent += `[${ts}] ${msg}\n`;
        statusEl.scrollTop = statusEl.scrollHeight;
    }

    async function getServerSettings() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['browserConnectorSettings'], (result) => {
                resolve(result.browserConnectorSettings || { serverHost: 'localhost', serverPort: 3025 });
            });
        });
    }

    async function postJson(url, body) {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    }

    async function getActiveTabId() {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({ type: 'GET_CURRENT_TAB_ID' }, (resp) => {
                    resolve(resp && resp.tabId ? resp.tabId : null);
                });
            } catch {
                resolve(null);
            }
        });
    }

    if (btn) {
        btn.onclick = async () => {
            try {
                statusEl.textContent = '';
                const tabId = await getActiveTabId();
                if (!tabId) { log('No active tab'); return; }

                const workdir = (workdirEl.value || '').trim();
                if (!workdir) { log('Please set workdir'); return; }
                const settings = await getServerSettings();
                await postJson(`http://${settings.serverHost}:${settings.serverPort}/viz/settings`, { workdir, viz: { runner: runnerEl.value } });
                log(`Settings updated: workdir=${workdir}, runner=${runnerEl.value}`);

                const description = (descEl.value || '').trim();
                // Start recording from popup flow
                await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ type: 'START_TAB_RECORDING_FROM_POPUP', tabId, includeMicrophone: true, description }, () => resolve(null));
                });
                log('Recording started');

                // Wait for recording saved
                const stopResult = await new Promise((resolve) => {
                    const listener = (message) => {
                        if (message && message.type === 'POPUP_RECORDING_SAVED') {
                            chrome.runtime.onMessage.removeListener(listener);
                            resolve(message);
                        }
                    };
                    chrome.runtime.onMessage.addListener(listener);
                });
                const recordingPath = stopResult.path;
                log(`Recording saved: ${recordingPath}`);

                // Submit analyze-and-run
                log('Submitting analyze-and-run');
                const resp = await postJson(`http://${settings.serverHost}:${settings.serverPort}/viz/analyze-and-run`, {
                    recordingPath,
                    description,
                    runner: runnerEl.value,
                    immediate: true
                });
                log(`Analysis queued: ${resp.analysisId}`);
            } catch (e) {
                log(`Error: ${e.message}`);
            }
        };
    }
}
// Event handlers
function handleScreenshot() {
    getCurrentTabId().then(async tabId => {
        try {
            // Check if we can inject cursor selection into this tab
            const currentUrl = window.location.href;
            if (currentUrl.startsWith('chrome://') || 
                currentUrl.startsWith('chrome-extension://') ||
                currentUrl.startsWith('edge://') ||
                currentUrl.startsWith('about:')) {
                // Use fallback screenshot method for browser pages
                chrome.runtime.sendMessage({
                    type: 'CAPTURE_SCREENSHOT_FALLBACK',
                    tabId: tabId
                }, (response) => {
                    if (response && response.success) {
                        hideOverlay();
                        showNotification('Opening screenshot review...', 'success');
                    } else {
                        showNotification('Failed to capture screenshot', 'error');
                    }
                });
                return;
            }
            
            // Inject cursor selection script and start selection mode
            chrome.runtime.sendMessage({
                type: 'INJECT_CURSOR_SELECTION',
                tabId: tabId
            }, (response) => {
                if (response && response.success) {
                    // Wait a moment for script to load, then start selection
                    setTimeout(() => {
                        if (window.VizualCursorSelection) {
                            window.VizualCursorSelection.startSelectionMode();
                            hideOverlay(); // Hide overlay to allow selection
                        } else {
                            // Still fallback if injection failed
                            chrome.runtime.sendMessage({
                                type: 'CAPTURE_SCREENSHOT_FALLBACK',
                                tabId: tabId
                            }, handleFallbackResponse);
                        }
                    }, 100);
                } else {
                    // Fallback to direct screenshot if injection failed
                    chrome.runtime.sendMessage({
                        type: 'CAPTURE_SCREENSHOT_FALLBACK',
                        tabId: tabId
                    }, handleFallbackResponse);
                }
            });
            
        } catch (error) {
            console.error('Error starting screenshot capture:', error);
            // Fallback to direct screenshot
            chrome.runtime.sendMessage({
                type: 'CAPTURE_SCREENSHOT_FALLBACK',
                tabId: tabId
            }, handleFallbackResponse);
        }
    });
    
    // Helper function for fallback screenshot response
    function handleFallbackResponse(response) {
        if (response && response.success) {
            hideOverlay();
            showNotification('Opening screenshot review...', 'success');
        } else {
            showNotification('Failed to capture screenshot', 'error');
        }
    }
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

async function checkServerConnection() {
    console.log('VizualAI: checkServerConnection called');
    console.log('VizualAI: overlayContainer exists:', !!overlayContainer);
    
    const statusContainer = overlayContainer.querySelector('#overlay-connection-status');
    const statusText = overlayContainer.querySelector('#overlay-connection-text');
    const statusBadge = overlayContainer.querySelector('#overlay-status-badge');
    
    console.log('VizualAI: Found elements:', {
        statusContainer: !!statusContainer,
        statusText: !!statusText, 
        statusBadge: !!statusBadge
    });
    
    if (!statusContainer || !statusText || !statusBadge) {
        console.log('VizualAI: Missing required DOM elements for connection status');
        return;
    }
    
    // Show connection status while checking
    console.log('VizualAI: Showing connection status...');
    statusContainer.classList.add('visible');  // Add .visible class to override CSS
    statusText.textContent = 'Checking connection...';
    statusBadge.className = 'status-glass-badge checking';
    console.log('VizualAI: Status container classes:', statusContainer.className);
    console.log('VizualAI: Status text set to:', statusText.textContent);
    
    try {
        // Get stored server settings
        const settings = await new Promise((resolve) => {
            chrome.storage.local.get(['browserConnectorSettings'], (result) => {
                resolve(result.browserConnectorSettings || {
                    serverHost: 'localhost',
                    serverPort: 3025
                });
            });
        });
        
        // Check server connection
        console.log(`VizualAI: Attempting connection to http://${settings.serverHost}:${settings.serverPort}/.identity`);
        const response = await fetch(`http://${settings.serverHost}:${settings.serverPort}/.identity`, {
            signal: AbortSignal.timeout(3000)
        });
        
        console.log('VizualAI: Server response status:', response.status);
        
        if (response.ok) {
            const identity = await response.json();
            console.log('VizualAI: Server identity:', identity);
            
            // Validate server signature
            if (identity.signature === 'mcp-browser-connector-24x7') {
                // Connected successfully
                console.log('VizualAI: Server signature valid, showing connected status');
                statusText.textContent = `Connected to ${identity.name || 'BrowserTools'} v${identity.version || '1.0'}`;
                statusBadge.className = 'status-glass-badge connected';
                
                // Hide connection status after 5 seconds when connected
                console.log('VizualAI: Connection successful, will auto-hide after 5 seconds');
                setTimeout(() => {
                    console.log('VizualAI: Auto-hiding connection status');
                    if (statusContainer) {
                        statusContainer.classList.remove('visible');
                    }
                }, 5000); // 5 seconds to show success
            } else {
                throw new Error('Invalid server signature');
            }
        } else {
            throw new Error(`Server responded with status ${response.status}`);
        }
    } catch (error) {
        console.error('VizualAI: Server connection failed:', error);
        
        // Show disconnected status with connect option
        console.log('VizualAI: Showing disconnected status');
        statusText.textContent = 'Server disconnected';
        statusBadge.className = 'status-glass-badge disconnected';
        
        // Add connect button
        addConnectButton(statusContainer);
    }
}

function addConnectButton(statusContainer) {
    // Check if connect button already exists
    if (statusContainer.querySelector('.connect-btn')) return;
    
    const connectBtn = document.createElement('button');
    connectBtn.className = 'glass-connect-btn connect-btn';
    connectBtn.textContent = 'Connect';
    connectBtn.title = 'Connect to BrowserTools server';
    
    connectBtn.addEventListener('click', async () => {
        connectBtn.textContent = 'Connecting...';
        connectBtn.disabled = true;
        
        // Attempt to discover and connect to server
        chrome.runtime.sendMessage({ type: 'DISCOVER_SERVER' }, (response) => {
            if (response && response.success) {
                // Server found, recheck connection
                setTimeout(() => checkServerConnection(), 1000);
            } else {
                // Show server settings or instructions
                showServerSettings();
            }
            
            connectBtn.textContent = 'Connect';
            connectBtn.disabled = false;
        });
    });
    
    statusContainer.appendChild(connectBtn);
}

function showServerSettings() {
    // Show a simple server configuration interface
    const settingsOverlay = document.createElement('div');
    settingsOverlay.className = 'server-settings-overlay';
    settingsOverlay.innerHTML = `
        <div class="server-settings-modal">
            <h3>Server Settings</h3>
            <p>Unable to connect to BrowserTools server. Please check:</p>
            <ol>
                <li>BrowserTools Node server is running</li>
                <li>Server is running on the correct port (default: 3025)</li>
                <li>No firewall blocking the connection</li>
            </ol>
            <div class="server-inputs">
                <label>Host: <input type="text" id="server-host-input" value="localhost" placeholder="localhost"></label>
                <label>Port: <input type="number" id="server-port-input" value="3025" placeholder="3025"></label>
            </div>
            <div class="settings-actions">
                <button id="test-connection-btn">Test Connection</button>
                <button id="save-settings-btn">Save Settings</button>
                <button id="close-settings-btn">Close</button>
            </div>
        </div>
    `;
    
    // Style the settings overlay
    settingsOverlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.5) !important;
        backdrop-filter: blur(10px) !important;
        z-index: 2147483648 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
    `;
    
    document.body.appendChild(settingsOverlay);
    
    // Add event listeners
    settingsOverlay.querySelector('#close-settings-btn').addEventListener('click', () => {
        settingsOverlay.remove();
    });
    
    settingsOverlay.querySelector('#test-connection-btn').addEventListener('click', async () => {
        const host = settingsOverlay.querySelector('#server-host-input').value;
        const port = parseInt(settingsOverlay.querySelector('#server-port-input').value);
        
        try {
            const response = await fetch(`http://${host}:${port}/.identity`, {
                signal: AbortSignal.timeout(3000)
            });
            
            if (response.ok) {
                const identity = await response.json();
                if (identity.signature === 'mcp-browser-connector-24x7') {
                    showNotification('Connection successful!', 'success');
                } else {
                    showNotification('Connected but invalid server signature', 'error');
                }
            } else {
                showNotification('Connection failed', 'error');
            }
        } catch (error) {
            showNotification('Connection failed: ' + error.message, 'error');
        }
    });
    
    settingsOverlay.querySelector('#save-settings-btn').addEventListener('click', () => {
        const host = settingsOverlay.querySelector('#server-host-input').value;
        const port = parseInt(settingsOverlay.querySelector('#server-port-input').value);
        
        chrome.storage.local.set({
            browserConnectorSettings: {
                serverHost: host,
                serverPort: port
            }
        }, () => {
            showNotification('Settings saved!', 'success');
            settingsOverlay.remove();
            // Recheck connection with new settings
            setTimeout(() => checkServerConnection(), 1000);
        });
    });
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