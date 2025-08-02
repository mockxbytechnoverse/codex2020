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
                    <button class="codex-control-btn" id="codex-laser-btn" title="Laser Pointer">
                        <svg viewBox="0 0 24 24" class="codex-control-icon">
                            <circle cx="12" cy="12" r="3" fill="currentColor"/>
                            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
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
                min-width: 320px;
                max-width: 360px;
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
        const laserBtn = document.getElementById('codex-laser-btn');
        const pauseBtn = document.getElementById('codex-pause-btn');
        const muteBtn = document.getElementById('codex-mute-btn');
        const stopBtn = document.getElementById('codex-stop-btn');

        console.log("Recording-bar: Setting up event listeners", { laserBtn, pauseBtn, muteBtn, stopBtn });

        laserBtn?.addEventListener('click', () => {
            console.log("Recording-bar: Laser button clicked!");
            this.toggleLaser();
        });
        pauseBtn?.addEventListener('click', () => this.togglePause());
        muteBtn?.addEventListener('click', () => this.toggleMute());
        stopBtn?.addEventListener('click', () => this.stopRecording());
    }

    show() {
        console.log("Recording-bar: show() called");
        if (!this.barElement) {
            console.log("Recording-bar: Creating new bar element");
            this.create();
        } else {
            console.log("Recording-bar: Bar element already exists");
        }
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        this.startTimer();
        
        console.log("Recording-bar: Bar should now be visible");
        
        // Update text after countdown
        setTimeout(() => {
            const textElement = this.barElement.querySelector('.codex-recording-text');
            if (textElement) {
                textElement.textContent = 'Recording';
                console.log("Recording-bar: Updated text to 'Recording'");
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
        console.log("Recording-bar: Toggle pause clicked");
        
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
        
        // Route through background script for all recordings
        chrome.runtime.sendMessage({
            type: 'PAUSE_RECORDING_FROM_BAR',
            isPaused: this.isPaused
        }, (response) => {
            console.log("Recording-bar: Pause response:", response);
        });
    }

    toggleMute() {
        console.log("Recording-bar: Toggle mute clicked");
        
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
        
        // Route through background script for all recordings
        chrome.runtime.sendMessage({
            type: 'MUTE_RECORDING_FROM_BAR',
            isMuted: !isMuted
        }, (response) => {
            console.log("Recording-bar: Mute response:", response);
        });
    }

    toggleLaser() {
        console.log("Recording-bar: toggleLaser clicked");
        
        try {
            // Check if laser pointer exists, if not create it inline
            if (!window.codexLaserPointer) {
                console.log("Recording-bar: Creating laser pointer inline");
                this.createLaserPointer();
            }
            
            // Toggle laser pointer
            const isEnabled = window.codexLaserPointer.toggle();
            this.updateLaserButton(isEnabled);
            console.log("Recording-bar: Laser pointer toggled, enabled:", isEnabled);
        } catch (error) {
            console.error("Recording-bar: Error in toggleLaser", error);
        }
    }

    createLaserPointer() {
        // Inline laser pointer class
        class LaserPointer {
            constructor() {
                this.isEnabled = false;
                this.pointerElement = null;
                this.rippleElement = null;
                this.mousePosition = { x: 0, y: 0 };
                this.isDrawing = false;
                this.currentPath = null;
                this.drawingContainer = null;
                this.lastDrawPoint = null;
            }

            create() {
                // Create drawing container (SVG for smooth lines)
                this.drawingContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                this.drawingContainer.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    pointer-events: none;
                    z-index: 999997;
                    display: none;
                `;
                document.body.appendChild(this.drawingContainer);
                
                // Create laser pointer element
                this.pointerElement = document.createElement('div');
                this.pointerElement.className = 'codex-laser-pointer';
                this.pointerElement.style.cssText = `
                    position: fixed;
                    width: 30px;
                    height: 30px;
                    pointer-events: none;
                    z-index: 999998;
                    transform: translate(-50%, -50%);
                    display: none;
                `;
                
                // Create the red dot
                const dot = document.createElement('div');
                dot.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 20px;
                    height: 20px;
                    background: radial-gradient(circle, rgba(255, 0, 0, 0.8) 0%, rgba(255, 0, 0, 0.4) 50%, transparent 100%);
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    box-shadow: 0 0 20px rgba(255, 0, 0, 0.6);
                    animation: laserPulse 1.5s infinite;
                `;
                
                // Create ripple element
                this.rippleElement = document.createElement('div');
                this.rippleElement.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 40px;
                    height: 40px;
                    border: 2px solid rgba(255, 0, 0, 0.6);
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    opacity: 0;
                `;
                
                this.pointerElement.appendChild(dot);
                this.pointerElement.appendChild(this.rippleElement);
                document.body.appendChild(this.pointerElement);
                
                // Add styles
                this.addStyles();
                this.setupEventListeners();
            }

            addStyles() {
                if (document.getElementById('laser-pointer-styles')) return;
                
                const style = document.createElement('style');
                style.id = 'laser-pointer-styles';
                style.textContent = `
                    @keyframes laserPulse {
                        0% { transform: translate(-50%, -50%) scale(1); }
                        50% { transform: translate(-50%, -50%) scale(1.2); }
                        100% { transform: translate(-50%, -50%) scale(1); }
                    }
                    
                    @keyframes laserRipple {
                        0% {
                            transform: translate(-50%, -50%) scale(1);
                            opacity: 1;
                        }
                        100% {
                            transform: translate(-50%, -50%) scale(2.5);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            setupEventListeners() {
                document.addEventListener('mousemove', (e) => {
                    if (!this.isEnabled) return;
                    this.mousePosition = { x: e.clientX, y: e.clientY };
                    this.updatePosition();
                    
                    // Handle drawing while dragging
                    if (this.isDrawing) {
                        this.drawLine(e.clientX, e.clientY);
                    }
                });
                
                document.addEventListener('mousedown', (e) => {
                    if (!this.isEnabled) return;
                    this.startDrawing(e.clientX, e.clientY);
                });
                
                document.addEventListener('mouseup', (e) => {
                    if (!this.isEnabled) return;
                    this.stopDrawing();
                    this.createRipple();
                });
                
                document.addEventListener('click', (e) => {
                    if (!this.isEnabled || this.isDrawing) return;
                    this.createRipple();
                });
            }

            updatePosition() {
                if (!this.pointerElement) return;
                this.pointerElement.style.left = this.mousePosition.x + 'px';
                this.pointerElement.style.top = this.mousePosition.y + 'px';
            }

            createRipple() {
                if (!this.rippleElement) return;
                this.rippleElement.style.animation = 'none';
                this.rippleElement.offsetHeight; // Force reflow
                this.rippleElement.style.animation = 'laserRipple 0.6s ease-out';
            }

            startDrawing(x, y) {
                this.isDrawing = true;
                this.lastDrawPoint = { x, y };
                
                // Create new path element
                this.currentPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                this.currentPath.setAttribute('stroke', '#ff0000');
                this.currentPath.setAttribute('stroke-width', '3');
                this.currentPath.setAttribute('stroke-linecap', 'round');
                this.currentPath.setAttribute('stroke-linejoin', 'round');
                this.currentPath.setAttribute('fill', 'none');
                this.currentPath.setAttribute('opacity', '0.8');
                this.currentPath.setAttribute('d', `M ${x} ${y}`);
                
                this.drawingContainer.appendChild(this.currentPath);
                
                // Auto-fade the line after 3 seconds
                setTimeout(() => {
                    if (this.currentPath && this.currentPath.parentNode) {
                        this.currentPath.style.transition = 'opacity 1s ease-out';
                        this.currentPath.style.opacity = '0';
                        setTimeout(() => {
                            if (this.currentPath && this.currentPath.parentNode) {
                                this.currentPath.remove();
                            }
                        }, 1000);
                    }
                }, 3000);
            }

            drawLine(x, y) {
                if (!this.isDrawing || !this.currentPath || !this.lastDrawPoint) return;
                
                // Add line to current path
                const currentD = this.currentPath.getAttribute('d');
                this.currentPath.setAttribute('d', currentD + ` L ${x} ${y}`);
                
                this.lastDrawPoint = { x, y };
            }

            stopDrawing() {
                this.isDrawing = false;
                this.currentPath = null;
                this.lastDrawPoint = null;
            }

            enable() {
                if (!this.pointerElement) this.create();
                this.isEnabled = true;
                this.pointerElement.style.display = 'block';
                this.drawingContainer.style.display = 'block';
                this.updatePosition();
            }

            disable() {
                this.isEnabled = false;
                this.isDrawing = false;
                if (this.pointerElement) {
                    this.pointerElement.style.display = 'none';
                }
                if (this.drawingContainer) {
                    this.drawingContainer.style.display = 'none';
                }
            }

            toggle() {
                if (this.isEnabled) {
                    this.disable();
                } else {
                    this.enable();
                }
                return this.isEnabled;
            }

            destroy() {
                this.disable();
                if (this.pointerElement) {
                    this.pointerElement.remove();
                    this.pointerElement = null;
                }
                if (this.drawingContainer) {
                    this.drawingContainer.remove();
                    this.drawingContainer = null;
                }
            }
        }

        // Create global instance
        window.codexLaserPointer = new LaserPointer();
        console.log("Recording-bar: Created inline laser pointer");
    }

    updateLaserButton(isEnabled) {
        const laserBtn = document.getElementById('codex-laser-btn');
        if (laserBtn) {
            if (isEnabled) {
                laserBtn.style.background = 'rgba(255, 59, 48, 0.3)';
                laserBtn.style.color = '#ff3b30';
            } else {
                laserBtn.style.background = 'transparent';
                laserBtn.style.color = 'rgba(255, 255, 255, 0.8)';
            }
        }
    }

    stopRecording() {
        console.log("Recording-bar: Stop recording clicked");
        
        // Clean up laser pointer if it exists
        if (window.codexLaserPointer) {
            window.codexLaserPointer.destroy();
        }
        
        // Always route through background script - it will handle both desktop and tab recording
        chrome.runtime.sendMessage({
            type: 'STOP_RECORDING_FROM_BAR'
        }, (response) => {
            console.log("Recording-bar: Stop recording response:", response);
            if (response && response.success) {
                this.hide();
            }
        });
    }
}

// Create global instance
window.codexRecordingBar = new RecordingBar();

// Listen for messages from extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Recording-bar: Received message", message.type);
    
    if (message.type === 'SHOW_RECORDING_BAR') {
        console.log("Recording-bar: Showing recording bar");
        window.codexRecordingBar.show();
        sendResponse({ success: true });
    } else if (message.type === 'HIDE_RECORDING_BAR') {
        console.log("Recording-bar: Hiding recording bar");
        window.codexRecordingBar.hide();
        sendResponse({ success: true });
    } else if (message.type === 'DESKTOP_RECORDING_STOPPED') {
        console.log("Recording-bar: Desktop recording stopped, hiding bar");
        window.codexRecordingBar.hide();
        sendResponse({ success: true });
    }
    return true;
});