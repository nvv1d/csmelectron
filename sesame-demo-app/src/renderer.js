// Renderer process script
document.addEventListener('DOMContentLoaded', () => {
    const webview = document.querySelector('webview');
    
    if (webview) {
        // Comprehensive error handling
        webview.addEventListener('did-fail-load', (event) => {
            console.error('Webview failed to load:', event);
            
            // Create an error display
            const errorContainer = document.createElement('div');
            errorContainer.innerHTML = `
                <div style="color: red; text-align: center; padding: 20px; font-family: Arial, sans-serif;">
                    <h1>Page Load Error</h1>
                    <p>Unable to load the Sesame Research demo page.</p>
                    <p>Please check your internet connection or contact support.</p>
                </div>
            `;
            errorContainer.style.position = 'absolute';
            errorContainer.style.top = '0';
            errorContainer.style.left = '0';
            errorContainer.style.width = '100%';
            errorContainer.style.height = '100%';
            errorContainer.style.backgroundColor = 'white';
            errorContainer.style.zIndex = '1000';
            
            document.body.appendChild(errorContainer);
        });

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

        // Logging and debugging
        webview.addEventListener('dom-ready', () => {
            console.log('Webview DOM is ready');
            
            // Attempt to focus on the demo section
            webview.executeJavaScript(`
                const demoSection = document.getElementById('demo');
                if (demoSection) {
                    demoSection.scrollIntoView({block: 'start', inline: 'nearest'});
                    demoSection.focus();
                } else {
                    console.error('Demo section not found');
                }
            `);
        });

        // Prevent unwanted zooming
        webview.addEventListener('page-scale-changed', (event) => {
            if (event.newScale !== 1.0) {
                webview.setZoomFactor(1.0);
            }
        });

        // Network error handling
        webview.addEventListener('did-start-loading', () => {
            console.log('Started loading...');
        });

        webview.addEventListener('did-stop-loading', () => {
            console.log('Finished loading');
        });
    }
});