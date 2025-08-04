# Deprecated Files

This directory contains deprecated files from the BrowserTools MCP Chrome extension that are no longer used in the current implementation.

## Files Moved Here

### Old Popup System

- `popup.html` - Original popup UI (extension now uses overlay instead)
- `popup.js` - Original popup logic
- `popup_backup.html` - Even older popup backup
- `popup-redesign.html` - Attempted glass UI redesign
- `popup-redesign.js` - Redesign logic
- `popup-redesign.css` - Redesign styles

### Experimental

- `alternative-recording.js` - Alternative recording approach (experimental, never used)

### Unused Assets

- `VizualAI_variantA_tighter_clean.png` - PNG version of logo (SVG used instead)
- `VizualAI_variantA_tighter_clean_2.svg` - Logo variant
- `VizualAI_variantA_tighter_cropped.svg` - Cropped logo variant
- `VizualAI_variantA_tighter_clean copy.svg` - Duplicate logo file
- `VizAI_tight_no_whitespace.svg` - Alternative logo design

## Why These Files Are Deprecated

The extension architecture evolved from a traditional popup-based approach to an overlay-based UI system:

1. **No Popup**: The manifest.json doesn't define a `default_popup` - instead, clicking the extension icon triggers an overlay
2. **Overlay UI**: The main UI is now a floating overlay created by `content-script.js`
3. **Better UX**: The overlay approach allows interaction with the page while the UI is visible
4. **Glass UI**: The visual design moved to a glass/modern theme using separate CSS files

## Current Active Files

See the main `chrome-extension/` directory for active files. The current UI is implemented in:

- `content-script.js` - Main overlay UI
- `glass-*.css` - Modern styling
- `background.js` - Chrome API handling

## Safe to Delete

These files can be safely deleted if needed. They're kept here for reference only.
