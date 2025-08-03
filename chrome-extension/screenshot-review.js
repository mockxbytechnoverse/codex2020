// VizualAI Screenshot Review Interface

// State management
let screenshotData = null;
let originalDescription = '';
let isAnnotationMode = false;

// DOM Elements
const screenshotImage = document.getElementById('screenshot-image');
const loadingSpinner = document.getElementById('loading-spinner');
const descriptionInput = document.getElementById('description-input');
const includeLogsCheckbox = document.getElementById('include-logs-checkbox');
const screenshotContainer = document.querySelector('.screenshot-container');

// Buttons
const closeBin = document.getElementById('close-btn');
const retakeBtn = document.getElementById('retake-btn');
const annotateBtn = document.getElementById('annotate-btn');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');

// Notification
const notification = document.getElementById('notification');
const notificationIcon = document.getElementById('notification-icon');
const notificationMessage = document.getElementById('notification-message');

// Initialize the review interface
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get screenshot data from URL parameters or storage
        await loadScreenshotData();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load user preferences
        loadUserPreferences();
        
        // Focus description input
        descriptionInput.focus();
        
    } catch (error) {
        console.error('Error initializing screenshot review:', error);
        showNotification('error', 'Failed to load screenshot');
    }
});

// Load screenshot data
async function loadScreenshotData() {
    try {
        // Get screenshot data from chrome storage (set by background script)
        const result = await chrome.storage.local.get(['currentScreenshot']);
        
        if (result.currentScreenshot) {
            screenshotData = result.currentScreenshot;
            
            // Crop the image if selection rectangle is provided
            let imageToDisplay = screenshotData.dataUrl;
            if (screenshotData.selectionRect && screenshotData.viewport) {
                try {
                    imageToDisplay = await cropScreenshotClientSide(
                        screenshotData.dataUrl, 
                        screenshotData.selectionRect, 
                        screenshotData.viewport
                    );
                } catch (error) {
                    console.error('Error cropping screenshot on client side:', error);
                    // Fall back to full screenshot
                }
            }
            
            // Set the image source
            screenshotImage.src = imageToDisplay;
            
            // Set description if provided
            if (screenshotData.description) {
                descriptionInput.value = screenshotData.description;
                originalDescription = screenshotData.description;
            }
            
            // Handle image load
            screenshotImage.onload = () => {
                screenshotContainer.classList.add('loaded');
                screenshotContainer.classList.remove('loading');
            };
            
            screenshotImage.onerror = () => {
                throw new Error('Failed to load screenshot image');
            };
            
        } else {
            throw new Error('No screenshot data found');
        }
    } catch (error) {
        console.error('Error loading screenshot data:', error);
        throw error;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Close button
    closeBin.addEventListener('click', closeReview);
    
    // Retake button
    retakeBtn.addEventListener('click', retakeScreenshot);
    
    // Annotate button
    annotateBtn.addEventListener('click', enterAnnotationMode);
    
    // Cancel button
    cancelBtn.addEventListener('click', closeReview);
    
    // Save button
    saveBtn.addEventListener('click', saveScreenshot);
    
    // Description input
    descriptionInput.addEventListener('input', handleDescriptionChange);
    
    // Checkbox
    includeLogsCheckbox.addEventListener('change', handleLogsCheckboxChange);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Window unload cleanup
    window.addEventListener('beforeunload', cleanup);
}

// Load user preferences
async function loadUserPreferences() {
    try {
        const result = await chrome.storage.local.get([
            'screenshotDescription',
            'includeBrowserLogs'
        ]);
        
        // Restore description if not already set
        if (!descriptionInput.value && result.screenshotDescription) {
            descriptionInput.value = result.screenshotDescription;
        }
        
        // Restore logs checkbox state
        if (result.includeBrowserLogs !== undefined) {
            includeLogsCheckbox.checked = result.includeBrowserLogs;
        }
    } catch (error) {
        console.error('Error loading user preferences:', error);
    }
}

// Handle description changes
function handleDescriptionChange() {
    // Auto-save description
    const description = descriptionInput.value.trim();
    chrome.storage.local.set({ screenshotDescription: description });
}

// Handle logs checkbox changes
function handleLogsCheckboxChange() {
    const includeLogs = includeLogsCheckbox.checked;
    chrome.storage.local.set({ includeBrowserLogs: includeLogs });
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(event) {
    // Escape key - close review
    if (event.key === 'Escape') {
        event.preventDefault();
        closeReview();
    }
    
    // Ctrl/Cmd + S - save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveScreenshot();
    }
    
    // Ctrl/Cmd + R - retake
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        retakeScreenshot();
    }
    
    // A key - toggle annotation mode
    if (event.key === 'a' && !event.target.closest('textarea')) {
        event.preventDefault();
        enterAnnotationMode();
    }
}

// Close review interface
async function closeReview() {
    try {
        // Clear current screenshot data
        await chrome.storage.local.remove(['currentScreenshot']);
        
        // Close the tab/window
        if (window.close) {
            window.close();
        } else {
            // Fallback: send message to background script to close
            chrome.runtime.sendMessage({
                type: 'CLOSE_REVIEW_INTERFACE'
            });
        }
    } catch (error) {
        console.error('Error closing review:', error);
    }
}

// Retake screenshot
async function retakeScreenshot() {
    try {
        // Send message to background script to retake screenshot
        chrome.runtime.sendMessage({
            type: 'RETAKE_SCREENSHOT'
        }, (response) => {
            if (response && response.success) {
                // Close current review and trigger new capture
                closeReview();
            } else {
                showNotification('error', 'Failed to retake screenshot');
            }
        });
    } catch (error) {
        console.error('Error retaking screenshot:', error);
        showNotification('error', 'Failed to retake screenshot');
    }
}

// Enter annotation mode
async function enterAnnotationMode() {
    try {
        isAnnotationMode = true;
        
        // Update UI state
        annotateBtn.textContent = 'Exit Annotation';
        annotateBtn.classList.add('active');
        
        // TODO: Initialize annotation canvas/tools
        // This will be implemented in Phase 2
        showNotification('info', 'Annotation mode will be available in the next update');
        
        // For now, just toggle back
        setTimeout(() => {
            exitAnnotationMode();
        }, 2000);
        
    } catch (error) {
        console.error('Error entering annotation mode:', error);
        showNotification('error', 'Failed to enter annotation mode');
    }
}

// Exit annotation mode
function exitAnnotationMode() {
    isAnnotationMode = false;
    
    // Update UI state
    annotateBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>
        </svg>
        Annotate
    `;
    annotateBtn.classList.remove('active');
}

// Save screenshot
async function saveScreenshot() {
    try {
        // Disable save button to prevent double-clicks
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        // Use the currently displayed image (which might be cropped)
        const currentImageSrc = screenshotImage.src;
        
        // Prepare screenshot data for saving
        const saveData = {
            dataUrl: currentImageSrc,
            description: descriptionInput.value.trim(),
            includeBrowserLogs: includeLogsCheckbox.checked,
            timestamp: new Date().toISOString(),
            url: screenshotData.url || '',
            title: screenshotData.title || '',
            isAnnotated: isAnnotationMode
        };
        
        // Send save request to background script
        chrome.runtime.sendMessage({
            type: 'SAVE_SCREENSHOT_WITH_METADATA',
            data: saveData
        }, (response) => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2"/>
                    <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" stroke-width="2"/>
                    <polyline points="7,3 7,8 15,8" stroke="currentColor" stroke-width="2"/>
                </svg>
                Save
            `;
            
            if (response && response.success) {
                showNotification('success', 'Screenshot saved successfully!');
                
                // Auto-close after successful save
                setTimeout(() => {
                    closeReview();
                }, 1500);
            } else {
                const errorMessage = response?.error || 'Failed to save screenshot';
                showNotification('error', errorMessage);
            }
        });
        
    } catch (error) {
        console.error('Error saving screenshot:', error);
        showNotification('error', 'Failed to save screenshot');
        
        // Re-enable save button
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2"/>
                <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" stroke-width="2"/>
                <polyline points="7,3 7,8 15,8" stroke="currentColor" stroke-width="2"/>
            </svg>
            Save
        `;
    }
}

// Show notification
function showNotification(type, message) {
    // Set notification content
    notificationMessage.textContent = message;
    
    // Set notification type and icon
    notification.className = 'notification';
    switch (type) {
        case 'success':
            notification.classList.add('success');
            notificationIcon.textContent = '✓';
            break;
        case 'error':
            notification.classList.add('error');
            notificationIcon.textContent = '⚠';
            break;
        case 'info':
        default:
            notificationIcon.textContent = 'ℹ';
            break;
    }
    
    // Show notification
    notification.classList.add('show');
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// Cleanup function
function cleanup() {
    // Clear any intervals or timeouts
    // Clean up event listeners if needed
    console.log('Screenshot review interface cleanup');
}

// Browser logs capture (for Phase 3)
async function captureBrowserLogs() {
    try {
        // This will be implemented in Phase 3
        // For now, return empty logs structure
        return {
            console: [],
            network: [],
            errors: []
        };
    } catch (error) {
        console.error('Error capturing browser logs:', error);
        return null;
    }
}

// Client-side screenshot cropping
async function cropScreenshotClientSide(dataUrl, selectionRect, viewport) {
    return new Promise((resolve, reject) => {
        try {
            console.log('Client-side cropping with selection:', selectionRect);
            console.log('Viewport info:', viewport);
            
            const img = new Image();
            img.onload = () => {
                try {
                    console.log('Original image dimensions:', img.naturalWidth, 'x', img.naturalHeight);
                    
                    // Use device pixel ratio from viewport
                    const devicePixelRatio = viewport.devicePixelRatio || 1;
                    console.log('Device pixel ratio:', devicePixelRatio);
                    
                    // Scale coordinates by device pixel ratio
                    const scaledLeft = selectionRect.left * devicePixelRatio;
                    const scaledTop = selectionRect.top * devicePixelRatio;
                    const scaledWidth = selectionRect.width * devicePixelRatio;
                    const scaledHeight = selectionRect.height * devicePixelRatio;
                    
                    console.log('Scaled coordinates:', {
                        left: scaledLeft,
                        top: scaledTop,
                        width: scaledWidth,
                        height: scaledHeight
                    });
                    
                    // Create canvas for cropping
                    const canvas = document.createElement('canvas');
                    canvas.width = selectionRect.width;
                    canvas.height = selectionRect.height;
                    const ctx = canvas.getContext('2d');
                    
                    // Draw cropped portion
                    ctx.drawImage(
                        img,
                        scaledLeft,
                        scaledTop,
                        scaledWidth,
                        scaledHeight,
                        0,
                        0,
                        selectionRect.width,
                        selectionRect.height
                    );
                    
                    // Convert to data URL
                    const croppedDataUrl = canvas.toDataURL('image/png');
                    console.log('Successfully cropped screenshot on client side');
                    resolve(croppedDataUrl);
                    
                } catch (error) {
                    console.error('Error in client-side crop operation:', error);
                    reject(new Error('Failed to crop image: ' + error.message));
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image for cropping'));
            img.src = dataUrl;
            
        } catch (error) {
            console.error('Error setting up client-side crop operation:', error);
            reject(new Error('Failed to create canvas for cropping: ' + error.message));
        }
    });
}

// Export functions for potential use by annotation system
window.ScreenshotReview = {
    screenshotData,
    saveScreenshot,
    closeReview,
    showNotification,
    cropScreenshotClientSide
};