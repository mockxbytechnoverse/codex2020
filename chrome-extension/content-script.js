// Content script for Browser Tools MCP
// This script runs on web pages to show recording UI

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showRecordingBar') {
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