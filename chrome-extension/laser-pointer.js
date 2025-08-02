// Laser pointer functionality for screen recording
class LaserPointer {
    constructor() {
        this.isEnabled = false;
        this.pointerElement = null;
        this.rippleElement = null;
        this.trailElements = [];
        this.mousePosition = { x: 0, y: 0 };
        this.lastPositions = [];
        this.animationFrame = null;
    }

    create() {
        // Create laser pointer element
        this.pointerElement = document.createElement('div');
        this.pointerElement.className = 'codex-laser-pointer';
        this.pointerElement.style.display = 'none';
        
        // Create ripple effect element
        this.rippleElement = document.createElement('div');
        this.rippleElement.className = 'codex-laser-ripple';
        
        this.pointerElement.appendChild(this.rippleElement);
        document.body.appendChild(this.pointerElement);
        
        // Add styles
        this.addStyles();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .codex-laser-pointer {
                position: fixed;
                width: 30px;
                height: 30px;
                pointer-events: none;
                z-index: 999998;
                transform: translate(-50%, -50%);
                transition: none;
            }
            
            .codex-laser-pointer::before {
                content: '';
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
            }
            
            .codex-laser-ripple {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 40px;
                height: 40px;
                border: 2px solid rgba(255, 0, 0, 0.6);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                opacity: 0;
            }
            
            .codex-laser-ripple.active {
                animation: laserRipple 0.6s ease-out;
            }
            
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
            
            .codex-laser-trail {
                position: fixed;
                width: 10px;
                height: 10px;
                background: radial-gradient(circle, rgba(255, 0, 0, 0.4) 0%, transparent 70%);
                border-radius: 50%;
                pointer-events: none;
                z-index: 999997;
                transform: translate(-50%, -50%);
                opacity: 0;
                transition: opacity 0.3s ease-out;
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        // Track mouse movement
        document.addEventListener('mousemove', (e) => {
            if (!this.isEnabled) return;
            
            this.mousePosition = { x: e.clientX, y: e.clientY };
            this.updatePointerPosition();
            this.createTrail(e.clientX, e.clientY);
        });
        
        // Handle clicks for ripple effect
        document.addEventListener('click', (e) => {
            if (!this.isEnabled) return;
            
            this.createRipple();
        });
    }

    updatePointerPosition() {
        if (!this.pointerElement) return;
        
        this.pointerElement.style.left = `${this.mousePosition.x}px`;
        this.pointerElement.style.top = `${this.mousePosition.y}px`;
    }

    createTrail(x, y) {
        // Limit trail length
        this.lastPositions.push({ x, y, time: Date.now() });
        if (this.lastPositions.length > 10) {
            this.lastPositions.shift();
        }
        
        // Create trail effect
        const trail = document.createElement('div');
        trail.className = 'codex-laser-trail';
        trail.style.left = `${x}px`;
        trail.style.top = `${y}px`;
        document.body.appendChild(trail);
        
        // Fade in
        requestAnimationFrame(() => {
            trail.style.opacity = '1';
        });
        
        // Remove after animation
        setTimeout(() => {
            trail.style.opacity = '0';
            setTimeout(() => trail.remove(), 300);
        }, 100);
    }

    createRipple() {
        if (!this.rippleElement) return;
        
        // Reset animation
        this.rippleElement.classList.remove('active');
        void this.rippleElement.offsetWidth; // Force reflow
        this.rippleElement.classList.add('active');
        
        // Remove class after animation
        setTimeout(() => {
            this.rippleElement.classList.remove('active');
        }, 600);
    }

    enable() {
        if (!this.pointerElement) {
            this.create();
        }
        
        this.isEnabled = true;
        this.pointerElement.style.display = 'block';
        
        // Initialize position
        this.updatePointerPosition();
    }

    disable() {
        this.isEnabled = false;
        if (this.pointerElement) {
            this.pointerElement.style.display = 'none';
        }
        
        // Clear any remaining trails
        document.querySelectorAll('.codex-laser-trail').forEach(trail => trail.remove());
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
        document.querySelectorAll('.codex-laser-trail').forEach(trail => trail.remove());
    }
}

// Create global instance
console.log("Laser-pointer: Creating global LaserPointer instance");
window.codexLaserPointer = new LaserPointer();
console.log("Laser-pointer: Global instance created", window.codexLaserPointer);