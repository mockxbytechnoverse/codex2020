// Browser logs capture using content script injection
// This approach doesn't require debugger API and is less intrusive

function captureBrowserLogsFromPage() {
    const logs = {
        console: [],
        network: [],
        errors: []
    };

    console.log('VizualAI: captureBrowserLogsFromPage called');
    console.log('VizualAI: __vizualai_console_logs length:', window.__vizualai_console_logs ? window.__vizualai_console_logs.length : 'undefined');

    // Get console logs from the page (if we've been injecting a logger)
    if (window.__vizualai_console_logs) {
        logs.console = window.__vizualai_console_logs.slice(-50); // Last 50 logs
        console.log('VizualAI: Captured', logs.console.length, 'console logs');
    } else {
        console.log('VizualAI: No __vizualai_console_logs found');
    }

    // Get network errors from performance API
    const perfEntries = performance.getEntriesByType('resource');
    console.log('VizualAI: Found', perfEntries.length, 'resource entries');
    
    let networkCount = 0;
    perfEntries.forEach((entry, index) => {
        // Log first few entries for debugging
        if (index < 3) {
            console.log('VizualAI: Sample entry', index, {
                name: entry.name.substring(0, 80) + '...',
                transferSize: entry.transferSize,
                responseStatus: entry.responseStatus,
                duration: entry.duration
            });
        }
        
        // Check for various types of network issues:
        // 1. transferSize === 0 (blocked or failed)
        // 2. responseStatus >= 400 (HTTP errors)
        // 3. duration === 0 and transferSize === 0 (completely failed)
        const isFailed = entry.transferSize === 0 || 
                        entry.responseStatus >= 400 ||
                        (entry.duration === 0 && entry.transferSize === 0);
        
        // Also capture resources that might be slow or problematic
        const isSlow = entry.duration > 5000; // Slower than 5 seconds
        
        if ((isFailed || isSlow) && !entry.name.startsWith('chrome-extension://')) {
            logs.network.push({
                url: entry.name,
                method: 'GET',
                status: entry.responseStatus || 0,
                transferSize: entry.transferSize,
                duration: Math.round(entry.duration),
                type: isFailed ? 'failed' : 'slow',
                timestamp: new Date(performance.timeOrigin + entry.startTime).toISOString()
            });
            networkCount++;
        }
    });
    
    console.log('VizualAI: Captured', networkCount, 'network issues (failed/slow requests)');

    // Get JavaScript errors from window error events (if we've been capturing them)
    if (window.__vizualai_errors) {
        logs.errors = window.__vizualai_errors.slice(-20); // Last 20 errors
    }

    return logs;
}

// Inject console and error interceptors when content script loads
(function() {
    // Only inject once
    if (window.__vizualai_logs_injected) return;
    window.__vizualai_logs_injected = true;

    console.log('VizualAI: Browser logs capture script loaded and initializing...');

    // Intercept console methods
    window.__vizualai_console_logs = [];
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info
    };

    ['log', 'error', 'warn', 'info'].forEach(method => {
        console[method] = function(...args) {
            // Store log entry BEFORE calling original (in case original throws)
            try {
                window.__vizualai_console_logs.push({
                    level: method,
                    message: args.map(arg => {
                        try {
                            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
                        } catch (e) {
                            return '[Object]';
                        }
                    }).join(' '),
                    timestamp: new Date().toISOString(),
                    source: 'console'
                });

                // Keep only last 100 logs
                if (window.__vizualai_console_logs.length > 100) {
                    window.__vizualai_console_logs = window.__vizualai_console_logs.slice(-100);
                }
            } catch (e) {
                // Ignore errors in log capture
            }
            
            // Call original method
            originalConsole[method].apply(console, args);
        };
    });

    // Add a test log to verify interception works
    console.log('VizualAI: Console interception is active - this message should be captured');

    // Intercept window errors
    window.__vizualai_errors = [];
    window.addEventListener('error', (event) => {
        window.__vizualai_errors.push({
            message: event.message,
            stack: event.error ? event.error.stack : `at ${event.filename}:${event.lineno}:${event.colno}`,
            timestamp: new Date().toISOString()
        });

        // Keep only last 50 errors
        if (window.__vizualai_errors.length > 50) {
            window.__vizualai_errors = window.__vizualai_errors.slice(-50);
        }
    });

    // Intercept unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        window.__vizualai_errors.push({
            message: `Unhandled Promise Rejection: ${event.reason}`,
            stack: event.reason && event.reason.stack ? event.reason.stack : '',
            timestamp: new Date().toISOString()
        });

        // Keep only last 50 errors
        if (window.__vizualai_errors.length > 50) {
            window.__vizualai_errors = window.__vizualai_errors.slice(-50);
        }
    });
})();