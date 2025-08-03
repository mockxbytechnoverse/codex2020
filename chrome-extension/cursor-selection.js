// VizualAI Cursor Selection System
// Handles crosshair cursor and click-drag selection for screenshots

// Selection state
let isSelectionMode = false;
let selectionStart = null;
let selectionEnd = null;
let selectionOverlay = null;
let isSelecting = false;

// VizualAI brand colors for selection
const SELECTION_COLORS = {
    cyan: '#22D3EE',
    purple: '#C084FC',
    opacity: 0.3
};

// Initialize cursor selection system
function initializeCursorSelection() {
    console.log('Initializing cursor selection system');
    
    // Create crosshair cursor CSS
    createCrosshairCursor();
    
    // Set up selection overlay
    createSelectionOverlay();
    
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener(handleSelectionMessages);
}

// Create crosshair cursor styles
function createCrosshairCursor() {
    // Create crosshair cursor using SVG data URL
    const crosshairCursor = `data:image/svg+xml;base64,${btoa(`
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <g stroke="#333" stroke-width="1.5" fill="none">
                <!-- Crosshair lines -->
                <line x1="12" y1="2" x2="12" y2="10" opacity="0.8"/>
                <line x1="12" y1="14" x2="12" y2="22" opacity="0.8"/>
                <line x1="2" y1="12" x2="10" y2="12" opacity="0.8"/>
                <line x1="14" y1="12" x2="22" y2="12" opacity="0.8"/>
                <!-- Center circle -->
                <circle cx="12" cy="12" r="3" stroke="#22D3EE" stroke-width="2" fill="rgba(34, 211, 238, 0.1)"/>
                <!-- Outer ring -->
                <circle cx="12" cy="12" r="8" stroke="#22D3EE" stroke-width="1" opacity="0.6"/>
            </g>
        </svg>
    `)}`;
    
    // Add cursor styles to document
    const style = document.createElement('style');
    style.id = 'vizual-cursor-styles';
    style.textContent = `
        .vizual-crosshair-cursor {
            cursor: url('${crosshairCursor}') 12 12, crosshair !important;
        }
        
        .vizual-crosshair-cursor * {
            cursor: url('${crosshairCursor}') 12 12, crosshair !important;
        }
        
        .vizual-selection-active {
            user-select: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
        }
    `;
    
    document.head.appendChild(style);
}

// Create selection overlay
function createSelectionOverlay() {
    // Remove existing overlay if present
    if (selectionOverlay) {
        selectionOverlay.remove();
    }
    
    selectionOverlay = document.createElement('div');
    selectionOverlay.id = 'vizual-selection-overlay';
    selectionOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 999999;
        background: transparent;
    `;
    
    document.documentElement.appendChild(selectionOverlay);
}

// Handle messages related to selection
function handleSelectionMessages(message, sender, sendResponse) {
    switch (message.type) {
        case 'START_SELECTION_MODE':
            startSelectionMode();
            sendResponse({ success: true });
            break;
            
        case 'STOP_SELECTION_MODE':
            stopSelectionMode();
            sendResponse({ success: true });
            break;
            
        case 'GET_SELECTION_STATE':
            sendResponse({ 
                isSelectionMode,
                isSelecting,
                hasSelection: selectionStart && selectionEnd
            });
            break;
    }
}

// Start selection mode
function startSelectionMode() {
    console.log('Starting selection mode');
    
    isSelectionMode = true;
    
    // Apply crosshair cursor to entire page
    document.documentElement.classList.add('vizual-crosshair-cursor');
    document.documentElement.classList.add('vizual-selection-active');
    
    // Show selection instructions
    showSelectionInstructions();
    
    // Add event listeners for selection
    document.addEventListener('mousedown', handleSelectionStart, true);
    document.addEventListener('mousemove', handleSelectionMove, true);
    document.addEventListener('mouseup', handleSelectionEnd, true);
    document.addEventListener('keydown', handleSelectionKeyboard, true);
    
    // Prevent default drag behaviors
    document.addEventListener('dragstart', preventDefault, true);
    document.addEventListener('selectstart', preventDefault, true);
}

// Stop selection mode
function stopSelectionMode() {
    console.log('Stopping selection mode');
    
    isSelectionMode = false;
    isSelecting = false;
    
    // Remove cursor styles
    document.documentElement.classList.remove('vizual-crosshair-cursor');
    document.documentElement.classList.remove('vizual-selection-active');
    
    // Remove event listeners
    document.removeEventListener('mousedown', handleSelectionStart, true);
    document.removeEventListener('mousemove', handleSelectionMove, true);
    document.removeEventListener('mouseup', handleSelectionEnd, true);
    document.removeEventListener('keydown', handleSelectionKeyboard, true);
    document.removeEventListener('dragstart', preventDefault, true);
    document.removeEventListener('selectstart', preventDefault, true);
    
    // Clear selection
    clearSelection();
    
    // Hide instructions
    hideSelectionInstructions();
}

// Handle selection start (mousedown)
function handleSelectionStart(event) {
    if (!isSelectionMode) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    isSelecting = true;
    selectionStart = {
        x: event.clientX,
        y: event.clientY
    };
    
    // Clear any existing selection visual
    clearSelectionVisual();
    
    console.log('Selection started at:', selectionStart);
}

// Handle selection move (mousemove)
function handleSelectionMove(event) {
    if (!isSelectionMode || !isSelecting) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    selectionEnd = {
        x: event.clientX,
        y: event.clientY
    };
    
    // Update selection visual
    updateSelectionVisual();
}

// Handle selection end (mouseup)
function handleSelectionEnd(event) {
    if (!isSelectionMode || !isSelecting) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    isSelecting = false;
    selectionEnd = {
        x: event.clientX,
        y: event.clientY
    };
    
    console.log('Selection ended at:', selectionEnd);
    
    // Validate selection (minimum size)
    const selectionRect = getSelectionRect();
    if (selectionRect.width < 10 || selectionRect.height < 10) {
        console.log('Selection too small, clearing');
        clearSelection();
        return;
    }
    
    // Capture the selected area
    captureSelection();
}

// Handle keyboard shortcuts during selection
function handleSelectionKeyboard(event) {
    if (!isSelectionMode) return;
    
    switch (event.key) {
        case 'Escape':
            event.preventDefault();
            stopSelectionMode();
            // Send message to cancel screenshot
            chrome.runtime.sendMessage({ type: 'CANCEL_SCREENSHOT' });
            break;
            
        case 'Enter':
            if (selectionStart && selectionEnd) {
                event.preventDefault();
                captureSelection();
            }
            break;
    }
}

// Update selection visual
function updateSelectionVisual() {
    if (!selectionStart || !selectionEnd) return;
    
    const rect = getSelectionRect();
    
    // Clear existing visual
    clearSelectionVisual();
    
    // Create selection rectangle
    const selectionRect = document.createElement('div');
    selectionRect.className = 'vizual-selection-rect';
    selectionRect.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        background: linear-gradient(135deg, 
            rgba(34, 211, 238, ${SELECTION_COLORS.opacity}), 
            rgba(192, 132, 252, ${SELECTION_COLORS.opacity})
        );
        border: 2px solid ${SELECTION_COLORS.cyan};
        box-shadow: 
            0 0 0 1px rgba(255, 255, 255, 0.5),
            0 4px 12px rgba(34, 211, 238, 0.3);
        pointer-events: none;
        z-index: 1000000;
        animation: vizualSelectionPulse 2s ease-in-out infinite;
    `;
    
    // Add animation styles if not already present
    if (!document.getElementById('vizual-selection-animation')) {
        const animationStyle = document.createElement('style');
        animationStyle.id = 'vizual-selection-animation';
        animationStyle.textContent = `
            @keyframes vizualSelectionPulse {
                0%, 100% { box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5), 0 4px 12px rgba(34, 211, 238, 0.3); }
                50% { box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8), 0 4px 20px rgba(34, 211, 238, 0.5); }
            }
        `;
        document.head.appendChild(animationStyle);
    }
    
    selectionOverlay.appendChild(selectionRect);
    
    // Add corner handles for visual feedback
    addSelectionHandles(selectionRect, rect);
}

// Add corner handles to selection
function addSelectionHandles(selectionRect, rect) {
    const handleSize = 8;
    const positions = [
        { x: -handleSize/2, y: -handleSize/2 }, // top-left
        { x: rect.width - handleSize/2, y: -handleSize/2 }, // top-right
        { x: -handleSize/2, y: rect.height - handleSize/2 }, // bottom-left
        { x: rect.width - handleSize/2, y: rect.height - handleSize/2 } // bottom-right
    ];
    
    positions.forEach(pos => {
        const handle = document.createElement('div');
        handle.style.cssText = `
            position: absolute;
            left: ${pos.x}px;
            top: ${pos.y}px;
            width: ${handleSize}px;
            height: ${handleSize}px;
            background: ${SELECTION_COLORS.cyan};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            pointer-events: none;
        `;
        selectionRect.appendChild(handle);
    });
}

// Clear selection visual
function clearSelectionVisual() {
    const existingRect = selectionOverlay.querySelector('.vizual-selection-rect');
    if (existingRect) {
        existingRect.remove();
    }
}

// Clear selection data
function clearSelection() {
    selectionStart = null;
    selectionEnd = null;
    clearSelectionVisual();
}

// Get selection rectangle
function getSelectionRect() {
    if (!selectionStart || !selectionEnd) return null;
    
    const left = Math.min(selectionStart.x, selectionEnd.x);
    const top = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    
    return { left, top, width, height };
}

// Capture the selected area
function captureSelection() {
    const rect = getSelectionRect();
    if (!rect) return;
    
    console.log('Capturing selection:', rect);
    
    // Stop selection mode
    stopSelectionMode();
    
    // Send selection data to background script
    chrome.runtime.sendMessage({
        type: 'CAPTURE_SELECTION',
        selectionRect: rect,
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            devicePixelRatio: window.devicePixelRatio || 1
        }
    });
}

// Show selection instructions
function showSelectionInstructions() {
    // Remove existing instructions
    hideSelectionInstructions();
    
    const instructions = document.createElement('div');
    instructions.id = 'vizual-selection-instructions';
    instructions.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(45, 55, 72, 0.95);
        backdrop-filter: blur(10px);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 1000001;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: vizualSlideDown 0.3s ease-out;
        pointer-events: none;
    `;
    
    instructions.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3 8-8"/>
            </svg>
            Click and drag to screenshot area • Press ESC to cancel
        </div>
    `;
    
    // Add slide animation
    if (!document.getElementById('vizual-instruction-animation')) {
        const animationStyle = document.createElement('style');
        animationStyle.id = 'vizual-instruction-animation';
        animationStyle.textContent = `
            @keyframes vizualSlideDown {
                from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
        `;
        document.head.appendChild(animationStyle);
    }
    
    document.documentElement.appendChild(instructions);
}

// Hide selection instructions
function hideSelectionInstructions() {
    const instructions = document.getElementById('vizual-selection-instructions');
    if (instructions) {
        instructions.remove();
    }
}

// Prevent default events during selection
function preventDefault(event) {
    event.preventDefault();
    event.stopPropagation();
}

// Cleanup function
function cleanupCursorSelection() {
    stopSelectionMode();
    
    // Remove styles
    const cursorStyles = document.getElementById('vizual-cursor-styles');
    if (cursorStyles) cursorStyles.remove();
    
    const animationStyles = document.getElementById('vizual-selection-animation');
    if (animationStyles) animationStyles.remove();
    
    const instructionStyles = document.getElementById('vizual-instruction-animation');
    if (instructionStyles) instructionStyles.remove();
    
    // Remove overlay
    if (selectionOverlay) {
        selectionOverlay.remove();
        selectionOverlay = null;
    }
}

// Initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCursorSelection);
} else {
    initializeCursorSelection();
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanupCursorSelection);

// Export for potential external use
window.VizualCursorSelection = {
    startSelectionMode,
    stopSelectionMode,
    isSelectionMode: () => isSelectionMode,
    clearSelection,
    getSelectionRect
};