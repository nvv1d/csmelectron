// Renderer process script
document.addEventListener('DOMContentLoaded', () => {
    const webview = document.querySelector('webview');
    
    if (webview) {
        // Prevent navigation away from the demo section
        webview.addEventListener('will-navigate', (event) => {
            const url = new URL(event.url);
            if (!url.hash.includes('demo')) {
                event.preventDefault();
            }
        });

        // Disable right-click context menu
        webview.addEventListener('context-menu', (event) => {
            event.preventDefault();
        });

        // Log important events for debugging
        webview.addEventListener('dom-ready', () => {
            console.log('Webview DOM is ready');
            
            // Attempt to focus on the demo section
            webview.executeJavaScript(`
                const demoSection = document.getElementById('demo');
                if (demoSection) {
                    demoSection.scrollIntoView();
                    demoSection.focus();
                }
            `);
        });

        // Prevent zooming
        webview.addEventListener('page-scale-changed', (event) => {
            if (event.newScale !== 1.0) {
                webview.setZoomFactor(1.0);
            }
        });
    }
});