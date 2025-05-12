
// preload.js - Enhanced Scroll Disabling and Security for External Content

console.log('[Preload] Script loaded.');

// Function to disable context menu (right-click)
function disableContextMenu() {
  console.log('[Preload] Disabling context menu...');
  window.addEventListener('contextmenu', e => {
    e.preventDefault();
    return false;
  }, { capture: true });
  
  // Also prevent the default context menu on all elements
  document.addEventListener('contextmenu', e => {
    e.preventDefault();
    return false;
  }, { capture: true });
}

// Function to block dev tools keyboard shortcuts
function blockDevToolsShortcuts() {
  console.log('[Preload] Blocking dev tools keyboard shortcuts...');
  
  window.addEventListener('keydown', e => {
    // Block common dev tools shortcuts
    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, F12, Ctrl+Shift+U
    if (
      // Dev tools
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || 
                                  e.key === 'J' || e.key === 'j' || 
                                  e.key === 'C' || e.key === 'c' ||
                                  e.key === 'U' || e.key === 'u')) ||
      // F12 key
      e.key === 'F12' ||
      // Prevent view source (Ctrl+U)
      (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
      // Prevent save as (Ctrl+S)
      (e.ctrlKey && (e.key === 'S' || e.key === 's')) ||
      // Prevent print or print preview (Ctrl+P)
      (e.ctrlKey && (e.key === 'P' || e.key === 'p'))
    ) {
      console.log(`[Preload] Blocked keyboard shortcut: ${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`);
      e.preventDefault();
      return false;
    }
  }, { capture: true });
}

// Function to disable text selection
function disableTextSelection() {
  console.log('[Preload] Disabling text selection...');
  try {
    const style = document.createElement('style');
    style.textContent = `
      /* Disable text selection everywhere */
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      
      /* Prevent highlighting on click */
      *::selection {
        background: transparent !important;
      }
      *::-moz-selection {
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);
    
    // Additional JavaScript protection
    document.addEventListener('selectstart', e => {
      e.preventDefault();
      return false;
    }, { passive: false, capture: true });
    
    console.log('[Preload] Text selection disabled via CSS and event handlers');
  } catch (error) {
    console.error('[Preload] Error disabling text selection:', error);
  }
}

// Function to disable scrolling
function disableScrolling() {
  console.log('[Preload] Applying scroll disabling...');

  // CSS Injection
  try {
    const style = document.createElement('style');
    style.textContent = `
      /* Prevent scrolling and hide scrollbars on the main viewport */
      html, body {
        overflow: hidden !important; 
        height: 100% !important;     
        position: relative !important;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
        overscroll-behavior: none !important;
      }

      /* Hide scrollbars for Webkit browsers */
      html::-webkit-scrollbar,
      body::-webkit-scrollbar {
        display: none !important;
      }

      /* Target all scrollable elements */
      ::-webkit-scrollbar {
        width: 0px !important;
        height: 0px !important;
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);
    console.log('[Preload] CSS for scroll disabling injected into <head>.');
  } catch (error) {
    console.error('[Preload] Error injecting CSS:', error);
  }

  // Event Prevention
  const scrollEvents = ['wheel', 'mousewheel', 'DOMMouseScroll', 'touchmove'];
  const blockScroll = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  scrollEvents.forEach(event => {
    window.addEventListener(event, blockScroll, { passive: false, capture: true });
    document.addEventListener(event, blockScroll, { passive: false, capture: true });
  });

  // Keyboard Prevention
  const keydownHandler = (e) => {
    const scrollKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'PageUp', 'PageDown', 'Home', 'End', ' '
    ];
    if (scrollKeys.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };
  
  window.addEventListener('keydown', keydownHandler, { passive: false, capture: true });
  document.addEventListener('keydown', keydownHandler, { passive: false, capture: true });
  
  // Prevent scroll through the body's scroll property
  Object.defineProperty(document.body, 'scroll', {
    value: function() { return false; },
    writable: false
  });
  
  // Override scrollTo/scrollBy methods
  const noop = () => {};
  window.scrollTo = noop;
  window.scrollBy = noop;
  Element.prototype.scrollTo = noop;
  Element.prototype.scrollBy = noop;
  
  console.log('[Preload] Scroll disabling applied to window and document.');
}

// Apply all security measures on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  console.log('[Preload] DOMContentLoaded event fired.');
  disableScrolling();
  disableContextMenu();
  blockDevToolsShortcuts();
  disableTextSelection();
});

// Also apply all security measures after load event
window.addEventListener('load', () => {
  console.log('[Preload] Window load event fired.');
  disableScrolling();
  disableContextMenu();
  blockDevToolsShortcuts();
  disableTextSelection();
  
  // Apply again after a short delay to catch any dynamically loaded content
  setTimeout(() => {
    disableScrolling();
    disableContextMenu();
    blockDevToolsShortcuts();
    disableTextSelection();
  }, 1000);
  
  setTimeout(() => {
    disableScrolling();
    disableContextMenu();
    blockDevToolsShortcuts();
    disableTextSelection();
  }, 3000);
});

// Apply periodically to handle dynamic content changes
setInterval(() => {
  disableScrolling();
  disableTextSelection();
}, 5000);

// Monitor for mutations that might affect scrolling
try {
  const observer = new MutationObserver((mutations) => {
    console.log('[Preload] DOM mutations detected, reapplying protections...');
    disableScrolling();
    disableTextSelection();
  });
  
  // Start observing once the DOM is ready
  window.addEventListener('load', () => {
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true
    });
  });
} catch (error) {
  console.error('[Preload] Error setting up MutationObserver:', error);
}
