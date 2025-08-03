// Browser logs capture using content script injection
// This approach doesn't require debugger API and is less intrusive

function captureBrowserLogsFromPage() {
    const logs = {
        console: [],
        network: [],
        errors: []
    };

    // Get console logs from the page (if we've been injecting a logger)
    if (window.__vizualai_console_logs) {
        logs.console = window.__vizualai_console_logs.slice(-50); // Last 50 logs
    }

    // Get network errors from performance API
    const perfEntries = performance.getEntriesByType('resource');
    perfEntries.forEach(entry => {
        // Check for failed requests (status 0 usually means failed)
        if (entry.responseStatus === 0 || entry.responseStatus >= 400) {
            logs.network.push({
                url: entry.name,
                method: 'GET',
                status: entry.responseStatus || 0,
                timestamp: new Date(performance.timeOrigin + entry.startTime).toISOString()
            });
        }
    });

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
            // Call original method
            originalConsole[method].apply(console, args);
            
            // Store log entry
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
        };
    });

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