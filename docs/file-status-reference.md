# BrowserTools MCP - File Status Reference

## Chrome Extension File Status

### ✅ ACTIVE FILES (Essential for operation)

| File                                | Purpose                           | Lines | Notes                         |
| ----------------------------------- | --------------------------------- | ----- | ----------------------------- |
| **Core Components**                 |
| manifest.json                       | Extension configuration           | 48    | Manifest V3, no popup defined |
| background.js                       | Service worker, main orchestrator | 1731  | Handles all Chrome APIs       |
| content-script.js                   | In-page UI and interactions       | 1467  | Primary user interface        |
| content-recording.js                | Recording functionality           | 433   | MediaRecorder management      |
| **DevTools Integration**            |
| devtools.html                       | DevTools page entry               | 12    | Simple loader                 |
| devtools.js                         | DevTools panel logic              | 1171  | Log capture, monitoring       |
| panel.html                          | DevTools panel UI                 | 398   | Settings and controls         |
| panel.js                            | Panel functionality               | 1206  | Recording, screenshots        |
| **Recording Features**              |
| recording-bar.js                    | Floating recording controls       | 609   | Cross-tab controls            |
| laser-pointer.js                    | Annotation system                 | 218   | Drawing during recording      |
| **Screenshot System**               |
| screenshot-review.html              | Review interface                  | 97    | Screenshot management         |
| screenshot-review.css               | Review styling                    | 447   |                               |
| screenshot-review.js                | Review functionality              | 497   | Preview, resize, copy         |
| **Utilities**                       |
| cursor-selection.js                 | Element selection                 | 501   | DOM interaction               |
| browser-logs-capture.js             | Log interception                  | 151   | Console/network capture       |
| **Styling (Used by overlay)**       |
| glass-components.css                | Glass UI components               | 327   | Modern UI system              |
| glass-performance.css               | Performance styles                | 159   |                               |
| glass-accessibility.css             | Accessibility styles              | 222   |                               |
| **Assets**                          |
| icon.svg                            | Extension icon                    | 31    |                               |
| VizualAI_variantA_tighter_clean.svg | Logo in overlay                   | 53    | Primary branding              |

### 📁 CLEANED UP FILES

**Deprecated files have been moved to:**

- `chrome-extension/old_files_ignore/` - Contains all deprecated popup implementations, experimental files, and unused assets

**Previously deprecated files (now moved):**

- Old popup system (popup.html, popup.js, popup_backup.html, popup-redesign.\*)
- Experimental recording approach (alternative-recording.js)
- Unused logo variants (5 files)

### 📋 Quick Decision Guide

**Q: Where to add new UI elements?**

- A: Use `content-script.js` for in-page overlay UI, or `panel.js` for DevTools panel

**Q: Where to handle Chrome API calls?**

- A: Always in `background.js` (service worker)

**Q: Which popup file to modify?**

- A: None! The extension doesn't use popups. Use the overlay UI instead.

**Q: Where to add new styles?**

- A: Use the glass-\*.css system or add to relevant component CSS

**Q: How to add a new MCP tool?**

- A: Start in `mcp-server.ts`, then `browser-connector.ts`, then `background.js`

### ✅ Cleanup Complete

**Files organized:**

- Active files: 20 files (down from 32)
- Deprecated files: 12 files moved to `old_files_ignore/`
- Total lines cleaned up: ~3,500 lines

**Current structure:**

- `chrome-extension/` - Contains only active, essential files
- `chrome-extension/old_files_ignore/` - Contains deprecated files for reference

**To permanently remove deprecated files:**

```bash
cd chrome-extension
rm -rf old_files_ignore/
```
