// Recording bar component that gets injected into pages
class RecordingBar {
    constructor() {
        this.isRecording = false;
        this.isPaused = false;
        this.recordingStartTime = null;
        this.timerInterval = null;
        this.barElement = null;
    }

    create() {
        // Create recording bar HTML
        const barHTML = `
            <div class="codex-recording-bar" id="codex-recording-bar">
                <div class="codex-recording-indicator">
                    <div class="codex-recording-dot"></div>
                    <div class="codex-recording-text">Recording in</div>
                    <div class="codex-recording-timer" id="codex-recording-timer">1</div>
                </div>
                <div class="codex-recording-controls">
                    <button class="codex-control-btn" id="codex-pause-btn" title="Pause">
                        <svg viewBox="0 0 24 24" class="codex-control-icon">
                            <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                            <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
                        </svg>
                    </button>
                    <button class="codex-control-btn" id="codex-mute-btn" title="Mute">
                        <svg viewBox="0 0 24 24" class="codex-control-icon">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
                        </svg>
                    </button>
                    <button class="codex-control-btn" id="codex-stop-btn" title="Stop">
                        <svg viewBox="0 0 24 24" class="codex-control-icon">
                            <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // Create style element
        const style = document.createElement('style');
        style.textContent = `
            .codex-recording-bar {
                position: fixed;
                bottom: 50px;
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
                min-width: 280px;
                max-width: 320px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            }
            
            .codex-recording-indicator {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
            }
            
            .codex-recording-dot {
                width: 14px;
                height: 14px;
                background: #ff3b30;
                border-radius: 50%;
                animation: codexPulse 1.5s infinite;
                flex-shrink: 0;
            }
            
            @keyframes codexPulse {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.6; transform: scale(1.2); }
                100% { opacity: 1; transform: scale(1); }
            }
            
            .codex-recording-text {
                color: white;
                font-size: 14px;
                font-weight: 500;
            }
            
            .codex-recording-timer {
                color: white;
                font-size: 14px;
                font-weight: 600;
                font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
                margin-left: 4px;
            }
            
            .codex-recording-controls {
                display: flex;
                gap: 4px;
                align-items: center;
            }
            
            .codex-control-btn {
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
            
            .codex-control-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }
            
            .codex-control-btn svg {
                width: 20px;
                height: 20px;
                fill: currentColor;
            }
            
            .codex-control-icon {
                width: 20px;
                height: 20px;
            }
        `;

        // Append style to document head
        document.head.appendChild(style);

        // Create and append recording bar
        const container = document.createElement('div');
        container.innerHTML = barHTML;
        this.barElement = container.firstElementChild;
        document.body.appendChild(this.barElement);

        // Set up event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        const pauseBtn = document.getElementById('codex-pause-btn');
        const muteBtn = document.getElementById('codex-mute-btn');
        const stopBtn = document.getElementById('codex-stop-btn');

        pauseBtn?.addEventListener('click', () => this.togglePause());
        muteBtn?.addEventListener('click', () => this.toggleMute());
        stopBtn?.addEventListener('click', () => this.stopRecording());
    }

    show() {
        if (!this.barElement) {
            this.create();
        }
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        this.startTimer();
        
        // Update text after countdown
        setTimeout(() => {
            const textElement = this.barElement.querySelector('.codex-recording-text');
            if (textElement) {
                textElement.textContent = 'Recording';
            }
        }, 1000);
    }

    hide() {
        this.isRecording = false;
        this.stopTimer();
        if (this.barElement) {
            this.barElement.remove();
            this.barElement = null;
        }
    }

    startTimer() {
        this.updateTimer();
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimer() {
        if (!this.recordingStartTime) return;
        
        const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        const timerElement = document.getElementById('codex-recording-timer');
        if (timerElement) {
            timerElement.textContent = formatted;
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('codex-pause-btn');
        
        if (this.isPaused) {
            pauseBtn.innerHTML = `
                <svg viewBox="0 0 24 24" class="codex-control-icon">
                    <path d="M8 5v14l11-7z" fill="currentColor"/>
                </svg>
            `;
            pauseBtn.title = 'Resume';
        } else {
            pauseBtn.innerHTML = `
                <svg viewBox="0 0 24 24" class="codex-control-icon">
                    <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                    <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
                </svg>
            `;
            pauseBtn.title = 'Pause';
        }
        
        // Check if desktop or tab recording
        chrome.storage.local.get(['desktopRecording'], (result) => {
            if (result.desktopRecording && result.desktopRecording.isActive) {
                // For desktop recording, send to popup
                chrome.runtime.sendMessage({
                    type: 'TOGGLE_DESKTOP_PAUSE',
                    isPaused: this.isPaused
                });
            } else {
                // For tab recording, send to content script
                chrome.runtime.sendMessage({
                    type: 'PAUSE_RECORDING',
                    isPaused: this.isPaused
                });
            }
        });
    }

    toggleMute() {
        const muteBtn = document.getElementById('codex-mute-btn');
        const isMuted = muteBtn.title === 'Unmute';
        
        if (!isMuted) {
            muteBtn.innerHTML = `
                <svg viewBox="0 0 24 24" class="codex-control-icon">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor"/>
                </svg>
            `;
            muteBtn.title = 'Unmute';
        } else {
            muteBtn.innerHTML = `
                <svg viewBox="0 0 24 24" class="codex-control-icon">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
                </svg>
            `;
            muteBtn.title = 'Mute';
        }
        
        // Check if desktop or tab recording
        chrome.storage.local.get(['desktopRecording'], (result) => {
            if (result.desktopRecording && result.desktopRecording.isActive) {
                // For desktop recording, send to popup
                chrome.runtime.sendMessage({
                    type: 'TOGGLE_DESKTOP_MUTE',
                    isMuted: !isMuted
                });
            } else {
                // For tab recording, send to content script  
                chrome.runtime.sendMessage({
                    type: 'TOGGLE_MUTE',
                    isMuted: !isMuted
                });
            }
        });
    }

    stopRecording() {
        // Check if this is a desktop recording or tab recording
        chrome.storage.local.get(['desktopRecording'], (result) => {
            if (result.desktopRecording && result.desktopRecording.isActive) {
                // For desktop recording, send message to popup/window
                chrome.runtime.sendMessage({
                    type: 'STOP_DESKTOP_RECORDING'
                }, () => {
                    this.hide();
                });
            } else {
                // For tab recording, send stop message to content script
                chrome.runtime.sendMessage({
                    type: 'STOP_RECORDING_FROM_BAR'
                }, () => {
                    this.hide();
                });
            }
        });
    }
}

// Create global instance
window.codexRecordingBar = new RecordingBar();

// Listen for messages from extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SHOW_RECORDING_BAR') {
        window.codexRecordingBar.show();
        sendResponse({ success: true });
    } else if (message.type === 'HIDE_RECORDING_BAR') {
        window.codexRecordingBar.hide();
        sendResponse({ success: true });
    } else if (message.type === 'DESKTOP_RECORDING_STOPPED') {
        window.codexRecordingBar.hide();
        sendResponse({ success: true });
    }
    return true;
});